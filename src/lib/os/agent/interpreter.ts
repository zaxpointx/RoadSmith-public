/**
 * Built-in interpreter: the conversation engine used when no Claude API key
 * is configured. It understands the common driving-school requests with
 * deterministic parsing and multi-turn state, calls the same permission-checked
 * tools as the Claude agent, and hands anything it doesn't understand to the
 * owner instead of guessing. It is deliberately narrower than the model.
 */
import { many } from '../db.ts'
import { now } from '../clock.ts'
import { addDays, localDate } from '../time.ts'
import { fmtMoney } from '../time.ts'
import type { Service } from '../scheduling.ts'
import { runTool, type AgentCtx, type ToolResult } from './tools.ts'

type R = Record<string, unknown>
const WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// ── Parsing helpers ────────────────────────────────────────────────────────

export function parseDob(text: string): string | null {
  let m = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(text)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/.exec(text)
  if (m) {
    let y = +m[3]
    if (y < 100) y += y > 30 ? 1900 : 2000
    return iso(y, +m[1], +m[2])
  }
  m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i.exec(text)
  if (m) return iso(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2])
  return null
}

function iso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const FILLER = new Set(['her', 'his', 'their', 'name', 'is', "it's", 'its', 'my', 'son', 'daughter', 'kid', 'child', 'for', 'the', 'student', 'i', "i'm", 'im', 'am', 'and', 'born', 'dob', 'birthday', 'on', 'he', 'she', 'named', 'called', 'this', 'me', 'parent', 'mom', 'dad', 'hi', 'hello', 'hey', 'yes', 'sure', 'ok', 'okay', 'thanks'])

