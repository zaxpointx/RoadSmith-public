/**
 * The agent's hands. Each tool is a thin, permission-checked wrapper around a
 * deterministic domain function. The model never writes to the database, never
 * computes availability, and never sees another school's data: every tool is
 * bound to the school and the person texting before the model is involved.
 *
 * Safety properties enforced here (not in the prompt):
 *  - Bookings can only use a time the engine offered in this conversation.
 *  - Customers can only see and change their own students' records.
 *  - Instructors can't see payments; only owners decide approvals.
 *  - Actions above the school's autonomy setting become inbox approvals.
 */
import { many, one, type Db } from '../db.ts'
import { now } from '../clock.ts'
import type { Actor } from '../audit.ts'
import {
  addGuardian, balancePayment, cancelLesson, changeWindow, completeLesson, courseLabel, enrollInCourse, getLesson, getService,
  getStudent, holdLesson, lessonBlockers, listCourses, markNoShow, moveLesson, registerStudent, studentAge, studentBalance,
  studentName, studentsForContact, updateStudent, type Student,
} from '../bookings.ts'
import { findSlots, type TimeOfDay } from '../scheduling.ts'
import { createInbox, decideInbox, openInbox } from '../inbox.ts'
import { executeAction } from '../actions.ts'
import { planCohortDrives } from '../cohort.ts'
import { scheduleBetween, scheduleText, snapshot } from '../insights.ts'
import { notifyFamily, type Conversation, type ConversationState, type OfferedSlot } from '../messaging.ts'
import { paymentLink, type Payment } from '../payments.ts'
import { addDays, asDate, asDateStr, fmtMoney, fmtWhen, localDate, minutesLabel, zonedToUtc } from '../time.ts'
import { toPoint } from '../travel.ts'
import { normalizePhone, OsError } from '../util.ts'
import type { AutonomyAction } from '../playbook.ts'
import { schoolPoint, type Ctx } from '../school.ts'

export type Who =
  | { audience: 'customer'; contactId: string; name: string; phone: string }
  | { audience: 'instructor'; staffId: string; name: string; phone: string }
  | { audience: 'owner'; staffId: string; name: string; phone: string }

export interface ToolEvent { tool: string; input: unknown; ok: boolean; summary: string }

export interface AgentCtx extends Ctx {
  db: Db
  conv: Conversation
  who: Who
  state: ConversationState
  events: ToolEvent[]
}

export type ToolResult = { ok: true; [k: string]: unknown } | { ok: false; error: string; [k: string]: unknown }

