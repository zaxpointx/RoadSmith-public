/**
 * Cohort drive planning — the founder notebook's core idea: after a classroom
 * course, build every student's behind-the-wheel schedule at once, grouping
 * pickups so instructors aren't zig-zagging across town, then text each
 * family their times once the owner approves.
 */
import { many } from './db.ts'
import { addDays, asDate, asDateStr, fmtWhen, localDate } from './time.ts'
import { now } from './clock.ts'
import { findSlots, type Commitment, type Service } from './scheduling.ts'
import { getService, holdLesson, lessonBlockers, getStudent, studentName, type Student } from './bookings.ts'
import { haversineKm, toPoint } from './travel.ts'
import { notifyFamily } from './messaging.ts'
import { audit, type Actor } from './audit.ts'
import { schoolPoint, type Ctx } from './school.ts'
import { OsError } from './util.ts'

export interface DrivePlanItem { studentId: string; student: string; instructorId: string; instructor: string; start: string; label: string; addedTravel: number }
export interface DrivePlan { courseId: string; course: string; serviceCode: string; items: DrivePlanItem[]; unplaced: { studentId: string; student: string; reason: string }[] }

export async function planCohortDrives(ctx: Ctx, args: { courseId: string; serviceCode?: string; from?: string; days?: number }): Promise<DrivePlan> {
  const course = (await many<{ id: string; title: string; ends_on: string }>(ctx.q, `select id, title, ends_on from rs.courses where id = $1 and school_id = $2`, [args.courseId, ctx.school.id]))[0]
  if (!course) throw new OsError('not_found', 'Course not found.')
  const service = await getService(ctx, { code: args.serviceCode ?? 'BTW' })
  if (!service) throw new OsError('not_found', 'No behind-the-wheel service is set up.')
  const tz = ctx.school.timezone
  const today = localDate(now(), tz)
  const afterCourse = addDays(asDateStr(course.ends_on), 1)
  const from = args.from ?? (afterCourse > today ? afterCourse : today)
  const to = addDays(from, args.days ?? 14)

  // Students enrolled and confirmed, who don't already have an upcoming drive from this course.
  const students = await many<Student & { has_drive: boolean }>(ctx.q,
    `select s.*, exists(select 1 from rs.lessons l where l.student_id = s.id and l.course_id = $2 and l.status in ('held','booked','completed')) as has_drive
       from rs.enrollments e join rs.students s on s.id = e.student_id
      where e.school_id = $1 and e.course_id = $2 and e.status = 'confirmed' order by s.last_name`, [ctx.school.id, course.id])
  const base = schoolPoint(ctx.school)
  // Hardest first: students farthest from the school get first pick of routes.
  const todo = students.filter((s) => !s.has_drive).sort((a, b) => dist(b) - dist(a))
  function dist(s: Student) {
    const p = toPoint(s.lat, s.lng)
    return p && base ? haversineKm(base, p) : 999
  }
  const extra: Record<string, Commitment[]> = {}
  const items: DrivePlanItem[] = []
  const unplaced: DrivePlan['unplaced'] = []
  for (const s of todo) {
    const blockers = lessonBlockers(ctx, s, service)
    if (blockers.length) { unplaced.push({ studentId: s.id, student: studentName(s), reason: `missing ${blockers.join(', ')}` }); continue }
    const pickup = toPoint(s.lat, s.lng)
    const slots = await findSlots(ctx, { service, pickup, studentId: s.id, from, to, extra, limit: 20 })
    const best = [...slots].sort((a, b) => a.addedTravel - b.addedTravel || +a.start - +b.start)[0]
    if (!best) { unplaced.push({ studentId: s.id, student: studentName(s), reason: 'no open time in the next two weeks' }); continue }
    ;(extra[best.instructorId] ??= []).push({ start: best.start, end: best.end, loc: pickup, label: `Lesson · ${s.first_name}` })
    items.push({ studentId: s.id, student: studentName(s), instructorId: best.instructorId, instructor: best.instructorName, start: best.start.toISOString(), label: best.label, addedTravel: best.addedTravel })
  }
  items.sort((a, b) => a.start.localeCompare(b.start))
  return { courseId: course.id, course: course.title, serviceCode: service.code, items, unplaced }
}

/** Book an approved plan. Each item is re-validated; anything that no longer fits is reported, not forced. */
export async function applyDrivePlan(ctx: Ctx, plan: DrivePlan, actor: Actor): Promise<{ booked: number; skipped: string[] }> {
  const service = (await getService(ctx, { code: plan.serviceCode })) as Service
  let booked = 0
  const skipped: string[] = []
  for (const it of plan.items) {
    await ctx.q.query('savepoint drive_item')
    try {
      const { lesson } = await holdLesson(ctx, { studentId: it.studentId, serviceId: service.id, instructorId: it.instructorId, start: new Date(it.start), contactId: null, actor, courseId: plan.courseId, prepaid: true })
      const s = (await getStudent(ctx, it.studentId))!
      await notifyFamily(ctx, s.id, `${s.first_name}'s behind-the-wheel lesson for ${plan.course} is booked: ${fmtWhen(asDate(lesson.starts_at), ctx.school.timezone)} with ${it.instructor}. Pickup at ${lesson.pickup_address}. Reply here if that time doesn't work.`, { reason: 'drive_plan' })
      booked++
      await ctx.q.query('release savepoint drive_item')
    } catch (err) {
      await ctx.q.query('rollback to savepoint drive_item')
      skipped.push(`${it.student}: ${(err as Error).message}`)
    }
  }
  await audit(ctx, actor, 'drive_plan.applied', { type: 'course', id: plan.courseId }, { booked, skipped })
  return { booked, skipped }
}