export function parseName(text: string): { first: string; last: string } | null {
  const cleaned = text.replace(/\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g, ' ').replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}/gi, ' ')
  const words = cleaned.split(/[\s,;.!?]+/).filter((w) => /^[A-Za-z][A-Za-z'-]{0,30}$/.test(w) && !FILLER.has(w.toLowerCase()))
  if (words.length < 2) return null
  const cap = (w: string) => w[0].toUpperCase() + w.slice(1)
  return { first: cap(words[0]), last: cap(words[1]) }
}

export function parseRelationship(t: string): 'parent' | 'self' | null {
  if (/\b(my (son|daughter|kid|child|teen|boy|girl|stepson|stepdaughter|grandson|granddaughter)|i'?m (his|her|their) (mom|dad|parent|mother|father|guardian)|i am (his|her|their)|(?:^|\s)(parent|mom|dad|mother|father|guardian)\b|for (him|her|them))\b/i.test(t)) return 'parent'
  if (/\b(for me|for myself|myself|i'?m the student|i am the student|i want to learn|i need (lessons|a lesson)|it'?s me|me\b)/i.test(t)) return 'self'
  return null
}

export function parseAddress(t: string): string | null {
  const m = /\b\d{1,6}\s+[A-Za-z0-9 .'-]{2,60}?(?:,\s*[A-Za-z .'-]{2,40})*(?:,?\s*[A-Z]{2})?,?\s*\d{5}\b/.exec(t)
  if (m) return m[0].trim()
  const s = /\b\d{1,6}\s+[A-Za-z0-9 .'-]+\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|pike|way|ct|court|pkwy|hwy)\b[^\n]*/i.exec(t)
  return s ? s[0].trim().replace(/[.!]$/, '') : null
}

export function parsePermit(t: string): string | null {
  // A permit number always contains digits, so filler words ("number", "is") are never captured.
  const m = /permit(?:\s*(?:#|number|no\.?|num|is|:|-))*\s*([A-Z]{0,3}\d[A-Z0-9-]{4,19})\b/i.exec(t) ?? /\b([A-Z]{1,3}\d{6,10}|\d{7,10})\b/.exec(t)
  return m ? m[1].toUpperCase() : null
}

export function parsePrefs(a: AgentCtx, t: string): R {
  const lower = t.toLowerCase()
  const out: R = {}
  if (/\bmorning|\bam\b|before noon/.test(lower)) out.time_of_day = 'morning'
  else if (/afternoon|after school|after lunch/.test(lower)) out.time_of_day = 'afternoon'
  else if (/evening|after work|night/.test(lower)) out.time_of_day = 'evening'
  const days = WD.filter((d) => lower.includes(d) || lower.includes(d.slice(0, 3) + ' ') || lower.endsWith(d.slice(0, 3)))
  if (/weekend/.test(lower)) days.push('saturday')
  if (days.length) out.weekdays = [...new Set(days)]
  const today = localDate(now(), a.school.timezone)
  const specific = specificDate(lower, today)
  if (specific) { out.earliest_date = specific; out.latest_date = specific; delete out.weekdays; return out }
  if (/\btomorrow\b/.test(lower)) { out.earliest_date = addDays(today, 1); out.latest_date = addDays(today, 1) }
  else if (/\btoday\b/.test(lower)) { out.earliest_date = today; out.latest_date = today }
  else if (/next week/.test(lower)) { out.earliest_date = addDays(today, 7 - new Date(today + 'T12:00:00Z').getUTCDay() + 1) }
  else if (/this week/.test(lower)) { out.latest_date = addDays(today, 6 - new Date(today + 'T12:00:00Z').getUTCDay()) }
  return out
}

/** "Dec 9", "december 9th", "12/9" → the next such date on or after today. */
export function specificDate(lower: string, today: string): string | null {
  let mo = 0, d = 0
  const m1 = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*,?\s*\d{4})/.exec(lower)
  const m2 = /\b(\d{1,2})\/(\d{1,2})\b(?!\/)/.exec(lower)
  if (m1) { mo = MONTHS.indexOf(m1[1].slice(0, 3)) + 1; d = Number(m1[2]) } else if (m2) { mo = Number(m2[1]); d = Number(m2[2]) }
  if (!mo || mo > 12 || d < 1 || d > 31) return null
  const y = Number(today.slice(0, 4))
  const candidate = iso(y, mo, d)
  if (!candidate) return null
  return candidate >= today ? candidate : iso(y + 1, mo, d)
}

function serviceFromText(t: string): string {
  return /\b90\b|hour and a half|1\.5|road ?test|highway|long(er)? lesson/i.test(t) ? 'LESSON90' : 'LESSON60'
}

const YES = /^(y|yes|yeah|yep|yup|sure|ok|okay|confirm|do it|please do|correct|sounds good|that works)\b/i
const NO = /^(n|no|nope|nah|don'?t|never ?mind|stop)\b/i

function pickLetter(t: string, count: number): number {
  const s = t.trim().toUpperCase()
  let m = /^(?:OPTION\s*)?([A-H])\b/.exec(s)
  if (m) { const i = m[1].charCodeAt(0) - 65; return i < count ? i : -1 }
  m = /^#?(\d)\b/.exec(s)
  if (m) { const i = Number(m[1]) - 1; return i >= 0 && i < count ? i : -1 }
  if (/\b(first|1st)\b/i.test(t)) return 0
  if (/\b(second|2nd)\b/i.test(t)) return count > 1 ? 1 : -1
  if (/\b(third|3rd)\b/i.test(t)) return count > 2 ? 2 : -1
  return -1
}

// ── Small helpers ──────────────────────────────────────────────────────────

function err(r: ToolResult): string {
  return r.ok ? '' : String((r as { error: string }).error)
}

async function tool(a: AgentCtx, name: string, input: R = {}): Promise<R> {
  return (await runTool(a, name, input)) as R
}

function setPending(a: AgentCtx, intent: string, data: R) {
  a.state.pending = { intent, data }
}

function clearPending(a: AgentCtx) {
  a.state.pending = undefined
}

type StudentView = { student_id: string; name: string; age: number | null; missing_for_lessons: string[] }

function matchStudent(list: StudentView[], t: string): StudentView | undefined {
  const lower = t.toLowerCase()
  return list.find((s) => lower.includes(s.name.split(' ')[0].toLowerCase())) ?? (list.length === 1 ? list[0] : undefined)
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'does', 'you', 'your', 'i', 'my', 'we', 'to', 'of', 'for', 'and', 'or', 'what', 'how', 'can', 'in', 'on', 'it', 'be', 'need', 'have', 'there', 'with', 'any', 'me', 'at', 'if', 'about', 'should', 'much'])
function words(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w)).map((w) => w.replace(/s$/, ''))
}

function faqAnswer(a: AgentCtx, t: string): string | null {
  const q = new Set(words(t))
  if (!q.size) return null
  let best: { score: number; a: string } | null = null
  for (const f of a.school.playbook.faqs) {
    const score = words(f.q).filter((w) => q.has(w)).length * 2 + words(f.a).filter((w) => q.has(w)).length * 0.5
    if (!best || score > best.score) best = { score, a: f.a }
  }
  return best && best.score >= 2 ? best.a : null
}

async function priceList(a: AgentCtx): Promise<string> {
  const services = await many<Service>(a.q, `select * from rs.services where school_id = $1 and active and price_cents > 0 order by kind desc, price_cents`, [a.school.id])
  return services.map((s) => `${s.name}: ${fmtMoney(s.price_cents, a.school.currency)}${s.deposit_cents ? ` (${fmtMoney(s.deposit_cents, a.school.currency)} deposit)` : ''}`).join('\n')
}

// ── Customer conversation ──────────────────────────────────────────────────

const SENSITIVE = /\b(accident|crash|crashed|collision|fender|bender|hit (a|another|someone)|pulled over|ticket|injur|hurt|emergency|police|ambulance|unsafe|harass|inappropriate|complain|complaint|lawyer|sue|lawsuit|medical|seizure|epilep|disab|diabet|adhd|autism|medication|pregnan|discount|cheaper|deal|coupon|refund|money back|dmv|form|certificate|paperwork|insurance)/i
const URGENT = /\b(accident|crash|crashed|collision|fender|bender|injur|hurt|emergency|police|ambulance|unsafe|harass|inappropriate)/i

export async function customerTurn(a: AgentCtx, text: string): Promise<string> {
  const t = text.trim()
  const lower = t.toLowerCase()
  const p = a.state.pending

  if (p) {
    const handled = await continuePending(a, t)
    if (handled !== null) return handled
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|yo|hiya)[!. ]*$/i.test(t)) {
    const acct = await tool(a, 'my_account')
    const students = (acct.students as StudentView[] | undefined) ?? []
    return students.length
      ? `Hi! How can I help with ${students.map((s) => s.name.split(' ')[0]).join(' or ')} today? I can book or move lessons, check what's coming up, send payment links, or answer questions.`
      : `Hi! I can book driving lessons, sign students up for Driver Education or traffic school, and answer questions about ${a.school.name}. What are you looking for?`
  }
  if (/\b(human|real person|a person|someone|call me|speak (to|with)|talk (to|with)|manager|owner|maya)\b/i.test(lower) && !/\bowner'?s? (car|vehicle)/.test(lower)) {
    await tool(a, 'escalate_to_owner', { summary: 'Asked to talk to a person', details: t })
    return `Of course — I've let the office know and someone will text or call you back${a.school.playbook.office_hours ? ` (office hours: ${a.school.playbook.office_hours.split('.')[0]})` : ''}.`
  }
  if (SENSITIVE.test(lower)) {
    const urgent = URGENT.test(lower)
    await tool(a, 'escalate_to_owner', { summary: urgent ? 'URGENT: safety or incident report' : 'Question that needs the owner', details: t, urgent })
    return urgent
      ? "I'm so sorry — I've alerted the owner right now and they'll contact you as soon as possible. If anyone is hurt or in danger, please call 911."
      : "That's a question the owner should answer personally, so I've passed it to them. They'll get back to you soon."
  }
  if (/\b(cancel)\b/.test(lower) && /\b(lesson|drive|appointment|booking|it|tomorrow|today|session)\b/.test(lower)) return startChange(a, t, 'cancel')
  if (/\b(reschedule|re-schedule|move|change|switch|push|different (time|day))\b/.test(lower) && !/\b(address|permit)\b/.test(lower)) return startChange(a, t, 'reschedule')
  if (/\b(address|permit)\b/.test(lower) && (parseAddress(t) || parsePermit(t))) return updateDetails(a, t)
  if (/\b(pay|payment|link|balance|owe|invoice|bill|receipt)\b/.test(lower)) return payments(a)
  if (/\b(my|our|his|her)\b.*\b(lessons?|bookings?|appointments?|schedule|class|course)\b|\bwhen is\b|\bwhat time\b|\bupcoming\b|\bnext lesson\b|\bam i booked\b|\b(do|did) (we|i) have\b|\b(are|is) (we|i|she|he|they) booked\b|\bwhat('?s| is) booked\b/.test(lower)) return status(a)
  if (/\b(driver'?s? ?ed(ucation)?|course|class(es|room)?|traffic school|defensive driving|enroll|sign (him|her|them|me) up|register)\b/.test(lower)) return startCourse(a, t)
  if (/\b(lessons?|book|schedule|drive|driving|practice|appointment|available|availability|opening|slot|road ?test)\b/.test(lower) && !/\bhow much\b|\bcost\b|\bprice\b/.test(lower)) return startLesson(a, t)
  if (/\b(price|prices|cost|how much|fee|fees|rate|rates|charge)\b/.test(lower)) return `Here's our pricing:\n${await priceList(a)}\nWant me to find a lesson time or a course seat?`
  const faq = faqAnswer(a, t)
  if (faq) return faq
  if (/^(thanks|thank you|thx|ty|great|perfect|awesome|cool|ok|okay|got it)[!. ]*$/i.test(t)) return "You're welcome! Text anytime."
  const misses = Number((a.state as R).misses ?? 0) + 1
  ;(a.state as R).misses = misses
  if (misses >= 2) {
    ;(a.state as R).misses = 0
    await tool(a, 'escalate_to_owner', { summary: "Customer question the assistant couldn't answer", details: t })
    return "I'm not sure I can answer that one, so I've passed it to the office — someone will follow up. Meanwhile I can book lessons, check your schedule or send payment links."
  }
  return "Sorry, I didn't quite get that. I can book lessons, enroll in Driver Ed or traffic school, check upcoming lessons, move or cancel a lesson, or send a payment link. What would you like?"
}

async function continuePending(a: AgentCtx, t: string): Promise<string | null> {
  const p = a.state.pending!
  const d = p.data
  const lower = t.toLowerCase()
  // Let people change topic: an obvious new request abandons the pending flow.
  const newTopic = /\b(cancel|reschedule|price|how much|human|person|pay|balance)\b/i.test(lower) && p.intent !== 'confirm_cancel'
  switch (p.intent) {
    case 'pick_slot': {
      const offered = a.state.offered ?? []
      const i = pickLetter(t, offered.length)
      if (i >= 0) {
        const opt = offered[i].code
        clearPending(a)
        if (d.mode === 'reschedule') return finishReschedule(a, opt)
        return finishBooking(a, opt)
      }
      if (newTopic) { clearPending(a); return null }
      const prefs = parsePrefs(a, t)
      if (Object.keys(prefs).length || /\b(other|different|later|earlier|none|another)\b/.test(lower)) {
        return offerTimes(a, { ...(d.search as R), ...prefs }, d.mode as string)
      }
      return `Reply with a letter (${offered.map((o) => o.code).join(', ')}) to pick a time, or tell me another day or time of day that works better.`
    }
    case 'collect':
      if (newTopic) { clearPending(a); return null }
      return collect(a, t)
    case 'pick_course': {
      const list = d.courses as { course_id: string; course: string }[]
      const i = pickLetter(t, list.length)
      if (i < 0) {
        if (newTopic || /\b(no|none|nevermind)\b/.test(lower)) { clearPending(a); return newTopic ? null : 'No problem. Anything else I can help with?' }
        return `Reply with the number of the course (1–${list.length}).`
      }
      return afterCoursePicked(a, list[i].course_id, list[i].course)
    }
    case 'pick_lesson': {
      const list = d.lessons as { lesson_id: string; student: string; when: string }[]
      const i = pickLetter(t, list.length)
      const byName = list.findIndex((l) => lower.includes(l.student.toLowerCase()))
      const idx = i >= 0 ? i : byName
      if (idx < 0) { if (newTopic) { clearPending(a); return null } return `Which one? Reply 1–${list.length}.` }
      return chosenLesson(a, list[idx], d.mode as string, t)
    }
    case 'confirm_cancel': {
      if (YES.test(t)) {
        clearPending(a)
        const r = await tool(a, 'cancel_lesson', { lesson_id: d.lesson_id, reason: 'requested by text' })
        if (!r.ok) return err(r as ToolResult)
        if (r.status === 'sent to the owner for approval') return `Because it's less than ${a.school.playbook.policies.cancellation_hours} hours away, the owner has to approve this cancellation. Your lesson stays booked until they decide — you'll get a text either way.`
        return `Done — ${d.student}'s lesson on ${r.when} is ${r.status}.${r.refund && r.refund !== 'no payment to refund' ? ` Refund: ${r.refund}.` : ''}`
      }
      if (NO.test(t)) { clearPending(a); return "Okay, I've left it booked." }
      return 'Reply YES to cancel it, or NO to keep it.'
    }
  }
  clearPending(a)
  return null
}

// Registration ---------------------------------------------------------------

async function startCollect(a: AgentCtx, goal: R, intro = ''): Promise<string> {
  setPending(a, 'collect', { ...goal, step: 'relationship' })
  return `${intro}${intro ? ' ' : ''}First, is this for you or for your son/daughter?`
}

async function collect(a: AgentCtx, t: string): Promise<string> {
  const d = { ...(a.state.pending!.data) }
  const lower = t.toLowerCase()
  if (d.step === 'which') {
    const acct = await tool(a, 'my_account')
    const s = matchStudent((acct.students as StudentView[]) ?? [], t)
    if (!s) return 'Which student? Reply with their first name.'
    clearPending(a)
    return enrollPicked(a, String(d.courseId), String(d.courseLabel), s.student_id)
  }
  if (d.step === 'relationship') {
    const rel = parseRelationship(t) ?? (/\b(him|her|son|daughter|kid|teen|child)\b/.test(lower) ? 'parent' : /\b(me|i)\b/.test(lower) ? 'self' : null)
    if (!rel) return "Sorry — is the lesson for you, or are you a parent booking for your teen?"
    d.relationship = rel
    d.step = 'name'
    const name = parseName(t), dob = parseDob(t)
    if (name) { d.first = name.first; d.last = name.last }
    if (dob) d.dob = dob
  } else if (d.step === 'name' || d.step === 'dob') {
    const name = parseName(t), dob = parseDob(t)
    if (name && !d.first) { d.first = name.first; d.last = name.last }
    if (dob) d.dob = dob
    if (!d.first) { setPending(a, 'collect', d); return `What's ${d.relationship === 'parent' ? "the student's" : 'your'} full name and date of birth? (e.g. Emma Carter, 03/14/2010)` }
    if (!d.dob) { d.step = 'dob'; setPending(a, 'collect', d); return `Thanks! And ${d.first}'s date of birth? (MM/DD/YYYY)` }
  } else if (d.step === 'address') {
    const addr = parseAddress(t) ?? (t.length > 8 && /\d/.test(t) ? t : null)
    if (!addr) return 'What address should the instructor pick up from? Please include the ZIP code.'
    const r = await tool(a, 'update_student', { student_id: d.studentId, pickup_address: addr })
    if (!r.ok) return err(r as ToolResult)
  } else if (d.step === 'permit') {
    if (/\b(no|don'?t|not yet|haven'?t)\b/i.test(lower) && !parsePermit(t)) {
      clearPending(a)
      return `No problem — ${d.first ?? 'the student'} needs a learner's permit before driving lessons, but can take the Driver Education classroom course now. Text me the permit number once you have it and I'll find lesson times.`
    }
    const permit = parsePermit(t)
    if (!permit) return "What's the learner's permit number? (It's on the permit card.)"
    const r = await tool(a, 'update_student', { student_id: d.studentId, permit_number: permit })
    if (!r.ok) return err(r as ToolResult)
  } else if (d.step === 'guardian') {
    const phoneMatch = /(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/.exec(t)
    const name = parseName(t.replace(phoneMatch?.[0] ?? '', ' '))
    if (!phoneMatch || !name) return "Please send your parent or guardian's full name and mobile number (e.g. Rosa Rivera 615-555-0123)."
    const r = await tool(a, 'add_guardian', { student_id: d.studentId, guardian_name: `${name.first} ${name.last}`, guardian_phone: phoneMatch[1] })
    if (!r.ok) return err(r as ToolResult)
  }

  // Register once we have relationship, name and DOB.
  if (!d.studentId && d.first && d.dob) {
    const r = await tool(a, 'register_student', { relationship: d.relationship, first_name: d.first, last_name: d.last, date_of_birth: d.dob })
    if (!r.ok) { clearPending(a); return err(r as ToolResult) }
    d.studentId = (r.student as StudentView).student_id
  }
  if (!d.studentId) { setPending(a, 'collect', { ...d, step: 'name' }); return `What's ${d.relationship === 'parent' ? "the student's" : 'your'} full name and date of birth? (e.g. Emma Carter, 03/14/2010)` }

  // What's still missing for the goal?
  const acct = await tool(a, 'my_account')
  const s = (acct.students as StudentView[]).find((x) => x.student_id === d.studentId)!
  const missing = d.goal === 'lesson' ? s.missing_for_lessons : s.missing_for_lessons.filter((m) => m === 'parent or guardian contact')
  if (missing.includes('pickup address')) { setPending(a, 'collect', { ...d, step: 'address' }); return `Got it. What address should we pick ${d.relationship === 'parent' ? s.name.split(' ')[0] : 'you'} up from? Please include the ZIP code.` }
  if (missing.includes("learner's permit number")) { setPending(a, 'collect', { ...d, step: 'permit' }); return `And the learner's permit number? (If ${d.relationship === 'parent' ? 'they' : 'you'} don't have one yet, just say so.)` }
  if (missing.includes('parent or guardian contact')) { setPending(a, 'collect', { ...d, step: 'guardian' }); return "Since you're under 18, we need a parent or guardian on file. What's their full name and mobile number?" }
  if (missing.some((m) => m.startsWith('must be at least'))) { clearPending(a); return `Thanks! It looks like ${s.name.split(' ')[0]} isn't old enough yet (${missing.find((m) => m.startsWith('must'))}). I've saved the details — text us when they're eligible.` }
  clearPending(a)
  if (d.goal === 'course') return enrollPicked(a, String(d.courseId), String(d.courseLabel), d.studentId as string)
  return offerTimes(a, { student_id: d.studentId, service_code: d.service ?? 'LESSON60', ...((d.prefs as R) ?? {}) }, 'book', `Thanks, ${s.name.split(' ')[0]} is all set up!`)
}

// Lessons --------------------------------------------------------------------

async function startLesson(a: AgentCtx, t: string): Promise<string> {
  const acct = await tool(a, 'my_account')
  const students = (acct.students as StudentView[]) ?? []
  const prefs = parsePrefs(a, t)
  const service = serviceFromText(t)
  if (!students.length) return startCollect(a, { goal: 'lesson', service, prefs }, "I'd be glad to help you book a lesson.")
  const s = matchStudent(students, t)
  if (!s) return `Which student is this for — ${students.map((x) => x.name.split(' ')[0]).join(' or ')}?`
  if (s.missing_for_lessons.length) {
    setPending(a, 'collect', { goal: 'lesson', service, prefs, studentId: s.student_id, first: s.name.split(' ')[0], relationship: 'parent', step: 'resume' })
    return collect(a, '')
  }
  return offerTimes(a, { student_id: s.student_id, service_code: service, ...prefs }, 'book')
}

async function offerTimes(a: AgentCtx, search: R, mode: string, intro = ''): Promise<string> {
  const r = await tool(a, 'find_lesson_times', search)
  if (!r.ok) { clearPending(a); return `${intro} ${err(r as ToolResult)}`.trim() }
  const options = r.options as { option: string; when: string }[]
  if (!options.length) {
    setPending(a, 'pick_slot', { search, mode })
    return `${intro} I don't see open times that match. Want me to look at other days or times of day? (e.g. "weekday mornings" or "next week")`.trim()
  }
  setPending(a, 'pick_slot', { search, mode })
  const lines = options.map((o) => `${o.option}) ${o.when}`).join('\n')
  const what = mode === 'reschedule' ? 'Here are open times to move it to' : `Here are the next open times for ${r.student} (${r.lesson})`
  return `${intro ? intro + ' ' : ''}${what}:\n${lines}\nReply with a letter, or tell me a different day/time.`
}

async function finishBooking(a: AgentCtx, option: string): Promise<string> {
  const r = await tool(a, 'book_lesson', { option })
  if (!r.ok) {
    const e = err(r as ToolResult)
    if (/no longer available|just taken|not one of the times/.test(e)) return `Sorry — that time was just taken. ${await offerTimes(a, ((a.state.pending?.data?.search as R) ?? {}), 'book')}`
    return e
  }
  if (r.status === 'sent for approval' || r.status === 'passed to the office') return "I've sent that time to the office to confirm. You'll get a text with the payment link once they approve."
  const pay = r.payment as { amount: string; link: string; hold_expires: string } | null
  if (!pay) return `You're booked: ${r.when}. Pickup at ${r.pickup}.`
  return `Great — I'm holding ${r.when} (pickup at ${r.pickup}). To confirm, pay ${pay.amount} here: ${pay.link}\nThe hold lasts until ${pay.hold_expires}.`
}

// Courses --------------------------------------------------------------------

async function startCourse(a: AgentCtx, t: string): Promise<string> {
  const code = /traffic|defensive/i.test(t) ? 'TRAFFIC' : /driver'?s? ?ed|education/i.test(t) ? 'DRVED' : undefined
  const r = await tool(a, 'list_courses', code ? { service_code: code } : {})
  const courses = (r.courses as { course_id: string; course: string; seats_left: number; price: string; due_now: string }[]) ?? []
  if (!courses.length) {
    await tool(a, 'escalate_to_owner', { summary: 'Asked about a course with no upcoming dates', details: t })
    return "There aren't any upcoming dates for that right now. I've let the office know you're interested — they'll text you when the next one opens."
  }
  setPending(a, 'pick_course', { courses: courses.slice(0, 4) })
  const lines = courses.slice(0, 4).map((c, i) => `${i + 1}) ${c.course} — ${c.seats_left > 0 ? `${c.seats_left} seat${c.seats_left === 1 ? '' : 's'} left` : 'full'}. ${c.price}${c.due_now !== c.price ? ` (${c.due_now} now to hold a seat)` : ''}`)
  return `Upcoming classes:\n${lines.join('\n')}\nReply with a number to grab a seat.`
}

async function afterCoursePicked(a: AgentCtx, courseId: string, label: string): Promise<string> {
  const acct = await tool(a, 'my_account')
  const students = (acct.students as StudentView[]) ?? []
  if (!students.length) return startCollect(a, { goal: 'course', courseId, courseLabel: label }, 'Great choice.')
  if (students.length > 1) {
    setPending(a, 'collect', { goal: 'course', courseId, courseLabel: label, step: 'which' })
    return `Who should I enroll — ${students.map((s) => s.name.split(' ')[0]).join(' or ')}?`
  }
  clearPending(a)
  return enrollPicked(a, courseId, label, students[0].student_id)
}

async function enrollPicked(a: AgentCtx, courseId: string, label: string, studentId: string): Promise<string> {
  const r = await tool(a, 'enroll_in_course', { student_id: studentId, course_id: courseId })
  if (!r.ok) return err(r as ToolResult)
  if (r.status === 'full') {
    const alts = (r.alternatives as { course_id: string; course: string; seats_left: number }[]) ?? []
    if (!alts.length) { await tool(a, 'escalate_to_owner', { summary: 'Course full, no alternatives', details: label }); return "That class just filled up and there isn't another date with room yet. I've told the office you want a seat — they'll reach out." }
    setPending(a, 'pick_course', { courses: alts })
    return `That class is full now. The next one with room:\n${alts.map((c, i) => `${i + 1}) ${c.course} — ${c.seats_left} seats left`).join('\n')}\nReply 1 to take it.`
  }
  if (typeof r.status === 'string' && r.status.includes('already')) return r.status
  if (r.status === 'sent to the office for approval') return "I've sent the enrollment to the office to confirm. You'll get a payment link by text once approved."
  const pay = r.payment as { amount: string; link: string; hold_expires: string } | null
  if (!pay) return `Enrolled! You're confirmed for ${label}.`
  return `Seat held in ${label}. Pay ${pay.amount} here to confirm it: ${pay.link}\nThe seat is held until ${pay.hold_expires}.`
}

// Changes --------------------------------------------------------------------

async function startChange(a: AgentCtx, t: string, mode: 'cancel' | 'reschedule'): Promise<string> {
  const acct = await tool(a, 'my_account')
  const lessons = (acct.upcoming_lessons as { lesson_id: string; student: string; when: string }[]) ?? []
  if (!lessons.length) return "I don't see any upcoming lessons on your account. Want to book one?"
  const lower = t.toLowerCase()
  const prefs = parsePrefs(a, t)
  let pool = lessons.filter((l) => lower.includes(l.student.toLowerCase()))
  if (!pool.length) pool = lessons
  const dated = pool.filter((l) => {
    const d = (l as { date?: string }).date ?? ''
    if (prefs.earliest_date && prefs.latest_date) return d >= String(prefs.earliest_date) && d <= String(prefs.latest_date)
    if (Array.isArray(prefs.weekdays)) return (prefs.weekdays as string[]).includes(WD[new Date(d + 'T12:00:00Z').getUTCDay()])
    return true
  })
  if (dated.length) pool = dated
  if (pool.length === 1) return chosenLesson(a, pool[0], mode, t)
  setPending(a, 'pick_lesson', { lessons: pool, mode })
  return `Which lesson?\n${pool.map((l, i) => `${i + 1}) ${l.student} — ${l.when}`).join('\n')}`
}

async function chosenLesson(a: AgentCtx, l: { lesson_id: string; student: string; when: string }, mode: string, t: string): Promise<string> {
  if (mode === 'cancel') {
    setPending(a, 'confirm_cancel', { lesson_id: l.lesson_id, student: l.student })
    return `Cancel ${l.student}'s lesson on ${l.when}? Reply YES to confirm.`
  }
  clearPending(a)
  return offerTimes(a, { reschedule_lesson_id: l.lesson_id, ...parsePrefs(a, t) }, 'reschedule')
}

async function finishReschedule(a: AgentCtx, option: string): Promise<string> {
  const r = await tool(a, 'reschedule_lesson', { option })
  if (!r.ok) return err(r as ToolResult)
  if (r.status === 'moved') return `Done — the lesson is now ${r.when}. The instructor has been told.`
  return `${r.note ?? "I've sent that change to the owner to approve."} You'll get a text once they decide.`
}

// Account --------------------------------------------------------------------

async function status(a: AgentCtx): Promise<string> {
  const acct = await tool(a, 'my_account')
  const students = (acct.students as StudentView[]) ?? []
  if (!students.length) return "I don't have any students on file for this number yet. Want to book a lesson or sign up for a class?"
  const lessons = (acct.upcoming_lessons as { student: string; when: string; instructor: string; status: string }[]) ?? []
  const courses = (acct.courses as { student: string; course: string; status: string }[]) ?? []
  const parts: string[] = []
  if (lessons.length) parts.push('Upcoming lessons:\n' + lessons.map((l) => `• ${l.student}: ${l.when} with ${l.instructor.split(' ')[0]}${l.status !== 'confirmed' ? ` (${l.status})` : ''}`).join('\n'))
  if (courses.length) parts.push('Classes:\n' + courses.map((c) => `• ${c.student}: ${c.course}${c.status !== 'confirmed' ? ` (${c.status})` : ''}`).join('\n'))
  if (!parts.length) return `No lessons or classes booked for ${students.map((s) => s.name.split(' ')[0]).join(' or ')} right now. Want me to find a time?`
  return parts.join('\n')
}

async function payments(a: AgentCtx): Promise<string> {
  const acct = await tool(a, 'my_account')
  const links = (acct.open_payment_links as { for: string; amount: string; link: string; status: string }[]) ?? []
  const balances = (acct.balances as { student: string; owed: string }[]) ?? []
  const students = (acct.students as StudentView[]) ?? []
  const out: string[] = []
  for (const l of links) out.push(`${l.for}: ${l.amount}${l.status === 'failed' ? ' (last attempt failed)' : ''} — ${l.link}`)
  for (const b of balances) {
    const s = students.find((x) => x.name.startsWith(b.student))
    if (!s) continue
    const r = await tool(a, 'get_payment_link', { balance_for_student_id: s.student_id })
    const pay = r.payment as { amount: string; link: string; for: string } | undefined
    if (pay && !out.some((o) => o.includes(pay.link))) out.push(`${pay.for}: ${pay.amount} — ${pay.link}`)
  }
  return out.length ? `Here's what's due:\n${out.join('\n')}` : "You're all paid up — nothing is due right now."
}

async function updateDetails(a: AgentCtx, t: string): Promise<string> {
  const acct = await tool(a, 'my_account')
  const students = (acct.students as StudentView[]) ?? []
  const s = matchStudent(students, t)
  if (!s) return students.length ? `Which student is this for — ${students.map((x) => x.name.split(' ')[0]).join(' or ')}?` : "I don't have a student on file for this number yet."
  const r = await tool(a, 'update_student', { student_id: s.student_id, pickup_address: parseAddress(t) ?? undefined, permit_number: /permit/i.test(t) ? parsePermit(t) ?? undefined : undefined })
  return r.ok ? `Updated ${s.name.split(' ')[0]}'s details. Thanks!` : err(r as ToolResult)
}

// ── Staff conversation ─────────────────────────────────────────────────────

function parseTimeRange(t: string): { start: string; end: string } | null {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(t)
  if (!m) return null
  const conv = (h: number, mm: string | undefined, ap: string | undefined, fallbackAp?: string) => {
    const a = (ap ?? fallbackAp ?? (h < 7 ? 'pm' : h === 12 ? 'pm' : 'am')).toLowerCase()
    const hh = (h % 12) + (a === 'pm' ? 12 : 0)
    return `${String(hh).padStart(2, '0')}:${mm ?? '00'}`
  }
  return { start: conv(+m[1], m[2], m[3], m[6]), end: conv(+m[4], m[5], m[6]) }
}

function dateWord(t: string): string | undefined {
  const lower = t.toLowerCase()
  if (/\btomorrow\b/.test(lower)) return 'tomorrow'
  if (/\btoday\b|\btonight\b/.test(lower)) return 'today'
  const d = WD.find((w) => lower.includes(w))
  if (d) return d
  const m = /\b(\d{4}-\d{2}-\d{2})\b/.exec(t)
  return m?.[1]
}

function parseMinutes(t: string): number | undefined {
  let m = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/i.exec(t)
  if (m) return Math.round(Number(m[1]) * 60)
  m = /(\d+)\s*(m|min|mins|minutes)\b/i.exec(t)
  if (m) return Number(m[1])
  if (/hour and a half/i.test(t)) return 90
  return undefined
}

export async function staffTurn(a: AgentCtx, text: string): Promise<string> {
  const t = text.trim()
  const lower = t.toLowerCase()
  const isOwner = a.who.audience === 'owner'

  if (isOwner) {
    const decide = /^(approve|decline|reject|resolve|done with|handled)\s*#?(\d+)/i.exec(t) ?? /^#?(\d+)\s*(approve|yes|decline|no)\b/i.exec(t)
    if (decide) {
      const [verb, num] = /^\d/.test(decide[1]) ? [decide[2], decide[1]] : [decide[1], decide[2]]
      const decision = /approve|yes/i.test(verb) ? 'approve' : /decline|reject|no/i.test(verb) ? 'decline' : 'resolve'
      const r = await tool(a, 'decide', { number: Number(num), decision })
      return r.ok ? `${r.item}: ${r.status}.${r.result ? ` ${r.result}` : ''}` : err(r as ToolResult)
    }
    if (/\b(inbox|decision|approv|pending|needs? me|waiting)\b/.test(lower)) {
      const r = await tool(a, 'list_decisions')
      const items = (r.items as { number: number; title: string; can_approve: boolean }[]) ?? []
      if (!items.length) return 'Nothing is waiting on you.'
      return `Waiting on you:\n${items.map((i) => `${i.number}) ${i.title}${i.can_approve ? '' : ' (needs a reply)'}`).join('\n')}\nReply "approve 1", "decline 1" or "handled 1".`
    }
    if (/\b(plan|draft|schedule|book)\b.*\b(drive|drives|btw|behind)\b|\bdrive plan\b/.test(lower)) {
      const r = await tool(a, 'plan_drives')
      if (!r.ok) return err(r as ToolResult)
      if (r.note) return String(r.note)
      const plan = (r.plan as string[]) ?? []
      const unplaced = (r.unplaced as { student: string; reason: string }[]) ?? []
      return `Drafted ${plan.length} drive${plan.length === 1 ? '' : 's'}:\n${plan.join('\n')}${unplaced.length ? `\nCouldn't place: ${unplaced.map((u) => `${u.student} (${u.reason})`).join('; ')}` : ''}\n${r.status === 'booked' ? 'Booked and families texted.' : 'Reply "inbox" then "approve #" to book them and text every family.'}`
    }
    const msg = /^(?:tell|text|message|let)\s+(.+?)(?:'s)?\s+(?:family|mom|dad|parent|parents|mother|father)?\s*(?:know\s+)?(?:that\s+)?[:,-]?\s*(.+)$/i.exec(t)
    if (msg && /^(tell|text|message|let)\b/i.test(t)) {
      const name = msg[1].replace(/'s$/, '').trim()
      const r = await tool(a, 'message_family', { student_name: name, message: msg[2] })
      return r.ok ? `Sent to ${r.sent_to}.` : err(r as ToolResult)
    }
    if (/\b(summary|how('?s| is| are) (it|business|we|things)|numbers|revenue|money|paid|collected|brief|report|doing)\b/.test(lower)) {
      const r = await tool(a, 'business_summary')
      return [
        `Today: ${r.lessons_today} lesson${r.lessons_today === 1 ? '' : 's'} · next 7 days: ${r.lessons_next_7_days}.`,
        `Collected: ${r.collected_today} today, ${r.collected_yesterday} yesterday, ${r.collected_this_month} this month.`,
        `Outstanding: ${r.course_balances_outstanding} in course balances, ${r.unpaid_links_outstanding} in unpaid links.`,
        `Last 30 days: ${r.lessons_completed_30d} lessons done, ${r.no_shows_30d} no-shows, ${r.cancellations_30d} cancellations.`,
        ...(r.courses as string[]),
        Number(r.decisions_waiting) ? `${r.decisions_waiting} decision(s) waiting — reply "inbox".` : 'Nothing waiting on you.',
      ].join('\n')
    }
  }

  if (/\b(no[- ]?show|didn'?t show|did not show|never showed|wasn'?t there)\b/.test(lower)) {
    const r = await tool(a, 'mark_no_show')
    return r.ok ? String(r.note) : err(r as ToolResult)
  }
  if (/\b(late|behind|stuck|traffic|delayed)\b/.test(lower) && !isOwner) {
    const r = await tool(a, 'running_late', { minutes: parseMinutes(t) ?? Number(/(\d+)/.exec(t)?.[1] ?? 10) })
    if (!r.ok) return err(r as ToolResult)
    return r.note ? String(r.note) : `Told the family of ${(r.notified as string[]).join(' and ')} you're running late.`
  }
  if (/^(done|finished|completed|wrapped)\b|\b(done with|finished with|just finished|lesson (is )?(done|over|complete))\b/.test(lower)) {
    const notes = (/(?:notes?:|[-–—]|,)\s*(.+)$/.exec(t)?.[1] ?? '').replace(/^\d+\s*(min|mins|minutes|h|hr|hours)\b,?\s*/i, '').trim()
    const r = await tool(a, 'complete_lesson', { minutes: parseMinutes(t), notes: notes.length > 3 ? notes : undefined })
    return r.ok ? `Marked ${r.student}'s lesson done (${r.minutes} min, ${r.total_driving} total).${r.family_notified ? ' The family got a progress text.' : ''}` : err(r as ToolResult)
  }
  if (/\b(who'?s next|whos next|next (lesson|student|pickup|stop)|where (am i|to|do i) (going|go|next))\b/.test(lower)) {
    const r = await tool(a, 'next_lesson')
    if (r.note) return String(r.note)
    return `Next: ${r.student}, ${r.when}.\nPickup: ${r.pickup}${r.family_phone ? `\nPhone: ${r.family_phone}` : ''}${r.notes ? `\nNote: ${r.notes}` : ''}`
  }
  if (/\b(block|time off|day off|off on|off tomorrow|can'?t work|appointment|unavailable|not available)\b/.test(lower)) {
    const range = parseTimeRange(t)
    const date = dateWord(t)
    if (!range || !date) return 'Which day and times? e.g. "block tomorrow 1-3pm dentist".'
    const r = await tool(a, 'block_time', { date, start_time: range.start, end_time: range.end, reason: t })
    if (!r.ok) return err(r as ToolResult)
    return r.status === 'blocked' ? `Blocked ${r.when}. No lessons will be booked then.` : `Couldn't block it — you have ${r.affected} then. I've asked the owner to rearrange those first.`
  }
  const info = /\b(?:how(?:'s| is)|info (?:on|for)|look ?up|tell me about|notes? (?:on|for))\s+([a-z]+(?:\s+[a-z]+)?)/i.exec(t)
  if (info) {
    const r = await tool(a, 'student_info', { name: info[1] })
    if (!r.ok) return err(r as ToolResult)
    if (r.ambiguous) return `Which one: ${(r.ambiguous as string[]).join(', ')}?`
    const up = (r.upcoming_lessons as { when: string; instructor: string }[]) ?? []
    return [`${r.student}${r.age ? ` (${r.age})` : ''}: ${r.driving_time} behind the wheel.`, r.notes ? `Notes: ${r.notes}` : '', up.length ? `Next: ${up[0].when} with ${up[0].instructor.split(' ')[0]}` : 'No upcoming lessons.', r.balance_owed && r.balance_owed !== '$0' ? `Balance owed: ${r.balance_owed}` : ''].filter(Boolean).join('\n')
  }
  if (/\b(schedule|today|tomorrow|this week|week|lessons|what('?s| is| do i have)|my day|agenda|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(lower)) {
    const days = /\bweek\b/.test(lower) ? 7 : 1
    const r = await tool(a, 'schedule', { date: dateWord(t) ?? 'today', days })
    const sched = (r.schedule as { date: string; text: string }[]) ?? []
    return sched.map((d) => `${new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })}:\n${d.text}`).join('\n\n')
  }
  if (/^(thanks|thank you|thx|ok|okay|got it|cool|great)[!. ]*$/i.test(t)) return '👍'
  const help = isOwner
    ? 'Try: "how are we doing", "inbox", "approve 1", "plan drives", "schedule tomorrow", "how is Emma Carter", or "tell Emma Carter\'s family we\'re closed Friday".'
    : 'Try: "schedule", "tomorrow", "who\'s next", "done 90 min - good merging", "running 15 min late", "no show", or "block tomorrow 1-3pm".'
  if (!isOwner && /\?|help|how|why|can i|could you/.test(lower)) {
    await tool(a, 'escalate_to_owner', { summary: 'Instructor question for the owner', details: t })
    return `I've passed that to the owner. ${help}`
  }
  return `I didn't catch that. ${help}`
}
