/**
 * Read models: schedules, briefs and the business snapshot. Every number here
 * is computed from records — nothing is estimated or invented.
 */
import { many, one } from './db.ts'
import { now } from './clock.ts'
import { addDays, asDate, asDateStr, fmtDateStr, fmtMoney, fmtTime, localDate, zonedToUtc } from './time.ts'
import { listCourses } from './bookings.ts'
import type { Ctx } from './school.ts'

export interface ScheduleEntry {
  kind: 'lesson' | 'class'
  id: string
  start: Date
  end: Date
  status: string
  title: string
  instructorId: string | null
  instructor: string
  studentId?: string
  student?: string
  pickup?: string | null
  notes?: string
  phone?: string | null
  locationQuality?: string
}

export async function scheduleBetween(ctx: Ctx, fromDate: string, toDate: string, instructorId?: string): Promise<ScheduleEntry[]> {
  const tz = ctx.school.timezone
  const a = zonedToUtc(fromDate, 0, tz), b = zonedToUtc(addDays(toDate, 1), 0, tz)
  const lessons = await many<{ id: string; starts_at: Date; ends_at: Date; status: string; instructor_id: string; instructor: string; student_id: string; first_name: string; last_name: string; pickup_address: string | null; instructor_notes: string; service: string; phone: string | null; location_quality: string; student_notes: string }>(ctx.q,
    `select l.id, l.starts_at, l.ends_at, l.status, l.instructor_id, st.name as instructor, s.id as student_id, s.first_name, s.last_name,
            l.pickup_address, l.instructor_notes, sv.name as service, s.location_quality, s.notes as student_notes,
            coalesce(sc.phone, gc.phone) as phone
       from rs.lessons l join rs.students s on s.id = l.student_id join rs.staff st on st.id = l.instructor_id join rs.services sv on sv.id = l.service_id
       left join rs.contacts sc on sc.id = s.student_contact_id left join rs.contacts gc on gc.id = s.guardian_contact_id
      where l.school_id = $1 and l.starts_at >= $2 and l.starts_at < $3 and l.status in ('held','booked','completed','no_show')
        and ($4::uuid is null or l.instructor_id = $4::uuid)`, [ctx.school.id, a, b, instructorId ?? null])
  const classes = await many<{ id: string; starts_at: Date; ends_at: Date; title: string; instructor_id: string | null; instructor: string | null; location: string }>(ctx.q,
    `select cs.id, cs.starts_at, cs.ends_at, c.title, cs.instructor_id, st.name as instructor, c.location
       from rs.course_sessions cs join rs.courses c on c.id = cs.course_id left join rs.staff st on st.id = cs.instructor_id
      where cs.school_id = $1 and cs.starts_at >= $2 and cs.starts_at < $3 and ($4::uuid is null or cs.instructor_id = $4::uuid)`,
    [ctx.school.id, a, b, instructorId ?? null])
  const out: ScheduleEntry[] = [
    ...lessons.map((l) => ({
      kind: 'lesson' as const, id: l.id, start: asDate(l.starts_at), end: asDate(l.ends_at), status: l.status, title: l.service,
      instructorId: l.instructor_id, instructor: l.instructor, studentId: l.student_id, student: `${l.first_name} ${l.last_name}`,
      pickup: l.pickup_address, notes: l.instructor_notes || l.student_notes, phone: l.phone, locationQuality: l.location_quality,
    })),
    ...classes.map((c) => ({ kind: 'class' as const, id: c.id, start: asDate(c.starts_at), end: asDate(c.ends_at), status: 'class', title: c.title, instructorId: c.instructor_id, instructor: c.instructor ?? 'Unassigned', pickup: c.location })),
  ]
  void tz
  return out.sort((x, y) => +x.start - +y.start)
}

export function scheduleText(ctx: Ctx, entries: ScheduleEntry[], opts: { showInstructor?: boolean } = {}): string {
  const tz = ctx.school.timezone
  if (!entries.length) return 'Nothing scheduled.'
  return entries.map((e) => {
    const t = `${fmtTime(e.start, tz)}–${fmtTime(e.end, tz)}`
    const who = opts.showInstructor ? ` (${e.instructor})` : ''
    if (e.kind === 'class') return `${t} ${e.title}${who}`
    const status = e.status === 'held' ? ' [awaiting payment]' : e.status === 'completed' ? ' [done]' : e.status === 'no_show' ? ' [no-show]' : ''
    const where = e.pickup ? ` — pickup ${e.pickup}${e.locationQuality === 'unknown' ? ' (address unverified)' : ''}` : ''
    return `${t} ${e.student}${who}${where}${status}`
  }).join('\n')
}