export interface ToolDef {
  name: string
  description: string
  audiences: Array<Who['audience']>
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  run: (a: AgentCtx, input: Record<string, unknown>) => Promise<ToolResult>
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function actorOf(a: AgentCtx): Actor {
  if (a.who.audience === 'customer') return { type: 'agent', label: 'Roadsmith agent (customer chat)' }
  return { type: 'staff', id: a.who.staffId, label: `${a.who.name} via Roadsmith agent` }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/** Students the customer texting is allowed to act for. */
async function ownStudents(a: AgentCtx): Promise<Student[]> {
  if (a.who.audience !== 'customer') return []
  return studentsForContact(a, a.who.contactId)
}

async function ownStudent(a: AgentCtx, id: unknown): Promise<Student> {
  const sid = str(id)
  const list = await ownStudents(a)
  const s = list.find((x) => x.id === sid) ?? (list.length === 1 && !sid ? list[0] : undefined)
  if (!s) throw new OsError('forbidden', list.length ? 'That student is not linked to this phone number.' : 'No student is registered for this phone number yet.')
  return s
}

async function ownLesson(a: AgentCtx, id: unknown) {
  const lesson = await getLesson(a, String(id ?? ''))
  if (!lesson) throw new OsError('not_found', 'Lesson not found.')
  if (a.who.audience === 'customer') {
    const mine = (await ownStudents(a)).some((s) => s.id === lesson.student_id)
    if (!mine) throw new OsError('forbidden', 'That lesson does not belong to a student linked to this phone number.')
  }
  if (a.who.audience === 'instructor' && lesson.instructor_id !== a.who.staffId) throw new OsError('forbidden', 'That lesson is assigned to another instructor.')
  return lesson
}

function autonomy(a: AgentCtx, action: AutonomyAction) {
  return a.school.playbook.autonomy[action]
}

function parseDateArg(a: AgentCtx, v: unknown): string | undefined {
  const s = str(v)?.toLowerCase()
  if (!s) return undefined
  const today = localDate(now(), a.school.timezone)
  if (s === 'today') return today
  if (s === 'tomorrow') return addDays(today, 1)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const wd = WEEKDAYS.indexOf(s)
  if (wd >= 0) {
    for (let i = 0; i < 8; i++) { const d = addDays(today, i); if (new Date(d + 'T12:00:00Z').getUTCDay() === wd) return d }
  }
  return undefined
}

function slotView(s: OfferedSlot) {
  return { option: s.code, when: s.label }
}

function paymentView(p: Payment) {
  return { payment_id: p.id, for: p.description, amount: fmtMoney(p.amount_cents, p.currency), status: p.status, link: paymentLink(p) }
}

async function studentView(a: AgentCtx, s: Student) {
  const svc = await getService(a, { code: 'LESSON60' })
  return {
    student_id: s.id, name: studentName(s), age: studentAge(a, s),
    has_permit_on_file: Boolean(s.permit_number), pickup_address: s.address,
    driving_time_so_far: minutesLabel(s.driving_minutes),
    missing_for_lessons: svc ? lessonBlockers(a, s, svc) : [],
  }
}

async function lessonList(a: AgentCtx, studentIds: string[]) {
  if (!studentIds.length) return []
  const rows = await many<{ id: string; starts_at: Date; status: string; instructor: string; first_name: string; service: string; pickup_address: string | null }>(a.q,
    `select l.id, l.starts_at, l.status, st.name as instructor, s.first_name, sv.name as service, l.pickup_address
       from rs.lessons l join rs.staff st on st.id = l.instructor_id join rs.students s on s.id = l.student_id join rs.services sv on sv.id = l.service_id
      where l.school_id = $1 and l.student_id = any($2::uuid[]) and l.status in ('held','booked') and l.starts_at > $3 order by l.starts_at`,
    [a.school.id, studentIds, now()])
  return rows.map((r) => ({
    lesson_id: r.id, student: r.first_name, when: fmtWhen(asDate(r.starts_at), a.school.timezone), date: localDate(asDate(r.starts_at), a.school.timezone), instructor: r.instructor, type: r.service,
    status: r.status === 'held' ? 'held — waiting for payment' : 'confirmed', pickup: r.pickup_address,
  }))
}

function offer(a: AgentCtx, slots: OfferedSlot[]) {
  a.state.offered = slots
  a.state.offeredAt = now().toISOString()
}

function takeOffer(a: AgentCtx, option: unknown): OfferedSlot {
  const code = String(option ?? '').trim().toUpperCase().replace(/^OPTION\s*/, '')
  const fresh = a.state.offeredAt && +now() - +new Date(a.state.offeredAt) < 2 * 3600000
  const slot = fresh ? a.state.offered?.find((s) => s.code === code) : undefined
  if (!slot) throw new OsError('stale', 'That option is not one of the times currently offered. Call find_lesson_times again and offer the new times.')
  return slot
}

async function escalate(a: AgentCtx, title: string, detail: string, priority: 'normal' | 'urgent' = 'normal', action?: Parameters<typeof createInbox>[1]['action']) {
  const kind = action ? 'approval' : 'escalation'
  return createInbox(a, { kind, title, detail, priority, conversationId: a.conv.id, action })
}

// ── Customer tools ─────────────────────────────────────────────────────────

const customerTools: ToolDef[] = [
  {
    name: 'my_account',
    description: 'Look up the students linked to the person texting, their upcoming lessons, course enrollments, balances and open payment links. Call this before answering any question about their bookings or payments.',
    audiences: ['customer'],
    input_schema: { type: 'object', properties: {} },
    async run(a) {
      if (a.who.audience !== 'customer') return { ok: false, error: 'not available' }
      const students = await ownStudents(a)
      const ids = students.map((s) => s.id)
      const enrollments = ids.length ? await many<{ title: string; starts_on: string; ends_on: string; schedule_note: string; status: string; first_name: string }>(a.q,
        `select c.title, c.starts_on, c.ends_on, c.schedule_note, e.status, s.first_name from rs.enrollments e join rs.courses c on c.id = e.course_id join rs.students s on s.id = e.student_id
          where e.school_id = $1 and e.student_id = any($2::uuid[]) and e.status <> 'cancelled' order by c.starts_on`, [a.school.id, ids]) : []
      const payments = await many<Payment>(a.q, `select * from rs.payments where school_id = $1 and contact_id = $2 and status in ('pending','failed') order by created_at desc limit 5`, [a.school.id, a.who.contactId])
      const balances = []
      for (const s of students) {
        const b = await studentBalance(a, s.id)
        if (b.owedCents) balances.push({ student: s.first_name, owed: fmtMoney(b.owedCents, a.school.currency), items: b.items.map((i) => i.course) })
      }
      return {
        ok: true,
        students: await Promise.all(students.map((s) => studentView(a, s))),
        upcoming_lessons: await lessonList(a, ids),
        courses: enrollments.map((e) => ({ student: e.first_name, course: courseLabel(e), status: asDateStr(e.ends_on) < localDate(now(), a.school.timezone) ? 'completed' : e.status === 'reserved' ? 'seat held — waiting for payment' : 'confirmed' })),
        open_payment_links: payments.map(paymentView),
        balances,
      }
    },
  },
  {
    name: 'register_student',
    description: "Add a student for the person texting (or link an existing record). Use relationship 'parent' when the texter is the parent/guardian and 'self' when the texter is the student. Ask for anything you don't know; never guess a date of birth.",
    audiences: ['customer'],
    input_schema: {
      type: 'object',
      properties: {
        relationship: { type: 'string', enum: ['parent', 'self'] },
        first_name: { type: 'string' }, last_name: { type: 'string' },
        date_of_birth: { type: 'string', description: 'YYYY-MM-DD' },
        pickup_address: { type: 'string', description: 'Street address with ZIP code, for home pickup' },
        permit_number: { type: 'string' },
      },
      required: ['relationship', 'first_name', 'last_name'],
    },
    async run(a, i) {
      if (a.who.audience !== 'customer') return { ok: false, error: 'not available' }
      const r = await registerStudent(a, {
        contactId: a.who.contactId, relationship: i.relationship === 'self' ? 'self' : 'parent', firstName: String(i.first_name ?? ''), lastName: String(i.last_name ?? ''),
        dob: str(i.date_of_birth) ?? null, address: str(i.pickup_address) ?? null, permitNumber: str(i.permit_number) ?? null, actor: actorOf(a),
      })
      if (r.verifyNeeded) {
        await escalate(a, `Verify student link: ${String(i.first_name)} ${String(i.last_name)}`, `${a.who.name || a.who.phone} asked to link a student who is already on file with a different phone number. Not linked automatically. Confirm with the family before linking.`)
        return { ok: false, error: 'A student with that name and birth date is already on file under a different phone number. For their privacy the office has to confirm before linking — the office has been notified.' }
      }
      return { ok: true, created: r.created, student: await studentView(a, r.student), note: r.note }
    },
  },
  {
    name: 'update_student',
    description: "Update a linked student's pickup address, learner's permit number or date of birth.",
    audiences: ['customer'],
    input_schema: { type: 'object', properties: { student_id: { type: 'string' }, pickup_address: { type: 'string' }, permit_number: { type: 'string' }, date_of_birth: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['student_id'] },
    async run(a, i) {
      const s = await ownStudent(a, i.student_id)
      const out = await updateStudent(a, s.id, { address: str(i.pickup_address), permitNumber: str(i.permit_number), dob: str(i.date_of_birth) }, actorOf(a))
      return { ok: true, student: await studentView(a, out) }
    },
  },
  {
    name: 'add_guardian',
    description: 'Record a parent/guardian for a student under 18 (required before booking for minors who text for themselves).',
    audiences: ['customer'],
    input_schema: { type: 'object', properties: { student_id: { type: 'string' }, guardian_name: { type: 'string' }, guardian_phone: { type: 'string' } }, required: ['student_id', 'guardian_name', 'guardian_phone'] },
    async run(a, i) {
      const s = await ownStudent(a, i.student_id)
      const phone = normalizePhone(String(i.guardian_phone ?? ''))
      if (!phone) return { ok: false, error: 'That phone number does not look valid.' }
      await addGuardian(a, s.id, String(i.guardian_name ?? '').slice(0, 80), phone, actorOf(a))
      return { ok: true, note: `${String(i.guardian_name)} is now the guardian contact and will get booking confirmations and reminders.` }
    },
  },
  {
    name: 'list_courses',
    description: 'Upcoming classroom courses (Driver Education, traffic school) with dates, schedule, seats left, price and deposit.',
    audiences: ['customer', 'instructor', 'owner'],
    input_schema: { type: 'object', properties: { service_code: { type: 'string', description: 'e.g. DRVED or TRAFFIC; omit for all' } } },
    async run(a, i) {
      const courses = (await listCourses(a, { serviceCode: str(i.service_code), upcomingOnly: true })).filter((c) => c.status === 'open')
      return {
        ok: true,
        courses: courses.map((c) => ({
          course_id: c.id, course: courseLabel(c), location: c.location, seats_left: c.seats_left,
          price: fmtMoney(c.price_cents, a.school.currency), due_now: fmtMoney(c.deposit_cents > 0 ? c.deposit_cents : c.price_cents, a.school.currency),
        })),
      }
    },
  },
  {
    name: 'find_lesson_times',
    description: "Find real open times for a driving lesson. Returns lettered options; offer only these, exactly as written. To reschedule, pass reschedule_lesson_id. Never suggest a time this tool didn't return.",
    audiences: ['customer'],
    input_schema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        service_code: { type: 'string', description: 'LESSON60 or LESSON90' },
        earliest_date: { type: 'string', description: "YYYY-MM-DD, 'today', 'tomorrow' or a weekday name" },
        latest_date: { type: 'string', description: 'YYYY-MM-DD' },
        time_of_day: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'any'] },
        weekdays: { type: 'array', items: { type: 'string' }, description: 'e.g. ["saturday"]' },
        reschedule_lesson_id: { type: 'string' },
      },
    },
    async run(a, i) {
      let student: Student
      let serviceCode = str(i.service_code)?.toUpperCase()
      let excludeLessonId: string | undefined
      if (str(i.reschedule_lesson_id)) {
        const l = await ownLesson(a, i.reschedule_lesson_id)
        student = (await getStudent(a, l.student_id))!
        excludeLessonId = l.id
        serviceCode = (await getService(a, { id: l.service_id }))!.code
      } else {
        student = await ownStudent(a, i.student_id)
      }
      const service = await getService(a, { code: serviceCode ?? 'LESSON60' })
      if (!service || service.kind !== 'lesson' || !service.active) return { ok: false, error: `Unknown lesson type ${serviceCode}.` }
      if (service.price_cents === 0 && !excludeLessonId) return { ok: false, error: `${service.name} is scheduled by the school, not booked directly. Offer a private lesson instead, or escalate if they ask about their included drive.` }
      const missing = lessonBlockers(a, student, service)
      if (missing.length) return { ok: false, error: `Before finding times we need: ${missing.join(', ')}.`, missing }
      const weekdays = Array.isArray(i.weekdays) ? i.weekdays.map((w) => WEEKDAYS.indexOf(String(w).toLowerCase())).filter((n) => n >= 0) : undefined
      const pickup = service.pickup ? toPoint(student.lat, student.lng) : schoolPoint(a.school)
      const slots = await findSlots(a, {
        service, pickup, studentId: student.id, from: parseDateArg(a, i.earliest_date), to: parseDateArg(a, i.latest_date),
        timeOfDay: (str(i.time_of_day) as TimeOfDay) ?? 'any', weekdays, excludeLessonId, limit: 4,
      })
      if (!slots.length) return { ok: true, options: [], note: 'No open times match. Suggest widening the days or time of day, or offer to have the office call.' }
      const offered: OfferedSlot[] = slots.map((s, idx) => ({
        code: String.fromCharCode(65 + idx), serviceId: service.id, studentId: student.id, instructorId: s.instructorId,
        start: s.start.toISOString(), label: `${s.label} with ${s.instructorName.split(' ')[0]}`, rescheduleLessonId: excludeLessonId,
      }))
      offer(a, offered)
      return {
        ok: true, student: student.first_name, lesson: `${service.name} — ${fmtMoney(service.price_cents, a.school.currency)}`,
        pickup: service.pickup ? student.address : a.school.address, options: offered.map(slotView),
        note: student.location_quality === 'unknown' ? 'Pickup address could not be mapped; times include extra travel padding.' : undefined,
      }
    },
  },
  {
    name: 'book_lesson',
    description: 'Book one of the lettered options from find_lesson_times. Holds the time and returns a secure payment link; the lesson is confirmed when payment arrives.',
    audiences: ['customer'],
    input_schema: { type: 'object', properties: { option: { type: 'string', description: 'The option letter, e.g. "B"' } }, required: ['option'] },
    async run(a, i) {
      if (a.who.audience !== 'customer') return { ok: false, error: 'not available' }
      const slot = takeOffer(a, i.option)
      if (slot.rescheduleLessonId) return { ok: false, error: 'That option was offered for rescheduling; use reschedule_lesson.' }
      await ownStudent(a, slot.studentId)
      const level = autonomy(a, 'book_lessons')
      if (level !== 'auto') {
        if (level === 'approve') {
          await escalate(a, `Approve booking: ${slot.label}`, `Requested by ${a.who.name || a.who.phone}.`, 'normal',
            { type: 'hold_lesson', args: { studentId: slot.studentId, serviceId: slot.serviceId, instructorId: slot.instructorId, start: slot.start, contactId: a.who.contactId } })
          return { ok: true, status: 'sent for approval', note: 'The office approves bookings personally; tell them they will get a text with a payment link once approved.' }
        }
        await escalate(a, `Booking request: ${slot.label}`, `The school handles bookings personally. Requested by ${a.who.name || a.who.phone}.`)
        return { ok: true, status: 'passed to the office' }
      }
      const weekStart = new Date(+new Date(slot.start) - 3.5 * 86400000), weekEnd = new Date(+new Date(slot.start) + 3.5 * 86400000)
      const weekCount = (await one<{ n: number }>(a.q, `select count(*)::int as n from rs.lessons where student_id = $1 and status in ('held','booked') and starts_at between $2 and $3`, [slot.studentId, weekStart, weekEnd]))!.n
      if (weekCount >= a.school.playbook.policies.max_lessons_per_week) return { ok: false, error: `School policy allows at most ${a.school.playbook.policies.max_lessons_per_week} lessons per week per student.` }
      const { lesson, payment } = await holdLesson(a, { studentId: slot.studentId, serviceId: slot.serviceId, instructorId: slot.instructorId, start: new Date(slot.start), contactId: a.who.contactId, actor: actorOf(a) })
      a.state.offered = []
      return {
        ok: true, lesson_id: lesson.id, when: fmtWhen(asDate(lesson.starts_at), a.school.timezone), pickup: lesson.pickup_address,
        status: payment ? 'held — not confirmed until paid' : 'confirmed',
        payment: payment ? { ...paymentView(payment), hold_expires: fmtWhen(asDate(payment.expires_at!), a.school.timezone) } : null,
      }
    },
  },
  {
    name: 'enroll_in_course',
    description: 'Reserve a seat in a course for a linked student. Returns a payment link (deposit or tuition), or, if the course is full, the next courses with room.',
    audiences: ['customer'],
    input_schema: { type: 'object', properties: { student_id: { type: 'string' }, course_id: { type: 'string' } }, required: ['student_id', 'course_id'] },
    async run(a, i) {
      if (a.who.audience !== 'customer') return { ok: false, error: 'not available' }
      const s = await ownStudent(a, i.student_id)
      const level = autonomy(a, 'enroll_courses')
      if (level !== 'auto') {
        await escalate(a, `Enrollment request for ${s.first_name}`, `Course ${String(i.course_id)}`, 'normal',
          level === 'approve' ? { type: 'enroll_course', args: { studentId: s.id, courseId: String(i.course_id), contactId: a.who.contactId } } : undefined)
        return { ok: true, status: 'sent to the office for approval' }
      }
      const r = await enrollInCourse(a, { studentId: s.id, courseId: String(i.course_id ?? ''), contactId: a.who.contactId, actor: actorOf(a) })
      if (r.status === 'full') {
        return { ok: true, status: 'full', alternatives: (r.alternatives ?? []).map((c) => ({ course_id: c.id, course: courseLabel(c), seats_left: c.seats_left })) }
      }
      if (r.status === 'already') return { ok: true, status: `${s.first_name} is already enrolled in that course.` }
      return {
        ok: true, status: r.status === 'confirmed' ? 'confirmed' : 'seat held — not confirmed until paid',
        payment: r.payment ? { ...paymentView(r.payment), hold_expires: fmtWhen(asDate(r.payment.expires_at!), a.school.timezone) } : null,
      }
    },
  },
  {
    name: 'reschedule_lesson',
    description: "Move a lesson to an option from find_lesson_times (called with reschedule_lesson_id). Changes inside the school's cancellation window need the owner's approval.",
    audiences: ['customer'],
    input_schema: { type: 'object', properties: { option: { type: 'string' } }, required: ['option'] },
    async run(a, i) {
      const slot = takeOffer(a, i.option)
      if (!slot.rescheduleLessonId) return { ok: false, error: 'Those options were for a new booking. Call find_lesson_times with reschedule_lesson_id first.' }
      const lesson = await ownLesson(a, slot.rescheduleLessonId)
      const w = changeWindow(a, lesson)
      const level = w.inside ? autonomy(a, 'late_changes') : autonomy(a, 'reschedule')
      const action = { type: 'move_lesson' as const, args: { lessonId: lesson.id, start: slot.start, instructorId: slot.instructorId } }
      if (level !== 'auto') {
        await escalate(a, `Approve move: lesson on ${fmtWhen(asDate(lesson.starts_at), a.school.timezone)} → ${slot.label}`,
          w.inside ? `Inside the ${a.school.playbook.policies.cancellation_hours}h window (${Math.max(0, Math.round(w.hoursUntil))}h before). Late fee policy: ${fmtMoney(a.school.playbook.policies.late_cancel_fee_cents, a.school.currency)}.` : 'Reschedule request.',
          'normal', level === 'approve' ? action : undefined)
        a.state.offered = []
        return { ok: true, status: 'sent to the owner for approval', note: w.inside ? `This is within ${a.school.playbook.policies.cancellation_hours} hours, so the owner decides (a late fee may apply). The current time stays booked until then.` : undefined }
      }
      const moved = await moveLesson(a, { lessonId: lesson.id, start: new Date(slot.start), instructorId: slot.instructorId, actor: actorOf(a) })
      a.state.offered = []
      return { ok: true, status: 'moved', when: fmtWhen(asDate(moved.starts_at), a.school.timezone) }
    },
  },
  {
    name: 'cancel_lesson',
    description: "Cancel a linked student's lesson. Inside the cancellation window, or when a refund is involved, the owner decides.",
    audiences: ['customer'],
    input_schema: { type: 'object', properties: { lesson_id: { type: 'string' }, reason: { type: 'string' } }, required: ['lesson_id'] },
    async run(a, i) {
      const lesson = await ownLesson(a, i.lesson_id)
      const w = changeWindow(a, lesson)
      const reason = str(i.reason) ?? 'requested by family'
      const when = fmtWhen(asDate(lesson.starts_at), a.school.timezone)
      if (lesson.status === 'held') {
        await cancelLesson(a, { lessonId: lesson.id, reason, actor: actorOf(a) })
        return { ok: true, status: 'cancelled (it was not paid yet, so nothing to refund)', when }
      }
      const level = w.inside ? autonomy(a, 'late_changes') : autonomy(a, 'cancel')
      if (level !== 'auto') {
        await escalate(a, `Approve cancellation: lesson ${when}`, `${reason}. ${w.inside ? `Only ${Math.max(0, Math.round(w.hoursUntil))}h notice (policy ${a.school.playbook.policies.cancellation_hours}h).` : ''} Approving cancels the lesson and refunds the payment.`,
          'normal', level === 'approve' ? { type: 'cancel_lesson', args: { lessonId: lesson.id, reason, refund: true } } : undefined)
        return { ok: true, status: 'sent to the owner for approval', note: 'The lesson stays booked until the owner decides.' }
      }
      const { refundable } = await cancelLesson(a, { lessonId: lesson.id, reason, actor: actorOf(a) })
      let refund = 'no payment to refund'
      if (refundable) {
        if (autonomy(a, 'refunds') === 'auto') refund = await executeAction(a, { type: 'refund_payment', args: { paymentId: refundable.id } }, actorOf(a))
        else {
          await escalate(a, `Refund ${fmtMoney(refundable.amount_cents, refundable.currency)}: cancelled lesson ${when}`, 'Cancelled with enough notice; refund per policy.', 'normal', { type: 'refund_payment', args: { paymentId: refundable.id } })
          refund = 'refund sent to the owner for approval'
        }
      }
      return { ok: true, status: 'cancelled', when, refund }
    },
  },
  {
    name: 'get_payment_link',
    description: "Resend the secure link for an unpaid payment, or create a link for a student's outstanding course balance.",
    audiences: ['customer'],
    input_schema: { type: 'object', properties: { payment_id: { type: 'string' }, balance_for_student_id: { type: 'string' } } },
    async run(a, i) {
      if (a.who.audience !== 'customer') return { ok: false, error: 'not available' }
      if (str(i.balance_for_student_id)) {
        const s = await ownStudent(a, i.balance_for_student_id)
        const b = await studentBalance(a, s.id)
        if (!b.owedCents) return { ok: true, note: `${s.first_name} has no balance due.` }
        const p = await balancePayment(a, b.items[0].enrollmentId, a.who.contactId)
        return p ? { ok: true, payment: paymentView(p) } : { ok: true, note: 'Nothing due.' }
      }
      const p = await one<Payment>(a.q, `select * from rs.payments where school_id = $1 and contact_id = $2 and ($3::uuid is null or id = $3::uuid) and status in ('pending','failed') order by created_at desc limit 1`,
        [a.school.id, a.who.contactId, str(i.payment_id) ?? null])
      if (!p) return { ok: true, note: 'There are no unpaid payment links for this phone number.' }
      if (p.expires_at && asDate(p.expires_at) < now()) return { ok: false, error: 'That hold has expired; find a new time.' }
      return { ok: true, payment: paymentView(p) }
    },
  },
]

