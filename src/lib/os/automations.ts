/**
 * Automations: the scheduled work Roadsmith does on its own — releasing
 * unpaid holds, reminders, balance requests and the 7am briefs. Each job runs
 * in its own transaction; customer-facing texts wait out quiet hours.
 */
import { getDb, many, one, type Db } from './db.ts'
import { loadClock, now } from './clock.ts'
import { audit } from './audit.ts'
import { balancePayment, getLesson, getStudent } from './bookings.ts'
import { instructorBrief, ownerBrief } from './insights.ts'
import { dueJobs, scheduleJob, type Job } from './jobs.ts'
import { dispatchOutbox, notifyContact, notifyFamily, notifyStaff } from './messaging.ts'
import { paymentLink } from './payments.ts'
import { hhmmToMin } from './playbook.ts'
import { addDays, asDate, fmtMoney, fmtWhen, localDate, localMinutes, zonedToUtc } from './time.ts'
import { loadSchool, type Ctx } from './school.ts'

const CUSTOMER_FACING = new Set(['lesson_reminder', 'course_reminder', 'balance_reminder'])

/** If `at` falls in the school's quiet hours, return when quiet hours end. */
export function quietHoursDeferral(ctx: Ctx, at: Date): Date | null {
  const m = ctx.school.playbook.messaging
  const qs = hhmmToMin(m.quiet_start), qe = hhmmToMin(m.quiet_end)
  const tz = ctx.school.timezone
  const mins = localMinutes(at, tz)
  const inQuiet = qs > qe ? mins >= qs || mins < qe : mins >= qs && mins < qe
  if (!inQuiet) return null
  const day = localDate(at, tz)
  const endDay = qs > qe && mins >= qs ? addDays(day, 1) : day
  return zonedToUtc(endDay, qe, tz)
}

/** Make sure today's (or tomorrow's) briefs are scheduled. Idempotent by dedupe key. */
export async function ensureDailyJobs(ctx: Ctx) {
  const tz = ctx.school.timezone
  const t = now()
  const m = ctx.school.playbook.messaging
  const staff = await many<{ id: string; role: string }>(ctx.q, `select id, role from rs.staff where school_id = $1 and active and phone is not null`, [ctx.school.id])
  for (const offset of [0, 1]) {
    const date = addDays(localDate(t, tz), offset)
    for (const s of staff) {
      const isOwner = s.role !== 'instructor'
      const at = zonedToUtc(date, hhmmToMin(isOwner ? m.owner_brief_time : m.instructor_brief_time), tz)
      if (at < new Date(+t - 30 * 60000)) continue // don't send stale briefs after a restart
      const kind = isOwner ? 'owner_brief' : 'instructor_brief'
      await scheduleJob(ctx, kind, at, { staffId: s.id, date }, `${kind}:${s.id}:${date}`)
    }
  }
}