export async function instructorBrief(ctx: Ctx, staffId: string, date: string): Promise<string | null> {
  const staff = await one<{ name: string }>(ctx.q, `select name from rs.staff where id = $1 and school_id = $2`, [staffId, ctx.school.id])
  if (!staff) return null
  const entries = (await scheduleBetween(ctx, date, date, staffId)).filter((e) => e.status !== 'cancelled')
  const first = staff.name.split(' ')[0]
  if (!entries.length) return `Good morning ${first} — nothing on your schedule for ${fmtDateStr(date)}.`
  const lessons = entries.filter((e) => e.kind === 'lesson').length
  const notes = entries.filter((e) => e.kind === 'lesson' && e.notes).map((e) => `• ${e.student}: ${e.notes}`)
  return [
    `Good morning ${first}. ${fmtDateStr(date)}: ${lessons} lesson${lessons === 1 ? '' : 's'}${entries.length > lessons ? ' + class' : ''}.`,
    scheduleText(ctx, entries),
    notes.length ? `Notes:\n${notes.join('\n')}` : '',
    'Text me "done", "running late", or "who\'s next" anytime.',
  ].filter(Boolean).join('\n')
}

export interface Snapshot {
  today: string
  lessonsToday: number
  lessonsNext7: number
  heldAwaitingPayment: number
  collectedMonthCents: number
  collectedYesterdayCents: number
  collectedTodayCents: number
  pendingCents: number
  outstandingBalanceCents: number
  enrollmentsThisMonth: number
  activeStudents: number
  completedLessons30: number
  noShows30: number
  cancellations30: number
  courses: { id: string; title: string; starts_on: string; seats_taken: number; capacity: number }[]
  needsDrives: { courseId: string; course: string; students: number }[]
  openInbox: number
  conversations24h: number
  agentHandled24h: number
  currency: string
}

