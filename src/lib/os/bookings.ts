/**
 * Core operations: students, lesson holds and bookings, course enrollment,
 * payment outcomes, changes and completion. Each function is deterministic,
 * scoped to one school, audited, and safe to call from the agent, the
 * Control Center, or a provider webhook.
 */
import { many, one, pgCode } from './db.ts'
import { now } from './clock.ts'
import { audit, type Actor } from './audit.ts'
import { checkSlot, type Service } from './scheduling.ts'
import { createPayment, paymentLink, type Payment } from './payments.ts'
import { cancelJobs, scheduleJob } from './jobs.ts'
import { notifyContact, notifyFamily, notifyOwners, notifyStaff } from './messaging.ts'
import { asDate, asDateStr, fmtDateStr, fmtMoney, fmtWhen, localDate, minutesLabel } from './time.ts'
import { locateAddress, toPoint } from './travel.ts'
import { ageOn, OsError } from './util.ts'
import { schoolPoint, type Ctx } from './school.ts'

// ── Records ────────────────────────────────────────────────────────────────

export interface Student {
  id: string
  school_id: string
  first_name: string
  last_name: string
  dob: string | Date | null
  permit_number: string | null
  address: string | null
  lat: number | null
  lng: number | null
  location_quality: 'exact' | 'approximate' | 'unknown'
  guardian_contact_id: string | null
  student_contact_id: string | null
  driving_minutes: number
  classroom_hours: number
  notes: string
}

export interface Lesson {
  id: string
  school_id: string
  student_id: string
  instructor_id: string
  service_id: string
  starts_at: Date
  ends_at: Date
  pickup_address: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  status: 'held' | 'booked' | 'completed' | 'cancelled' | 'no_show'
  hold_expires_at: Date | null
  course_id: string | null
  instructor_notes: string
  completed_minutes: number | null
}

export interface Course {
  id: string
  service_id: string
  title: string
  starts_on: string | Date
  ends_on: string | Date
  schedule_note: string
  capacity: number
  location: string
  status: 'open' | 'closed' | 'completed'
}

export async function getService(ctx: Ctx, by: { id?: string; code?: string }): Promise<Service | null> {
  return one<Service>(ctx.q, `select * from rs.services where school_id = $1 and (id::text = $2 or code = $3)`,
    [ctx.school.id, by.id ?? '', (by.code ?? '').toUpperCase()])
}

export async function getStudent(ctx: Ctx, id: string): Promise<Student | null> {
  return one<Student>(ctx.q, `select * from rs.students where id = $1 and school_id = $2`, [id, ctx.school.id])
}

export async function studentsForContact(ctx: Ctx, contactId: string): Promise<Student[]> {
  return many<Student>(ctx.q,
    `select * from rs.students where school_id = $1 and (guardian_contact_id = $2 or student_contact_id = $2) order by first_name`,
    [ctx.school.id, contactId])
}

export function studentName(s: Pick<Student, 'first_name' | 'last_name'>) {
  return `${s.first_name} ${s.last_name}`.trim()
}

export function studentAge(ctx: Ctx, s: Pick<Student, 'dob'>): number | null {
  if (!s.dob) return null
  return ageOn(asDateStr(s.dob), localDate(now(), ctx.school.timezone))
}

/**
 * Register a student for a contact, or link to an existing record.
 * An existing record already linked to other people is never handed to a new
 * phone number: the office verifies it (privacy for minors).
 */