async function runJob(ctx: Ctx, job: Job): Promise<string> {
  const p = job.payload as Record<string, string>
  const tz = ctx.school.timezone
  if (CUSTOMER_FACING.has(job.kind)) {
    const later = quietHoursDeferral(ctx, now())
    if (later) {
      await ctx.q.query(`update rs.jobs set run_at = $2 where id = $1`, [job.id, later])
      return 'deferred for quiet hours'
    }
  }
  switch (job.kind) {
    case 'hold_expiry': {
      if (p.lessonId) {
        const l = await getLesson(ctx, p.lessonId)
        if (l?.status !== 'held') return 'no longer held'
        const pay = await one<{ id: string; contact_id: string | null; status: string }>(ctx.q, `select id, contact_id, status from rs.payments where lesson_id = $1 order by created_at desc limit 1`, [l.id])
        if (pay?.status === 'paid') return 'already paid'
        await ctx.q.query(`update rs.lessons set status = 'cancelled', cancelled_reason = 'payment hold expired' where id = $1`, [l.id])
        if (pay) await ctx.q.query(`update rs.payments set status = 'expired' where id = $1 and status in ('pending','failed')`, [pay.id])
        await audit(ctx, { type: 'system' }, 'lesson.hold_expired', { type: 'lesson', id: l.id }, {})
        if (pay?.contact_id) await notifyContact(ctx, pay.contact_id, `The hold on ${fmtWhen(asDate(l.starts_at), tz)} expired because payment wasn't completed, so that time was released. Text me anytime to find a new one.`, { reason: 'hold_expired' })
        return 'released'
      }
      if (p.enrollmentId) {
        const e = await one<{ id: string; status: string }>(ctx.q, `select id, status from rs.enrollments where id = $1`, [p.enrollmentId])
        if (e?.status !== 'reserved') return 'no longer reserved'
        const pay = await one<{ id: string; contact_id: string | null; status: string; description: string }>(ctx.q, `select id, contact_id, status, description from rs.payments where enrollment_id = $1 order by created_at desc limit 1`, [e.id])
        if (pay?.status === 'paid') return 'already paid'
        await ctx.q.query(`update rs.enrollments set status = 'cancelled' where id = $1`, [e.id])
        if (pay) await ctx.q.query(`update rs.payments set status = 'expired' where id = $1 and status in ('pending','failed')`, [pay.id])
        await audit(ctx, { type: 'system' }, 'enrollment.hold_expired', { type: 'enrollment', id: e.id }, {})
        if (pay?.contact_id) await notifyContact(ctx, pay.contact_id, `The seat hold (${pay.description}) expired because payment wasn't completed. Text me if you'd still like a seat — I'll check what's open.`, { reason: 'hold_expired' })
        return 'released'
      }
      return 'nothing to do'
    }
    case 'lesson_reminder': {
      const l = await getLesson(ctx, p.lessonId)
      if (l?.status !== 'booked') return 'not booked'
      const s = await getStudent(ctx, l.student_id)
      const who = (await one<{ name: string }>(ctx.q, `select name from rs.staff where id = $1`, [l.instructor_id]))?.name ?? 'your instructor'
      if (s) await notifyFamily(ctx, s.id, `Reminder: ${s.first_name}'s driving lesson is ${fmtWhen(asDate(l.starts_at), tz)} with ${who}. Pickup: ${l.pickup_address ?? 'at the school'}. Please have the learner's permit ready. Need to change it? Just reply.`, { reason: 'lesson_reminder' })
      return 'sent'
    }
    case 'course_reminder': {
      const c = await one<{ id: string; title: string; location: string }>(ctx.q, `select id, title, location from rs.courses where id = $1`, [p.courseId])
      const first = await one<{ starts_at: Date }>(ctx.q, `select starts_at from rs.course_sessions where course_id = $1 and starts_at > $2 order by starts_at limit 1`, [p.courseId, now()])
      if (!c || !first) return 'no upcoming session'
      const students = await many<{ student_id: string }>(ctx.q, `select student_id from rs.enrollments where course_id = $1 and status = 'confirmed'`, [c.id])
      for (const st of students) {
        const s = await getStudent(ctx, st.student_id)
        if (s) await notifyFamily(ctx, s.id, `Reminder: ${s.first_name}'s ${c.title} starts ${fmtWhen(asDate(first.starts_at), tz)} at ${c.location}. Bring the learner's permit and a pen.`, { reason: 'course_reminder' })
      }
      return `sent to ${students.length}`
    }
    case 'balance_reminder': {
      const e = await one<{ student_id: string }>(ctx.q, `select student_id from rs.enrollments where id = $1 and status = 'confirmed'`, [p.enrollmentId])
      if (!e) return 'not confirmed'
      const s = await getStudent(ctx, e.student_id)
      const contact = s?.guardian_contact_id ?? s?.student_contact_id ?? null
      const pay = await balancePayment(ctx, p.enrollmentId, contact)
      if (!pay || !contact) return 'nothing owed'
      await notifyContact(ctx, contact, `Hi! A balance of ${fmtMoney(pay.amount_cents, pay.currency)} is due for ${pay.description.replace(/^Balance: /, '')}. You can pay securely here: ${paymentLink(pay)}`, { reason: 'balance_reminder' })
      return 'sent'
    }
    case 'instructor_brief': {
      const text = await instructorBrief(ctx, p.staffId, p.date)
      if (text) await notifyStaff(ctx, p.staffId, text, { reason: 'daily_brief' })
      return 'sent'
    }
    case 'owner_brief': {
      await notifyStaff(ctx, p.staffId, await ownerBrief(ctx), { reason: 'owner_brief' })
      return 'sent'
    }
  }
  return 'unknown job'
}

/** Run everything that's due for one school. */
export async function runDueJobs(db: Db, schoolId: string): Promise<{ ran: number; results: string[] }> {
  const school = await loadSchool(db, schoolId)
  if (!school) return { ran: 0, results: [] }
  await db.tx((q) => ensureDailyJobs({ q, school }))
  const results: string[] = []
  for (let round = 0; round < 5; round++) {
    const jobs = await dueJobs(db, schoolId)
    if (!jobs.length) break
    for (const job of jobs) {
      try {
        const r = await db.tx(async (q) => {
          const ctx = { q, school }
          const fresh = await one<{ status: string }>(q, `select status from rs.jobs where id = $1 for update`, [job.id])
          if (fresh?.status !== 'pending') return 'skipped'
          const out = await runJob(ctx, job)
          if (out !== 'deferred for quiet hours') await q.query(`update rs.jobs set status = 'done', done_at = $2 where id = $1`, [job.id, now()])
          return out
        })
        results.push(`${job.kind}: ${r}`)
      } catch (err) {
        await db.query(`update rs.jobs set attempts = attempts + 1, last_error = $2, status = case when attempts >= 2 then 'failed' else status end where id = $1`, [job.id, String((err as Error).message).slice(0, 300)])
        results.push(`${job.kind}: error ${(err as Error).message}`)
      }
    }
  }
  await dispatchOutbox(db, schoolId)
  return { ran: results.length, results }
}

/** Run due work for every school (cron entry point, and lazily in the sandbox). */
export async function tickAll(): Promise<{ ran: number }> {
  const db = await getDb()
  await loadClock(db)
  const schools = await many<{ id: string }>(db, `select id from rs.schools`)
  let ran = 0
  for (const s of schools) ran += (await runDueJobs(db, s.id)).ran
  return { ran }
}