export async function snapshot(ctx: Ctx): Promise<Snapshot> {
  const tz = ctx.school.timezone
  const t = now()
  const today = localDate(t, tz)
  const monthStart = zonedToUtc(today.slice(0, 8) + '01', 0, tz)
  const dayStart = zonedToUtc(today, 0, tz)
  const yStart = zonedToUtc(addDays(today, -1), 0, tz)
  const tomorrow = zonedToUtc(addDays(today, 1), 0, tz)
  const week = zonedToUtc(addDays(today, 8), 0, tz)
  const d30 = new Date(+t - 30 * 86400000)
  const id = ctx.school.id
  const r = (await one<Record<string, number>>(ctx.q, `select
      (select count(*)::int from rs.lessons where school_id = $1 and status in ('booked','completed','held') and starts_at >= $2 and starts_at < $3) as lessons_today,
      (select count(*)::int from rs.lessons where school_id = $1 and status in ('booked','held') and starts_at >= $4 and starts_at < $5) as lessons_next7,
      (select count(*)::int from rs.lessons where school_id = $1 and status = 'held') as held,
      (select coalesce(sum(amount_cents),0)::int from rs.payments where school_id = $1 and status = 'paid' and paid_at >= $6) as month_cents,
      (select coalesce(sum(amount_cents),0)::int from rs.payments where school_id = $1 and status = 'paid' and paid_at >= $7 and paid_at < $2) as yday_cents,
      (select coalesce(sum(amount_cents),0)::int from rs.payments where school_id = $1 and status = 'paid' and paid_at >= $2) as today_cents,
      (select coalesce(sum(amount_cents),0)::int from rs.payments where school_id = $1 and status in ('pending','failed')) as pending_cents,
      (select count(*)::int from rs.enrollments where school_id = $1 and status = 'confirmed' and created_at >= $6) as enrollments_month,
      (select count(distinct student_id)::int from rs.lessons where school_id = $1 and starts_at >= $8 and status in ('booked','completed','held')) as active_students,
      (select count(*)::int from rs.lessons where school_id = $1 and status = 'completed' and starts_at >= $8) as completed30,
      (select count(*)::int from rs.lessons where school_id = $1 and status = 'no_show' and starts_at >= $8) as noshow30,
      (select count(*)::int from rs.lessons where school_id = $1 and status = 'cancelled' and starts_at >= $8) as cancel30,
      (select count(*)::int from rs.inbox where school_id = $1 and status = 'open') as open_inbox,
      (select count(distinct conversation_id)::int from rs.messages where school_id = $1 and direction = 'in' and created_at >= $9) as conv24,
      (select count(distinct m.conversation_id)::int from rs.messages m join rs.conversations c on c.id = m.conversation_id
          where m.school_id = $1 and m.direction = 'in' and m.created_at >= $9 and c.mode = 'agent'
            and not exists (select 1 from rs.inbox i where i.conversation_id = m.conversation_id and i.created_at >= $9)) as handled24
    `, [id, dayStart, tomorrow, t, week, monthStart, yStart, d30, new Date(+t - 86400000)]))!
  const bal = (await one<{ owed: number }>(ctx.q, `select coalesce(sum(greatest(sv.price_cents - coalesce((select sum(p.amount_cents) from rs.payments p where p.enrollment_id = e.id and p.status = 'paid'),0), 0)),0)::int as owed
      from rs.enrollments e join rs.courses c on c.id = e.course_id join rs.services sv on sv.id = c.service_id where e.school_id = $1 and e.status = 'confirmed'`, [id]))!
  const courses = (await listCourses(ctx, { upcomingOnly: true })).slice(0, 4).map((c) => ({ id: c.id, title: c.title, starts_on: asDateStr(c.starts_on), seats_taken: c.seats_taken, capacity: c.capacity }))
  const needsDrives = await many<{ course_id: string; title: string; n: number }>(ctx.q,
    `select c.id as course_id, c.title, count(*)::int as n from rs.enrollments e join rs.courses c on c.id = e.course_id
      where e.school_id = $1 and e.status = 'confirmed' and c.ends_on < $2::date
        and not exists (select 1 from rs.lessons l where l.student_id = e.student_id and l.course_id = c.id and l.status in ('held','booked','completed'))
      group by c.id, c.title order by c.title`, [id, today])
  return {
    today, lessonsToday: r.lessons_today, lessonsNext7: r.lessons_next7, heldAwaitingPayment: r.held,
    collectedMonthCents: r.month_cents, collectedYesterdayCents: r.yday_cents, collectedTodayCents: r.today_cents, pendingCents: r.pending_cents,
    outstandingBalanceCents: bal.owed, enrollmentsThisMonth: r.enrollments_month, activeStudents: r.active_students,
    completedLessons30: r.completed30, noShows30: r.noshow30, cancellations30: r.cancel30, courses,
    needsDrives: needsDrives.map((n) => ({ courseId: n.course_id, course: n.title, students: n.n })),
    openInbox: r.open_inbox, conversations24h: r.conv24, agentHandled24h: r.handled24, currency: ctx.school.currency,
  }
}

export async function ownerBrief(ctx: Ctx): Promise<string> {
  const s = await snapshot(ctx)
  const m = (c: number) => fmtMoney(c, s.currency)
  const lines = [
    `Good morning. ${fmtDateStr(s.today)} at ${ctx.school.name}:`,
    `• ${s.lessonsToday} lesson${s.lessonsToday === 1 ? '' : 's'} today, ${s.lessonsNext7} booked in the next 7 days.`,
    `• Collected ${m(s.collectedYesterdayCents)} yesterday, ${m(s.collectedMonthCents)} this month.`,
  ]
  if (s.outstandingBalanceCents) lines.push(`• ${m(s.outstandingBalanceCents)} in course balances outstanding (reminders are scheduled).`)
  for (const c of s.courses.slice(0, 2)) lines.push(`• ${c.title}: ${c.seats_taken}/${c.capacity} seats.`)
  for (const n of s.needsDrives) lines.push(`• ${n.students} student${n.students === 1 ? '' : 's'} from ${n.course} still need drive times. Reply "plan drives" and I'll draft them.`)
  lines.push(s.openInbox ? `• ${s.openInbox} item${s.openInbox === 1 ? '' : 's'} need${s.openInbox === 1 ? 's' : ''} your decision in the inbox.` : '• Nothing needs your decision.')
  return lines.join('\n')
}