export async function registerStudent(ctx: Ctx, args: {
  contactId: string; relationship: 'parent' | 'self'; firstName: string; lastName: string; dob?: string | null;
  address?: string | null; permitNumber?: string | null; actor: Actor
}): Promise<{ student: Student; created: boolean; verifyNeeded?: boolean; note?: string }> {
  const first = args.firstName.trim(), last = args.lastName.trim()
  if (!first || !last) throw new OsError('invalid', 'A first and last name are needed.')
  if (args.dob && !/^\d{4}-\d{2}-\d{2}$/.test(args.dob)) throw new OsError('invalid', 'Date of birth must be YYYY-MM-DD.')
  const existing = args.dob
    ? await one<Student>(ctx.q, `select * from rs.students where school_id = $1 and lower(first_name) = lower($2) and lower(last_name) = lower($3) and dob = $4`,
      [ctx.school.id, first, last, args.dob])
    : null
  const loc = args.address ? locateAddress(args.address, ctx.school) : null
  if (existing) {
    const linked = [existing.guardian_contact_id, existing.student_contact_id].filter(Boolean)
    if (linked.includes(args.contactId)) return { student: existing, created: false }
    if (linked.length) return { student: existing, created: false, verifyNeeded: true, note: 'A student with this name and birth date is already on file with a different phone number.' }
  }
  const col = args.relationship === 'parent' ? 'guardian_contact_id' : 'student_contact_id'
  let student: Student
  if (existing) {
    student = (await one<Student>(ctx.q, `update rs.students set ${col} = $2,
        address = coalesce($3, address), lat = coalesce($4, lat), lng = coalesce($5, lng),
        location_quality = case when $3::text is null then location_quality else $6 end,
        permit_number = coalesce($7, permit_number)
      where id = $1 returning *`,
      [existing.id, args.contactId, args.address ?? null, loc?.lat ?? null, loc?.lng ?? null, loc?.quality ?? 'unknown', args.permitNumber ?? null]))!
  } else {
    student = (await one<Student>(ctx.q,
      `insert into rs.students (school_id, first_name, last_name, dob, address, lat, lng, location_quality, permit_number, ${col})
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [ctx.school.id, first, last, args.dob ?? null, args.address ?? null, loc?.lat ?? null, loc?.lng ?? null, loc?.quality ?? 'unknown', args.permitNumber ?? null, args.contactId]))!
  }
  await ctx.q.query(`update rs.contacts set kind = $2 where id = $1 and kind = 'lead'`, [args.contactId, args.relationship === 'parent' ? 'parent' : 'student'])
  await audit(ctx, args.actor, existing ? 'student.linked' : 'student.registered', { type: 'student', id: student.id }, { name: studentName(student), location: loc?.quality ?? 'none' })
  const note = loc?.outOfArea ? 'That address looks outside the service area.' : loc?.quality === 'unknown' && args.address ? 'Address could not be placed on the map; travel time will be padded.' : undefined
  return { student, created: !existing, note }
}

export async function updateStudent(ctx: Ctx, studentId: string, patch: { address?: string; permitNumber?: string; dob?: string }, actor: Actor): Promise<Student> {
  const s = await getStudent(ctx, studentId)
  if (!s) throw new OsError('not_found', 'Student not found.')
  const loc = patch.address ? locateAddress(patch.address, ctx.school) : null
  if (patch.dob && !/^\d{4}-\d{2}-\d{2}$/.test(patch.dob)) throw new OsError('invalid', 'Date of birth must be YYYY-MM-DD.')
  const out = (await one<Student>(ctx.q,
    `update rs.students set address = coalesce($2, address), lat = case when $2::text is null then lat else $3 end,
       lng = case when $2::text is null then lng else $4 end, location_quality = case when $2::text is null then location_quality else $5 end,
       permit_number = coalesce($6, permit_number), dob = coalesce($7::date, dob)
     where id = $1 returning *`,
    [studentId, patch.address ?? null, loc?.lat ?? null, loc?.lng ?? null, loc?.quality ?? 'unknown', patch.permitNumber ?? null, patch.dob ?? null]))!
  await audit(ctx, actor, 'student.updated', { type: 'student', id: studentId }, { fields: Object.keys(patch) })
  return out
}

export async function addGuardian(ctx: Ctx, studentId: string, name: string, phone: string, actor: Actor) {
  const c = (await one<{ id: string }>(ctx.q,
    `insert into rs.contacts (school_id, name, phone, kind) values ($1,$2,$3,'parent')
     on conflict (school_id, phone) do update set name = case when rs.contacts.name = '' then excluded.name else rs.contacts.name end, kind = 'parent'
     returning id`, [ctx.school.id, name, phone]))!
  await ctx.q.query(`update rs.students set guardian_contact_id = $2 where id = $1 and school_id = $3`, [studentId, c.id, ctx.school.id])
  await audit(ctx, actor, 'student.guardian_added', { type: 'student', id: studentId }, {})
  return c.id
}

/** Readiness checks before a student can be put in a car. */
export function lessonBlockers(ctx: Ctx, s: Student, service: Service): string[] {
  const out: string[] = []
  const pol = ctx.school.playbook.policies
  const age = studentAge(ctx, s)
  if (!s.dob) out.push('date of birth')
  if (service.min_age_years && age != null && age < service.min_age_years) out.push(`must be at least ${service.min_age_years}`)
  if (pol.permit_required_for_lessons && !s.permit_number) out.push("learner's permit number")
  if (service.pickup && !s.address) out.push('pickup address')
  if (pol.minor_needs_guardian && age != null && age < 18 && !s.guardian_contact_id) out.push('parent or guardian contact')
  return out
}

// ── Lessons ────────────────────────────────────────────────────────────────

export async function getLesson(ctx: Ctx, id: string): Promise<Lesson | null> {
  return one<Lesson>(ctx.q, `select * from rs.lessons where id = $1 and school_id = $2`, [id, ctx.school.id])
}

async function instructorName(ctx: Ctx, id: string) {
  return (await one<{ name: string }>(ctx.q, `select name from rs.staff where id = $1`, [id]))?.name ?? 'your instructor'
}

/**
 * Hold a lesson time for a student and create its payment request.
 * The hold blocks the slot until it's paid or the hold expires. If the
 * lesson costs nothing it is booked immediately.
 */
export async function holdLesson(ctx: Ctx, args: {
  studentId: string; serviceId: string; instructorId: string; start: Date; contactId: string | null; actor: Actor; courseId?: string; prepaid?: boolean
}): Promise<{ lesson: Lesson; payment: Payment | null }> {
  const service = await getService(ctx, { id: args.serviceId })
  if (!service || service.kind !== 'lesson') throw new OsError('invalid', 'That service is not a driving lesson.')
  const student = await getStudent(ctx, args.studentId)
  if (!student) throw new OsError('not_found', 'Student not found.')
  const blockers = lessonBlockers(ctx, student, service)
  if (blockers.length) throw new OsError('incomplete', `Before booking we still need: ${blockers.join(', ')}.`)
  const pickup = service.pickup ? toPoint(student.lat, student.lng) : schoolPoint(ctx.school)
  await lockScheduling(ctx, args.instructorId, student.id)
  const fit = await checkSlot(ctx, { service, instructorId: args.instructorId, start: args.start, pickup, studentId: student.id })
  if (!fit.ok) throw new OsError('conflict', `That time is no longer available (${fit.reason}).`)
  const end = new Date(+args.start + service.duration_min * 60000)
  const free = args.prepaid || service.price_cents === 0
  // A hold never outlives the lesson: it ends at the hold window or an hour before the start, whichever is first.
  const holdUntil = free ? null : new Date(Math.min(+now() + ctx.school.playbook.policies.hold_minutes * 60000, +args.start - 3600000))
  let lesson: Lesson
  try {
    lesson = (await one<Lesson>(ctx.q,
      `insert into rs.lessons (school_id, student_id, instructor_id, service_id, starts_at, ends_at, pickup_address, pickup_lat, pickup_lng, status, hold_expires_at, course_id, created_by, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
      [ctx.school.id, student.id, args.instructorId, service.id, args.start, end, service.pickup ? student.address : ctx.school.address,
        pickup?.lat ?? null, pickup?.lng ?? null, free ? 'booked' : 'held', holdUntil, args.courseId ?? null, args.actor.type, now()]))!
  } catch (err) {
    if (pgCode(err) === '23P01') throw new OsError('conflict', 'That time was just taken.')
    throw err
  }
  const when = fmtWhen(lesson.starts_at, ctx.school.timezone)
  let payment: Payment | null = null
  if (!free) {
    payment = await createPayment(ctx, {
      contactId: args.contactId, studentId: student.id, purpose: 'lesson', lessonId: lesson.id,
      description: `${service.name} for ${student.first_name} — ${when}`, amountCents: service.price_cents, expiresAt: holdUntil,
    })
    await scheduleJob(ctx, 'hold_expiry', holdUntil!, { lessonId: lesson.id }, `hold:lesson:${lesson.id}`)
  } else {
    await afterLessonBooked(ctx, lesson)
  }
  await audit(ctx, args.actor, free ? 'lesson.booked' : 'lesson.held', { type: 'lesson', id: lesson.id }, { student: studentName(student), when, instructor: await instructorName(ctx, args.instructorId) })
  return { lesson, payment }
}

async function afterLessonBooked(ctx: Ctx, lesson: Lesson) {
  const pb = ctx.school.playbook
  const remindAt = new Date(+asDate(lesson.starts_at) - pb.messaging.reminder_hours_before * 3600000)
  if (remindAt > now()) await scheduleJob(ctx, 'lesson_reminder', remindAt, { lessonId: lesson.id }, `remind:lesson:${lesson.id}`)
  const s = await getStudent(ctx, lesson.student_id)
  if (s) {
    await notifyStaff(ctx, lesson.instructor_id,
      `New lesson: ${studentName(s)}, ${fmtWhen(asDate(lesson.starts_at), ctx.school.timezone)}. Pickup: ${lesson.pickup_address ?? 'at the school'}.`,
      { reason: 'lesson_booked' })
  }
}

/** Move a lesson to a new time (policy is enforced by the caller: agent tool or owner). */
export async function moveLesson(ctx: Ctx, args: { lessonId: string; start: Date; instructorId?: string; actor: Actor; notify?: boolean }): Promise<Lesson> {
  const lesson = await getLesson(ctx, args.lessonId)
  if (!lesson || !['held', 'booked'].includes(lesson.status)) throw new OsError('not_found', 'That lesson cannot be moved.')
  const service = (await getService(ctx, { id: lesson.service_id }))!
  const instructorId = args.instructorId ?? lesson.instructor_id
  const pickup = toPoint(lesson.pickup_lat, lesson.pickup_lng)
  await lockScheduling(ctx, instructorId, lesson.student_id)
  const fit = await checkSlot(ctx, { service, instructorId, start: args.start, pickup, studentId: lesson.student_id, excludeLessonId: lesson.id })
  if (!fit.ok) throw new OsError('conflict', `That time doesn't work (${fit.reason}).`)
  const end = new Date(+args.start + service.duration_min * 60000)
  const before = fmtWhen(asDate(lesson.starts_at), ctx.school.timezone)
  let moved: Lesson
  try {
    moved = (await one<Lesson>(ctx.q, `update rs.lessons set starts_at = $2, ends_at = $3, instructor_id = $4 where id = $1 returning *`,
      [lesson.id, args.start, end, instructorId]))!
  } catch (err) {
    if (pgCode(err) === '23P01') throw new OsError('conflict', 'That time was just taken.')
    throw err
  }
  const after = fmtWhen(asDate(moved.starts_at), ctx.school.timezone)
  if (moved.status === 'held' && moved.hold_expires_at) {
    const cap = new Date(Math.min(+asDate(moved.hold_expires_at), +asDate(moved.starts_at) - 3600000))
    await ctx.q.query(`update rs.lessons set hold_expires_at = $2 where id = $1`, [moved.id, cap])
    await ctx.q.query(`update rs.payments set expires_at = $2, description = $3 where lesson_id = $1 and status in ('pending','failed')`, [moved.id, cap, `${service.name} — ${after}`])
    await scheduleJob(ctx, 'hold_expiry', cap, { lessonId: moved.id }, `hold:lesson:${moved.id}`)
  }
  await cancelJobs(ctx, `remind:lesson:${lesson.id}`)
  if (moved.status === 'booked') {
    const remindAt = new Date(+asDate(moved.starts_at) - ctx.school.playbook.messaging.reminder_hours_before * 3600000)
    if (remindAt > now()) await scheduleJob(ctx, 'lesson_reminder', remindAt, { lessonId: lesson.id }, `remind:lesson:${lesson.id}`)
  }
  const s = await getStudent(ctx, lesson.student_id)
  await notifyStaff(ctx, instructorId, `Lesson moved: ${s ? studentName(s) : 'student'} from ${before} to ${after}.`, { reason: 'lesson_moved' })
  if (instructorId !== lesson.instructor_id) await notifyStaff(ctx, lesson.instructor_id, `${s ? studentName(s) : 'A student'}'s lesson on ${before} was reassigned.`, { reason: 'lesson_moved' })
  if (args.notify && s) await notifyFamily(ctx, s.id, `${s.first_name}'s driving lesson has moved to ${after} with ${await instructorName(ctx, instructorId)}.`, { reason: 'lesson_moved' })
  await audit(ctx, args.actor, 'lesson.moved', { type: 'lesson', id: lesson.id }, { from: before, to: after })
  return moved
}

/**
 * Transaction-scoped advisory locks on the instructor and student, taken before
 * re-validating a slot. Two concurrent bookings that would each pass the travel
 * check alone are serialised, so the second sees the first. (Exact overlaps are
 * also rejected by the database's exclusion constraints.)
 */
async function lockScheduling(ctx: Ctx, instructorId: string, studentId: string) {
  for (const key of [`instr:${instructorId}`, `student:${studentId}`].sort()) {
    await ctx.q.query(`select pg_advisory_xact_lock(hashtext($1))`, [key])
  }
}

export function changeWindow(ctx: Ctx, lesson: Pick<Lesson, 'starts_at'>): { hoursUntil: number; inside: boolean } {
  const hoursUntil = (+asDate(lesson.starts_at) - +now()) / 3600000
  return { hoursUntil, inside: hoursUntil < ctx.school.playbook.policies.cancellation_hours }
}

export async function cancelLesson(ctx: Ctx, args: { lessonId: string; reason: string; actor: Actor; notifyFamily?: boolean }): Promise<{ lesson: Lesson; refundable: Payment | null }> {
  const lesson = await getLesson(ctx, args.lessonId)
  if (!lesson || !['held', 'booked'].includes(lesson.status)) throw new OsError('not_found', 'That lesson is not active.')
  const out = (await one<Lesson>(ctx.q, `update rs.lessons set status = 'cancelled', cancelled_reason = $2 where id = $1 returning *`, [lesson.id, args.reason]))!
  await cancelJobs(ctx, `remind:lesson:${lesson.id}`)
  await cancelJobs(ctx, `hold:lesson:${lesson.id}`)
  await ctx.q.query(`update rs.payments set status = 'cancelled' where lesson_id = $1 and status in ('pending','failed')`, [lesson.id])
  const paid = await one<Payment>(ctx.q, `select * from rs.payments where lesson_id = $1 and status = 'paid' order by paid_at desc limit 1`, [lesson.id])
  const when = fmtWhen(asDate(lesson.starts_at), ctx.school.timezone)
  const s = await getStudent(ctx, lesson.student_id)
  if (lesson.status === 'booked') await notifyStaff(ctx, lesson.instructor_id, `Cancelled: ${s ? studentName(s) : 'lesson'} on ${when}. That time is open again.`, { reason: 'lesson_cancelled' })
  if (args.notifyFamily && s) await notifyFamily(ctx, s.id, `${s.first_name}'s lesson on ${when} has been cancelled.`, { reason: 'lesson_cancelled' })
  await audit(ctx, args.actor, 'lesson.cancelled', { type: 'lesson', id: lesson.id }, { when, reason: args.reason, paid: Boolean(paid) })
  return { lesson: out, refundable: paid }
}

export async function completeLesson(ctx: Ctx, args: { lessonId: string; minutes?: number; notes?: string; actor: Actor }): Promise<Lesson> {
  const lesson = await getLesson(ctx, args.lessonId)
  if (!lesson || lesson.status !== 'booked') throw new OsError('not_found', 'That lesson is not an active booking.')
  if (asDate(lesson.starts_at) > now()) throw new OsError('invalid', "That lesson hasn't started yet.")
  const planned = Math.round((+asDate(lesson.ends_at) - +asDate(lesson.starts_at)) / 60000)
  const minutes = Math.max(5, Math.min(args.minutes ?? planned, 600))
  const out = (await one<Lesson>(ctx.q,
    `update rs.lessons set status = 'completed', completed_minutes = $2, instructor_notes = $3 where id = $1 returning *`,
    [lesson.id, minutes, (args.notes ?? '').slice(0, 2000)]))!
  await ctx.q.query(`update rs.students set driving_minutes = driving_minutes + $2 where id = $1`, [lesson.student_id, minutes])
  const s = (await getStudent(ctx, lesson.student_id))!
  if (ctx.school.playbook.messaging.send_progress_to_parents) {
    const notes = args.notes?.trim() ? ` Instructor notes: ${args.notes.trim()}` : ''
    await notifyFamily(ctx, s.id, `${s.first_name} finished a ${minutesLabel(minutes)} lesson today (${minutesLabel(s.driving_minutes)} behind the wheel so far).${notes}`, { reason: 'progress' })
  }
  await audit(ctx, args.actor, 'lesson.completed', { type: 'lesson', id: lesson.id }, { student: studentName(s), minutes })
  return out
}

export async function markNoShow(ctx: Ctx, lessonId: string, actor: Actor): Promise<Lesson> {
  const lesson = await getLesson(ctx, lessonId)
  if (!lesson || lesson.status !== 'booked') throw new OsError('not_found', 'That lesson is not an active booking.')
  const out = (await one<Lesson>(ctx.q, `update rs.lessons set status = 'no_show' where id = $1 returning *`, [lessonId]))!
  const s = await getStudent(ctx, lesson.student_id)
  await audit(ctx, actor, 'lesson.no_show', { type: 'lesson', id: lessonId }, { student: s ? studentName(s) : '' })
  await notifyOwners(ctx, `No-show: ${s ? studentName(s) : 'a student'} missed ${fmtWhen(asDate(lesson.starts_at), ctx.school.timezone)}.`, { reason: 'no_show' })
  return out
}

// ── Courses ────────────────────────────────────────────────────────────────

export interface CourseAvailability extends Course { seats_taken: number; seats_left: number; service_code: string; price_cents: number; deposit_cents: number }

export async function listCourses(ctx: Ctx, opts: { serviceCode?: string; upcomingOnly?: boolean } = {}): Promise<CourseAvailability[]> {
  const rows = await many<CourseAvailability>(ctx.q,
    `select c.*, sv.code as service_code, sv.price_cents, sv.deposit_cents,
       (select count(*)::int from rs.enrollments e where e.course_id = c.id
          and (e.status = 'confirmed' or (e.status = 'reserved' and e.hold_expires_at > $2))) as seats_taken
     from rs.courses c join rs.services sv on sv.id = c.service_id
    where c.school_id = $1 and ($3::text is null or sv.code = $3) and ($4::boolean is false or c.starts_on >= $5::date)
    order by c.starts_on`,
    [ctx.school.id, now(), opts.serviceCode?.toUpperCase() ?? null, opts.upcomingOnly ?? false, localDate(now(), ctx.school.timezone)])
  return rows.map((r) => ({ ...r, seats_left: Math.max(0, r.capacity - r.seats_taken) }))
}

export function courseLabel(c: Pick<Course, 'title' | 'starts_on' | 'ends_on' | 'schedule_note'>) {
  return `${c.title} (${fmtDateStr(asDateStr(c.starts_on))} – ${fmtDateStr(asDateStr(c.ends_on))}${c.schedule_note ? `, ${c.schedule_note}` : ''})`
}

/**
 * Reserve a seat. Seats are counted under a row lock so two families can't
 * take the last seat. A full course returns the next courses with room.
 */
export async function enrollInCourse(ctx: Ctx, args: { studentId: string; courseId: string; contactId: string | null; actor: Actor }):
  Promise<{ status: 'reserved' | 'confirmed' | 'full' | 'already'; enrollmentId?: string; payment?: Payment | null; alternatives?: CourseAvailability[] }> {
  const course = await one<Course & { service_id: string }>(ctx.q, `select * from rs.courses where id = $1 and school_id = $2 for update`, [args.courseId, ctx.school.id])
  if (!course) throw new OsError('not_found', 'Course not found.')
  if (course.status !== 'open' || asDateStr(course.starts_on) < localDate(now(), ctx.school.timezone)) throw new OsError('invalid', 'That course is no longer taking enrollments.')
  const student = await getStudent(ctx, args.studentId)
  if (!student) throw new OsError('not_found', 'Student not found.')
  const service = (await getService(ctx, { id: course.service_id }))!
  const age = studentAge(ctx, student)
  if (!student.dob) throw new OsError('incomplete', "We need the student's date of birth before enrolling.")
  if (service.min_age_years && age != null && age < service.min_age_years) throw new OsError('invalid', `Students must be at least ${service.min_age_years} for this course.`)
  if (ctx.school.playbook.policies.minor_needs_guardian && age != null && age < 18 && !student.guardian_contact_id) throw new OsError('incomplete', 'A parent or guardian contact is needed for students under 18.')
  const already = await one<{ id: string }>(ctx.q, `select id from rs.enrollments where course_id = $1 and student_id = $2 and status <> 'cancelled'`, [course.id, student.id])
  if (already) return { status: 'already', enrollmentId: already.id }
  const taken = (await one<{ n: number }>(ctx.q,
    `select count(*)::int as n from rs.enrollments where course_id = $1 and (status = 'confirmed' or (status = 'reserved' and hold_expires_at > $2))`,
    [course.id, now()]))!.n
  if (taken >= course.capacity) {
    const alternatives = (await listCourses(ctx, { serviceCode: service.code, upcomingOnly: true })).filter((c) => c.id !== course.id && c.seats_left > 0 && c.status === 'open').slice(0, 2)
    await audit(ctx, args.actor, 'course.full_offered_next', { type: 'course', id: course.id }, { student: studentName(student), alternatives: alternatives.map((a) => a.title) })
    return { status: 'full', alternatives }
  }
  const amount = service.deposit_cents > 0 ? service.deposit_cents : service.price_cents
  const free = amount === 0
  const holdUntil = free ? null : new Date(+now() + ctx.school.playbook.policies.hold_minutes * 60000)
  const enr = (await one<{ id: string }>(ctx.q,
    `insert into rs.enrollments (school_id, course_id, student_id, status, hold_expires_at, created_at) values ($1,$2,$3,$4,$5,$6) returning id`,
    [ctx.school.id, course.id, student.id, free ? 'confirmed' : 'reserved', holdUntil, now()]))!
  let payment: Payment | null = null
  if (!free) {
    payment = await createPayment(ctx, {
      contactId: args.contactId, studentId: student.id, enrollmentId: enr.id,
      purpose: service.deposit_cents > 0 ? 'course_deposit' : 'course_tuition',
      description: `${service.deposit_cents > 0 ? 'Deposit' : 'Tuition'}: ${course.title} for ${student.first_name}`, amountCents: amount, expiresAt: holdUntil,
    })
    await scheduleJob(ctx, 'hold_expiry', holdUntil!, { enrollmentId: enr.id }, `hold:enrollment:${enr.id}`)
  } else {
    await afterEnrollmentConfirmed(ctx, enr.id)
  }
  await audit(ctx, args.actor, free ? 'enrollment.confirmed' : 'enrollment.reserved', { type: 'enrollment', id: enr.id }, { student: studentName(student), course: course.title })
  return { status: free ? 'confirmed' : 'reserved', enrollmentId: enr.id, payment }
}

async function afterEnrollmentConfirmed(ctx: Ctx, enrollmentId: string) {
  const row = await one<{ course_id: string; starts_on: string; title: string }>(ctx.q,
    `select c.id as course_id, c.starts_on, c.title from rs.enrollments e join rs.courses c on c.id = e.course_id where e.id = $1`, [enrollmentId])
  if (!row) return
  const first = await one<{ starts_at: Date }>(ctx.q, `select starts_at from rs.course_sessions where course_id = $1 order by starts_at limit 1`, [row.course_id])
  if (first) {
    const at = new Date(+asDate(first.starts_at) - 24 * 3600000)
    if (at > now()) await scheduleJob(ctx, 'course_reminder', at, { courseId: row.course_id }, `remind:course:${row.course_id}`)
    const balAt = new Date(+asDate(first.starts_at) - 72 * 3600000)
    await scheduleJob(ctx, 'balance_reminder', balAt > now() ? balAt : new Date(+now() + 3600000), { enrollmentId }, `balance:${enrollmentId}`)
  }
}

export async function cancelEnrollment(ctx: Ctx, enrollmentId: string, reason: string, actor: Actor) {
  const e = await one<{ id: string; status: string; course_id: string }>(ctx.q, `select id, status, course_id from rs.enrollments where id = $1 and school_id = $2`, [enrollmentId, ctx.school.id])
  if (!e || e.status === 'cancelled') throw new OsError('not_found', 'Enrollment not active.')
  await ctx.q.query(`update rs.enrollments set status = 'cancelled' where id = $1`, [enrollmentId])
  await ctx.q.query(`update rs.payments set status = 'cancelled' where enrollment_id = $1 and status in ('pending','failed')`, [enrollmentId])
  await cancelJobs(ctx, `hold:enrollment:${enrollmentId}`)
  await cancelJobs(ctx, `balance:${enrollmentId}`)
  await audit(ctx, actor, 'enrollment.cancelled', { type: 'enrollment', id: enrollmentId }, { reason })
}

/** What a family still owes for a student's confirmed courses. */
export async function studentBalance(ctx: Ctx, studentId: string): Promise<{ owedCents: number; items: { enrollmentId: string; course: string; owedCents: number }[] }> {
  const rows = await many<{ enrollment_id: string; title: string; price_cents: number; paid: number }>(ctx.q,
    `select e.id as enrollment_id, c.title, sv.price_cents,
        coalesce((select sum(amount_cents) from rs.payments p where p.enrollment_id = e.id and p.status = 'paid'), 0)::int as paid
       from rs.enrollments e join rs.courses c on c.id = e.course_id join rs.services sv on sv.id = c.service_id
      where e.school_id = $1 and e.student_id = $2 and e.status = 'confirmed'`, [ctx.school.id, studentId])
  const items = rows.map((r) => ({ enrollmentId: r.enrollment_id, course: r.title, owedCents: Math.max(0, r.price_cents - r.paid) })).filter((i) => i.owedCents > 0)
  return { owedCents: items.reduce((a, b) => a + b.owedCents, 0), items }
}

/** Reuse a pending balance request or create one. */
export async function balancePayment(ctx: Ctx, enrollmentId: string, contactId: string | null): Promise<Payment | null> {
  const existing = await one<Payment>(ctx.q, `select * from rs.payments where enrollment_id = $1 and purpose = 'balance' and status in ('pending','failed') order by created_at desc limit 1`, [enrollmentId])
  const row = await one<{ student_id: string; title: string; price_cents: number; paid: number; first_name: string }>(ctx.q,
    `select e.student_id, c.title, sv.price_cents, s.first_name,
        coalesce((select sum(amount_cents) from rs.payments p where p.enrollment_id = e.id and p.status = 'paid'), 0)::int as paid
       from rs.enrollments e join rs.courses c on c.id = e.course_id join rs.services sv on sv.id = c.service_id join rs.students s on s.id = e.student_id
      where e.id = $1 and e.school_id = $2 and e.status = 'confirmed'`, [enrollmentId, ctx.school.id])
  if (!row) return null
  const owed = row.price_cents - row.paid
  if (owed <= 0) return null
  if (existing && existing.amount_cents === owed) return existing
  if (existing) await ctx.q.query(`update rs.payments set status = 'cancelled' where id = $1`, [existing.id])
  return createPayment(ctx, { contactId, studentId: row.student_id, enrollmentId, purpose: 'balance', description: `Balance: ${row.title} for ${row.first_name}`, amountCents: owed })
}

// ── Payment outcomes ───────────────────────────────────────────────────────

/**
 * Apply a verified provider event (Stripe webhook or sandbox checkout).
 * Idempotent on eventId. Never trusts anything but the payment row it loads.
 */
export async function applyPaymentEvent(ctx: Ctx, args: { paymentId: string; kind: 'paid' | 'failed'; eventId: string; reason?: string; providerRef?: string }):
  Promise<{ applied: boolean; payment: Payment; outcome: string }> {
  const payment = await one<Payment>(ctx.q, `select * from rs.payments where id = $1 and school_id = $2 for update`, [args.paymentId, ctx.school.id])
  if (!payment) throw new OsError('not_found', 'Payment not found.')
  const dup = await one(ctx.q, `insert into rs.payment_events (school_id, payment_id, provider_event_id, type, created_at) values ($1,$2,$3,$4,$5)
    on conflict (provider_event_id) do nothing returning id`, [ctx.school.id, payment.id, args.eventId, args.kind, now()])
  if (!dup) return { applied: false, payment, outcome: 'duplicate event ignored' }
  const actor: Actor = { type: 'provider', label: payment.provider === 'stripe' ? 'Stripe' : 'Sandbox checkout' }
  const amount = fmtMoney(payment.amount_cents, payment.currency)

  if (args.kind === 'failed') {
    // Only an open request can fail; never revive a cancelled, expired or refunded one.
    if (!['pending', 'failed'].includes(payment.status)) return { applied: false, payment, outcome: `ignored (payment is ${payment.status})` }
    const upd = (await one<Payment>(ctx.q, `update rs.payments set status = 'failed', attempts = attempts + 1, failure_reason = $2 where id = $1 returning *`,
      [payment.id, args.reason ?? 'declined']))!
    await audit(ctx, actor, 'payment.failed', { type: 'payment', id: payment.id }, { amount, reason: args.reason ?? 'declined', attempts: upd.attempts })
    if (payment.contact_id) {
      await notifyContact(ctx, payment.contact_id, `That payment of ${amount} didn't go through (${args.reason ?? 'card declined'}). Nothing was charged. You can try again here: ${paymentLink(payment)}`, { reason: 'payment_failed' })
    }
    if (upd.attempts >= 2) {
      const { createInbox } = await import('./inbox.ts')
      await createInbox(ctx, { kind: 'alert', title: `Payment failing: ${payment.description}`, detail: `${upd.attempts} failed attempts (${args.reason ?? 'declined'}). The family has a fresh link; you may want to call them.` })
    }
    return { applied: true, payment: upd, outcome: 'failed' }
  }

  if (['paid', 'refund_pending', 'refunded'].includes(payment.status)) {
    // A second successful charge for the same request (e.g. two checkout tabs) must not vanish.
    if (args.providerRef && payment.provider_ref && args.providerRef !== payment.provider_ref) {
      const { createInbox } = await import('./inbox.ts')
      await createInbox(ctx, { kind: 'alert', priority: 'urgent', title: `Possible double payment: ${payment.description}`,
        detail: `A second successful payment (${args.providerRef}) arrived for a request already marked ${payment.status} (${payment.provider_ref}). Refund the duplicate in Stripe.` })
      return { applied: false, payment, outcome: 'duplicate charge escalated' }
    }
    return { applied: false, payment, outcome: `already ${payment.status}` }
  }
  const paid = (await one<Payment>(ctx.q, `update rs.payments set status = 'paid', paid_at = $2, provider_ref = coalesce($3, provider_ref) where id = $1 returning *`,
    [payment.id, now(), args.providerRef ?? null]))!
  await audit(ctx, actor, 'payment.paid', { type: 'payment', id: payment.id }, { amount, description: payment.description })
  let outcome = 'paid'

  if (payment.lesson_id) {
    const lesson = await getLesson(ctx, payment.lesson_id)
    const tz = ctx.school.timezone
    if (lesson?.status === 'held') {
      const booked = (await one<Lesson>(ctx.q, `update rs.lessons set status = 'booked', hold_expires_at = null where id = $1 returning *`, [lesson.id]))!
      await cancelJobs(ctx, `hold:lesson:${lesson.id}`)
      await afterLessonBooked(ctx, booked)
      const s = await getStudent(ctx, lesson.student_id)
      const who = await instructorName(ctx, lesson.instructor_id)
      if (payment.contact_id) await notifyContact(ctx, payment.contact_id,
        `Payment received (${amount}). ${s?.first_name ?? 'Your'}'s lesson is confirmed for ${fmtWhen(asDate(lesson.starts_at), tz)} with ${who}. Pickup: ${lesson.pickup_address ?? 'at the school'}.`, { reason: 'booking_confirmed' })
      outcome = 'lesson booked'
    } else if (lesson) {
      // Paid after the hold lapsed: never pretend the slot is still theirs.
      const { createInbox } = await import('./inbox.ts')
      await createInbox(ctx, { kind: 'alert', priority: 'urgent', title: `Paid after hold expired: ${payment.description}`,
        detail: `The lesson time was released before ${amount} arrived. Rebook the family or refund the payment.`,
        action: { type: 'refund_payment', args: { paymentId: payment.id } } })
      if (payment.contact_id) await notifyContact(ctx, payment.contact_id, `We received your payment of ${amount}, but that lesson time had already been released. The office has been notified and will rebook or refund you — no action needed.`, { reason: 'paid_after_expiry' })
      outcome = 'paid after hold expired (escalated)'
    }
  } else if (payment.enrollment_id) {
    const e = await one<{ id: string; status: string; course_id: string; student_id: string }>(ctx.q, `select * from rs.enrollments where id = $1`, [payment.enrollment_id])
    const course = e ? await one<Course>(ctx.q, `select * from rs.courses where id = $1`, [e.course_id]) : null
    if (e && course && payment.purpose !== 'balance') {
      if (e.status === 'reserved') {
        await ctx.q.query(`update rs.enrollments set status = 'confirmed', hold_expires_at = null where id = $1`, [e.id])
        await cancelJobs(ctx, `hold:enrollment:${e.id}`)
        await afterEnrollmentConfirmed(ctx, e.id)
        const bal = await studentBalance(ctx, e.student_id)
        const balNote = bal.owedCents > 0 ? ` Remaining balance: ${fmtMoney(bal.owedCents, payment.currency)}, due before the course starts — we'll send a reminder.` : ''
        if (payment.contact_id) await notifyContact(ctx, payment.contact_id, `Payment received (${amount}). Seat confirmed: ${courseLabel(course)} at ${course.location}.${balNote}`, { reason: 'enrollment_confirmed' })
        outcome = 'enrollment confirmed'
      } else if (e.status === 'cancelled') {
        const { createInbox } = await import('./inbox.ts')
        await createInbox(ctx, { kind: 'alert', priority: 'urgent', title: `Paid after seat hold expired: ${payment.description}`,
          detail: `The seat was released before ${amount} arrived. Re-enroll the student if there is room, or refund.`,
          action: { type: 'refund_payment', args: { paymentId: payment.id } } })
        if (payment.contact_id) await notifyContact(ctx, payment.contact_id, `We received your payment of ${amount}, but the seat hold had expired. The office will confirm a seat or refund you shortly.`, { reason: 'paid_after_expiry' })
        outcome = 'paid after hold expired (escalated)'
      }
    } else if (payment.purpose === 'balance' && payment.contact_id) {
      await cancelJobs(ctx, `balance:${payment.enrollment_id}`)
      await notifyContact(ctx, payment.contact_id, `Thank you — balance payment of ${amount} received. You're all paid up.`, { reason: 'balance_paid' })
      outcome = 'balance paid'
    }
  }
  return { applied: true, payment: paid, outcome }
}

/** Mark a payment refunded (provider refund happens in the caller, outside the transaction). */
export async function markRefunded(ctx: Ctx, paymentId: string, actor: Actor): Promise<Payment> {
  const p = await one<Payment>(ctx.q, `select * from rs.payments where id = $1 and school_id = $2 for update`, [paymentId, ctx.school.id])
  if (!p || !['paid', 'refund_pending'].includes(p.status)) throw new OsError('invalid', 'Only a paid payment can be refunded.')
  const out = (await one<Payment>(ctx.q, `update rs.payments set status = 'refunded' where id = $1 returning *`, [paymentId]))!
  await audit(ctx, actor, 'payment.refunded', { type: 'payment', id: paymentId }, { amount: fmtMoney(p.amount_cents, p.currency) })
  if (p.contact_id) await notifyContact(ctx, p.contact_id, `Your refund of ${fmtMoney(p.amount_cents, p.currency)} (${p.description}) has been issued. It can take 5–10 business days to appear.`, { reason: 'refund' })
  return out
}