// ── Shared ─────────────────────────────────────────────────────────────────

const escalateTool: ToolDef = {
  name: 'escalate_to_owner',
  description: "Hand something to the school owner: anything not covered by the school's information, medical or safety questions, accidents, complaints, discounts or price exceptions, legal or paperwork questions, a person asking for a human, or when you're unsure. Urgent = safety or someone is waiting on the road.",
  audiences: ['customer', 'instructor'],
  input_schema: { type: 'object', properties: { summary: { type: 'string', description: 'One line the owner can act on' }, details: { type: 'string' }, urgent: { type: 'boolean' } }, required: ['summary'] },
  async run(a, i) {
    const who = a.who.name || a.who.phone
    await escalate(a, `${String(i.summary ?? 'Needs attention').slice(0, 160)} (${who})`, String(i.details ?? ''), i.urgent ? 'urgent' : 'normal')
    return { ok: true, note: i.urgent ? 'The owner has been texted and will respond as soon as possible.' : 'Added to the owner\'s inbox; they usually reply within business hours.' }
  },
}

// ── Staff tools ────────────────────────────────────────────────────────────

async function findStudentByName(a: AgentCtx, name: string) {
  const parts = name.trim().toLowerCase().split(/\s+/)
  const rows = await many<Student>(a.q, `select * from rs.students where school_id = $1 and (lower(first_name) = $2 or lower(first_name || ' ' || last_name) = $3 or lower(last_name) = $2) order by first_name limit 6`,
    [a.school.id, parts[0], parts.join(' ')])
  const exact = rows.filter((r) => `${r.first_name} ${r.last_name}`.toLowerCase() === parts.join(' '))
  return exact.length ? exact : rows
}

function staffId(a: AgentCtx) {
  return a.who.audience === 'customer' ? '' : a.who.staffId
}

const staffTools: ToolDef[] = [
  {
    name: 'schedule',
    description: "The schedule for a day or range: lessons (student, pickup address, notes) and classes. Instructors see their own; owners see everyone or one instructor by name.",
    audiences: ['instructor', 'owner'],
    input_schema: { type: 'object', properties: { date: { type: 'string', description: "'today', 'tomorrow', weekday or YYYY-MM-DD" }, days: { type: 'number', description: '1–7' }, instructor_name: { type: 'string' } } },
    async run(a, i) {
      const from = parseDateArg(a, i.date) ?? localDate(now(), a.school.timezone)
      const days = Math.min(7, Math.max(1, Number(i.days) || 1))
      let instructorId: string | undefined = a.who.audience === 'instructor' ? a.who.staffId : undefined
      if (a.who.audience === 'owner' && str(i.instructor_name)) {
        const s = await one<{ id: string }>(a.q, `select id from rs.staff where school_id = $1 and lower(name) like $2 limit 1`, [a.school.id, `%${String(i.instructor_name).toLowerCase()}%`])
        instructorId = s?.id
      }
      const out = []
      for (let d = 0; d < days; d++) {
        const date = addDays(from, d)
        const entries = await scheduleBetween(a, date, date, instructorId)
        out.push({ date, text: scheduleText(a, entries, { showInstructor: a.who.audience === 'owner' && !instructorId }), lessons: entries.filter((e) => e.kind === 'lesson').map((e) => ({ lesson_id: e.id, student: e.student, when: fmtWhen(e.start, a.school.timezone), status: e.status, pickup: e.pickup, instructor: e.instructor })) })
      }
      return { ok: true, schedule: out }
    },
  },
  {
    name: 'next_lesson',
    description: "The instructor's next lesson today: who, when, pickup address, phone and notes.",
    audiences: ['instructor', 'owner'],
    input_schema: { type: 'object', properties: {} },
    async run(a) {
      const l = await one<{ id: string; starts_at: Date; first_name: string; last_name: string; pickup_address: string; notes: string; phone: string | null }>(a.q,
        `select l.id, l.starts_at, s.first_name, s.last_name, l.pickup_address, s.notes, coalesce(sc.phone, gc.phone) as phone
           from rs.lessons l join rs.students s on s.id = l.student_id left join rs.contacts sc on sc.id = s.student_contact_id left join rs.contacts gc on gc.id = s.guardian_contact_id
          where l.school_id = $1 and l.instructor_id = $2 and l.status = 'booked' and l.ends_at > $3 order by l.starts_at limit 1`, [a.school.id, staffId(a), now()])
      if (!l) return { ok: true, note: 'No more lessons booked.' }
      return { ok: true, lesson_id: l.id, student: `${l.first_name} ${l.last_name}`, when: fmtWhen(asDate(l.starts_at), a.school.timezone), pickup: l.pickup_address, family_phone: l.phone, notes: l.notes }
    },
  },
  {
    name: 'complete_lesson',
    description: "Mark a lesson finished with optional minutes driven and notes for the family. Without lesson_id, uses the instructor's lesson that most recently started.",
    audiences: ['instructor', 'owner'],
    input_schema: { type: 'object', properties: { lesson_id: { type: 'string' }, minutes: { type: 'number' }, notes: { type: 'string' } } },
    async run(a, i) {
      let id = str(i.lesson_id)
      if (!id) {
        const l = await one<{ id: string }>(a.q, `select id from rs.lessons where school_id = $1 and instructor_id = $2 and status = 'booked' and starts_at <= $3 order by starts_at desc limit 1`, [a.school.id, staffId(a), now()])
        if (!l) return { ok: false, error: 'No started lesson to mark done.' }
        id = l.id
      }
      await ownLesson(a, id)
      const done = await completeLesson(a, { lessonId: id, minutes: Number(i.minutes) || undefined, notes: str(i.notes), actor: actorOf(a) })
      const s = (await getStudent(a, done.student_id))!
      return { ok: true, student: studentName(s), minutes: done.completed_minutes, total_driving: minutesLabel(s.driving_minutes), family_notified: a.school.playbook.messaging.send_progress_to_parents }
    },
  },
  {
    name: 'mark_no_show',
    description: 'Record that the student did not show up for a lesson (owner is told).',
    audiences: ['instructor', 'owner'],
    input_schema: { type: 'object', properties: { lesson_id: { type: 'string' } } },
    async run(a, i) {
      let id = str(i.lesson_id)
      if (!id) {
        const l = await one<{ id: string }>(a.q, `select id from rs.lessons where school_id = $1 and instructor_id = $2 and status = 'booked' and starts_at <= $3 order by starts_at desc limit 1`, [a.school.id, staffId(a), new Date(+now() + 15 * 60000)])
        if (!l) return { ok: false, error: 'No current lesson found.' }
        id = l.id
      }
      await ownLesson(a, id)
      await markNoShow(a, id, actorOf(a))
      return { ok: true, note: 'Recorded as a no-show and the owner was told.' }
    },
  },
  {
    name: 'running_late',
    description: "Tell the families of the instructor's next lesson(s) today that they're running late.",
    audiences: ['instructor'],
    input_schema: { type: 'object', properties: { minutes: { type: 'number' } }, required: ['minutes'] },
    async run(a, i) {
      const mins = Math.min(120, Math.max(5, Math.round(Number(i.minutes) || 10)))
      const tz = a.school.timezone
      const until = zonedToUtc(addDays(localDate(now(), tz), 1), 0, tz)
      const next = await many<{ id: string; student_id: string; starts_at: Date; first_name: string }>(a.q,
        `select l.id, l.student_id, l.starts_at, s.first_name from rs.lessons l join rs.students s on s.id = l.student_id
          where l.school_id = $1 and l.instructor_id = $2 and l.status = 'booked' and l.starts_at > $3 and l.starts_at < $4 order by l.starts_at limit 2`,
        [a.school.id, staffId(a), new Date(+now() - 10 * 60000), until])
      if (!next.length) return { ok: true, note: 'No more lessons today, so nobody needed a heads-up.' }
      const first = a.who.name.split(' ')[0]
      const affected = next.filter((n, idx) => idx === 0 || +asDate(n.starts_at) - +now() < 3 * 3600000)
      for (const n of affected) await notifyFamily(a, n.student_id, `Heads up: ${first} is running about ${mins} minutes late for ${n.first_name}'s ${fmtWhen(asDate(n.starts_at), tz)} lesson. Sorry for the wait!`, { reason: 'running_late' })
      return { ok: true, notified: affected.map((n) => `${n.first_name} (${fmtWhen(asDate(n.starts_at), tz)})`) }
    },
  },
  {
    name: 'block_time',
    description: "Block time off for the instructor (e.g. appointment). If lessons are already booked in that time, nothing is blocked and the owner is asked to rearrange.",
    audiences: ['instructor', 'owner'],
    input_schema: { type: 'object', properties: { date: { type: 'string' }, start_time: { type: 'string', description: 'HH:MM 24h' }, end_time: { type: 'string', description: 'HH:MM 24h' }, reason: { type: 'string' }, instructor_name: { type: 'string', description: 'owner only' } }, required: ['date', 'start_time', 'end_time'] },
    async run(a, i) {
      const date = parseDateArg(a, i.date)
      const toMin = (v: unknown) => { const m = /^(\d{1,2}):?(\d{2})?$/.exec(String(v ?? '').trim()); return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : NaN }
      const sMin = toMin(i.start_time), eMin = toMin(i.end_time)
      if (!date || !(eMin > sMin)) return { ok: false, error: 'Need a date and a start and end time (HH:MM).' }
      let sid = staffId(a)
      if (a.who.audience === 'owner' && str(i.instructor_name)) {
        const s = await one<{ id: string }>(a.q, `select id from rs.staff where school_id = $1 and lower(name) like $2 limit 1`, [a.school.id, `%${String(i.instructor_name).toLowerCase()}%`])
        if (!s) return { ok: false, error: 'No instructor by that name.' }
        sid = s.id
      }
      const tz = a.school.timezone
      const st = zonedToUtc(date, sMin, tz), en = zonedToUtc(date, eMin, tz)
      const clashes = await many<{ id: string; starts_at: Date; first_name: string }>(a.q,
        `select l.id, l.starts_at, s.first_name from rs.lessons l join rs.students s on s.id = l.student_id where l.school_id = $1 and l.instructor_id = $2 and l.status in ('held','booked') and l.starts_at < $4 and l.ends_at > $3`,
        [a.school.id, sid, st, en])
      if (clashes.length) {
        const list = clashes.map((c) => `${c.first_name} at ${fmtWhen(asDate(c.starts_at), tz)}`).join(', ')
        await createInbox(a, { kind: 'escalation', title: `${a.who.name} needs time off ${date} — ${clashes.length} lesson(s) affected`, detail: `Requested ${String(i.start_time)}–${String(i.end_time)} (${str(i.reason) ?? 'no reason given'}). Booked: ${list}. Nothing was changed.`, conversationId: a.conv.id })
        return { ok: true, status: 'not blocked — lessons already booked', affected: list, note: 'The owner was asked to rearrange these first.' }
      }
      await a.q.query(`insert into rs.time_off (school_id, staff_id, starts_at, ends_at, reason) values ($1,$2,$3,$4,$5)`, [a.school.id, sid, st, en, str(i.reason) ?? ''])
      return { ok: true, status: 'blocked', when: `${fmtWhen(st, tz)} – ${fmtWhen(en, tz).split(' at ')[1]}` }
    },
  },
  {
    name: 'student_info',
    description: "Look up a student by name: age, driving time so far, notes, upcoming lessons. Owners also see balances and contact phone.",
    audiences: ['instructor', 'owner'],
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    async run(a, i) {
      const rows = await findStudentByName(a, String(i.name ?? ''))
      if (!rows.length) return { ok: false, error: 'No student by that name.' }
      if (rows.length > 1) return { ok: true, ambiguous: rows.map((r) => studentName(r)) }
      const s = rows[0]
      const lessons = await lessonList(a, [s.id])
      const base = { ok: true as const, student: studentName(s), age: studentAge(a, s), driving_time: minutesLabel(s.driving_minutes), notes: s.notes, pickup: s.address, upcoming_lessons: lessons }
      if (a.who.audience !== 'owner') return base
      const bal = await studentBalance(a, s.id)
      const phones = await many<{ name: string; phone: string }>(a.q, `select name, phone from rs.contacts where id = any($1::uuid[])`, [[s.guardian_contact_id, s.student_contact_id].filter(Boolean)])
      return { ...base, balance_owed: fmtMoney(bal.owedCents, a.school.currency), contacts: phones, permit_on_file: Boolean(s.permit_number), dob: s.dob ? asDateStr(s.dob) : null }
    },
  },
  {
    name: 'business_summary',
    description: 'How the school is doing: lessons today and this week, money collected (yesterday, this month), pending payments, course balances, course fill, no-shows, open decisions.',
    audiences: ['owner'],
    input_schema: { type: 'object', properties: {} },
    async run(a) {
      const s = await snapshot(a)
      const m = (c: number) => fmtMoney(c, s.currency)
      return {
        ok: true, lessons_today: s.lessonsToday, lessons_next_7_days: s.lessonsNext7, holds_awaiting_payment: s.heldAwaitingPayment,
        collected_today: m(s.collectedTodayCents), collected_yesterday: m(s.collectedYesterdayCents), collected_this_month: m(s.collectedMonthCents),
        unpaid_links_outstanding: m(s.pendingCents), course_balances_outstanding: m(s.outstandingBalanceCents), new_enrollments_this_month: s.enrollmentsThisMonth,
        lessons_completed_30d: s.completedLessons30, no_shows_30d: s.noShows30, cancellations_30d: s.cancellations30,
        courses: s.courses.map((c) => `${c.title}: ${c.seats_taken}/${c.capacity}`), cohorts_needing_drive_times: s.needsDrives, decisions_waiting: s.openInbox,
      }
    },
  },
  {
    name: 'list_decisions',
    description: 'Open items waiting for the owner (approvals and escalations), numbered.',
    audiences: ['owner'],
    input_schema: { type: 'object', properties: {} },
    async run(a) {
      const items = await openInbox(a)
      a.state.pending = { intent: 'inbox', data: { ids: items.map((x) => x.id) } }
      return { ok: true, items: items.map((x, idx) => ({ number: idx + 1, kind: x.kind, title: x.title, detail: x.detail, can_approve: Boolean(x.action) })) }
    },
  },
  {
    name: 'decide',
    description: "Approve, decline or mark handled an item from list_decisions (by its number). Approving runs the attached action.",
    audiences: ['owner'],
    input_schema: { type: 'object', properties: { number: { type: 'number' }, decision: { type: 'string', enum: ['approve', 'decline', 'resolve'] }, note: { type: 'string' } }, required: ['number', 'decision'] },
    async run(a, i) {
      if (a.who.audience !== 'owner') return { ok: false, error: 'Only the owner can decide.' }
      const ids = (a.state.pending?.intent === 'inbox' ? (a.state.pending.data.ids as string[]) : (await openInbox(a)).map((x) => x.id))
      const id = ids[Number(i.number) - 1]
      if (!id) return { ok: false, error: 'No item with that number; list decisions again.' }
      const r = await decideInbox(a, { id, decision: i.decision as 'approve' | 'decline' | 'resolve', staffId: a.who.staffId, staffName: a.who.name, note: str(i.note) })
      return { ok: true, item: r.item.title, status: r.item.status, result: r.result }
    },
  },
  {
    name: 'plan_drives',
    description: "Draft behind-the-wheel times for every student in a finished Driver Ed cohort who doesn't have one yet, grouped to keep driving between pickups low. Goes to the inbox for approval (unless the school lets the agent book plans directly).",
    audiences: ['owner'],
    input_schema: { type: 'object', properties: { course_id: { type: 'string', description: 'Omit to use the most recent cohort that needs drives' } } },
    async run(a, i) {
      let courseId = str(i.course_id)
      if (!courseId) {
        const s = await snapshot(a)
        courseId = s.needsDrives[0]?.courseId
        if (!courseId) return { ok: true, note: 'Every finished cohort already has drive times.' }
      }
      const plan = await planCohortDrives(a, { courseId })
      const summary = plan.items.map((x) => `${x.student}: ${x.label} with ${x.instructor.split(' ')[0]}`)
      if (!plan.items.length) return { ok: true, note: 'No drives could be placed.', unplaced: plan.unplaced }
      if (autonomy(a, 'drive_plans') === 'auto') {
        const result = await executeAction(a, { type: 'apply_drive_plan', args: { plan } }, actorOf(a))
        return { ok: true, status: 'booked', result, unplaced: plan.unplaced }
      }
      await createInbox(a, { kind: 'approval', title: `Drive plan: ${plan.course} (${plan.items.length} students)`, detail: summary.join('\n') + (plan.unplaced.length ? `\nNot placed: ${plan.unplaced.map((u) => `${u.student} (${u.reason})`).join('; ')}` : ''), action: { type: 'apply_drive_plan', args: { plan } as unknown as Record<string, unknown> } })
      return { ok: true, status: 'drafted — approve it in the inbox or reply "approve" after listing decisions', plan: summary, unplaced: plan.unplaced }
    },
  },
  {
    name: 'message_family',
    description: "Send a text from the school to a student's family (owner only), e.g. 'Tell Emma's mom we're closed Friday'.",
    audiences: ['owner'],
    input_schema: { type: 'object', properties: { student_name: { type: 'string' }, message: { type: 'string' } }, required: ['student_name', 'message'] },
    async run(a, i) {
      const rows = await findStudentByName(a, String(i.student_name ?? ''))
      if (rows.length !== 1) return { ok: false, error: rows.length ? `Which one: ${rows.map(studentName).join(', ')}?` : 'No student by that name.' }
      const msg = String(i.message ?? '').trim().slice(0, 600)
      if (!msg) return { ok: false, error: 'Empty message.' }
      await notifyFamily(a, rows[0].id, msg, { reason: 'owner_message', author: 'staff' })
      return { ok: true, sent_to: `${studentName(rows[0])}'s family` }
    },
  },
]

export const ALL_TOOLS: ToolDef[] = [...customerTools, escalateTool, ...staffTools]

export function toolsFor(audience: Who['audience']): ToolDef[] {
  return ALL_TOOLS.filter((t) => t.audiences.includes(audience))
}

/** Run a tool by name with permission checks and error capture. */
export async function runTool(a: AgentCtx, name: string, input: Record<string, unknown>): Promise<ToolResult> {
  const tool = toolsFor(a.who.audience).find((t) => t.name === name)
  if (!tool) return { ok: false, error: `Tool ${name} is not available to this person.` }
  let result: ToolResult
  try {
    // Each tool call is its own transaction: all of it happens, or none of it.
    result = await a.db.tx((q) => tool.run({ ...a, q }, input ?? {}))
  } catch (err) {
    result = { ok: false, error: err instanceof OsError ? err.message : 'Something went wrong on our side; nothing was changed.' }
    if (!(err instanceof OsError)) console.error(`[roadsmith] tool ${name} failed`, err)
  }
  a.events.push({ tool: name, input, ok: result.ok, summary: result.ok ? 'ok' : String((result as { error: string }).error) })
  return result
}
