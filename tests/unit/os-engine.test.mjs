// Roadsmith OS engine: scheduling, booking integrity, courses, payments, automations.
// Runs against a real in-memory Postgres (PGlite) seeded with synthetic data.
import assert from 'node:assert/strict'
import test from 'node:test'
import { openSandbox } from '../../src/lib/os/db.ts'
import { seedSandbox } from '../../src/lib/os/seed.ts'
import { schoolByPhone } from '../../src/lib/os/school.ts'
import { findSlots, checkSlot } from '../../src/lib/os/scheduling.ts'
import { applyPaymentEvent, enrollInCourse, getService, holdLesson, listCourses, registerStudent, cancelLesson } from '../../src/lib/os/bookings.ts'
import { runDueJobs, quietHoursDeferral } from '../../src/lib/os/automations.ts'
import { planCohortDrives, applyDrivePlan } from '../../src/lib/os/cohort.ts'
import { openInbox } from '../../src/lib/os/inbox.ts'
import { travelMinutes, locateAddress } from '../../src/lib/os/travel.ts'
import { addDays, localDate, zonedToUtc } from '../../src/lib/os/time.ts'
import { now } from '../../src/lib/os/clock.ts'
import { validTwilioSignature } from '../../src/lib/os/twilio.ts'
import { createHmac } from 'node:crypto'

const agent = { type: 'agent' }

async function fresh() {
  globalThis.__rsClockOffsetMs = 0
  const db = await openSandbox()
  await db.tx((q) => seedSandbox(q))
  const school = await schoolByPhone(db, '+16155550100')
  return { db, school, ctx: { q: db, school } }
}

async function oneRow(db, sql, params = []) {
  return (await db.query(sql, params)).rows[0]
}

async function newStudent(ctx, contactPhone = '+16155550177', zip = '37206') {
  const c = await oneRow(ctx.q, `insert into rs.contacts (school_id, name, phone, kind) values ($1,'Test Parent',$2,'parent') returning id`, [ctx.school.id, contactPhone])
  const { student } = await registerStudent(ctx, { contactId: c.id, relationship: 'parent', firstName: 'Test', lastName: `Kid${contactPhone.slice(-3)}`, dob: '2009-05-05', address: `12 Main St, Nashville, TN ${zip}`, permitNumber: 'TN12345678', actor: agent })
  return { contactId: c.id, student }
}

test('offered lesson times respect hours, notice, holidays, time off and travel', async () => {
  const { ctx, school } = await fresh()
  const svc = await getService(ctx, { code: 'LESSON60' })
  const { student } = await newStudent(ctx)
  const slots = await findSlots(ctx, { service: svc, pickup: { lat: student.lat, lng: student.lng }, studentId: student.id, limit: 50 })
  assert.ok(slots.length > 0, 'expected some open times')
  const tz = school.timezone
  const minStart = Date.now() + school.playbook.policies.min_notice_hours * 3600000
  for (const s of slots) {
    assert.ok(+s.start >= minStart - 1000, 'respects minimum notice')
    assert.ok(!school.playbook.closed_dates.includes(localDate(s.start, tz)), 'never on a closed date')
    const fit = await checkSlot(ctx, { service: svc, instructorId: s.instructorId, start: s.start, pickup: { lat: student.lat, lng: student.lng }, studentId: student.id })
    assert.equal(fit.ok, true, `re-validation agrees for ${s.label}`)
  }
  // John's seeded time off (day after tomorrow, 1–6pm) is never offered.
  const john = await oneRow(ctx.q, `select id from rs.staff where name = 'John Smith'`)
  const off = await oneRow(ctx.q, `select starts_at, ends_at from rs.time_off where staff_id = $1`, [john.id])
  assert.ok(!slots.some((s) => s.instructorId === john.id && s.start < off.ends_at && s.end > off.starts_at))
})

test('a time that leaves no room to drive from the previous pickup is rejected', async () => {
  const { ctx, school } = await fresh()
  const svc = await getService(ctx, { code: 'LESSON60' })
  const priya = await oneRow(ctx.q, `select id from rs.staff where name = 'Priya Shah'`)
  // Find a Wednesday-or-later day Priya works, put a lesson in Bellevue at 10:00, then try 11:00 in Inglewood.
  const tz = school.timezone
  const far = await newStudent(ctx, '+16155550178', '37221')
  let day = null
  for (let i = 2; i < 14 && !day; i++) {
    const d = addDays(localDate(now(), tz), i)
    if (![2, 3, 4, 5, 6].includes(new Date(d + 'T12:00:00Z').getUTCDay()) || school.playbook.closed_dates.includes(d)) continue
    const ok = await holdLesson(ctx, { studentId: far.student.id, serviceId: svc.id, instructorId: priya.id, start: zonedToUtc(d, 720, tz), contactId: far.contactId, actor: agent, prepaid: true }).then(() => true, () => false)
    if (ok) day = d
  }
  assert.ok(day, 'could place the Bellevue lesson on some working day')
  const near = await newStudent(ctx, '+16155550179', '37216')
  const fit = await checkSlot(ctx, { service: svc, instructorId: priya.id, start: zonedToUtc(day, 780, tz), pickup: { lat: near.student.lat, lng: near.student.lng }, studentId: near.student.id })
  assert.equal(fit.ok, false)
  assert.match(fit.reason, /needs \d+ min to drive/)
  assert.ok(travelMinutes({ lat: far.student.lat, lng: far.student.lng }, { lat: near.student.lat, lng: near.student.lng }, school.playbook) > 0)
})

test('the same slot cannot be booked twice, and the database blocks overlaps directly', async () => {
  const { ctx } = await fresh()
  const svc = await getService(ctx, { code: 'LESSON60' })
  const a = await newStudent(ctx, '+16155550181')
  const b = await newStudent(ctx, '+16155550182')
  const [slot] = await findSlots(ctx, { service: svc, pickup: { lat: a.student.lat, lng: a.student.lng }, studentId: a.student.id, limit: 1 })
  await holdLesson(ctx, { studentId: a.student.id, serviceId: svc.id, instructorId: slot.instructorId, start: slot.start, contactId: a.contactId, actor: agent })
  await assert.rejects(() => holdLesson(ctx, { studentId: b.student.id, serviceId: svc.id, instructorId: slot.instructorId, start: slot.start, contactId: b.contactId, actor: agent }), /no longer available|just taken/)
  await assert.rejects(() => ctx.q.query(`insert into rs.lessons (school_id, student_id, instructor_id, service_id, starts_at, ends_at, status) values ($1,$2,$3,$4,$5,$6,'booked')`,
    [ctx.school.id, b.student.id, slot.instructorId, svc.id, new Date(+slot.start + 15 * 60000), new Date(+slot.end + 15 * 60000)]), (e) => e.code === '23P01')
})

test('missing permit, address or guardian blocks booking with a clear list', async () => {
  const { ctx } = await fresh()
  const c = await oneRow(ctx.q, `insert into rs.contacts (school_id, phone, kind) values ($1,'+16155550190','student') returning id`, [ctx.school.id])
  const { student } = await registerStudent(ctx, { contactId: c.id, relationship: 'self', firstName: 'Solo', lastName: 'Teen', dob: '2010-01-01', actor: agent })
  const svc = await getService(ctx, { code: 'LESSON60' })
  const priya = await oneRow(ctx.q, `select id from rs.staff where name = 'Priya Shah'`)
  await assert.rejects(() => holdLesson(ctx, { studentId: student.id, serviceId: svc.id, instructorId: priya.id, start: new Date(Date.now() + 3 * 86400000), contactId: c.id, actor: agent }),
    /permit number.*pickup address.*parent or guardian/)
})

test('the last seat goes to one family; the next is offered the following class', async () => {
  const { ctx } = await fresh()
  const course = (await listCourses(ctx, { serviceCode: 'DRVED', upcomingOnly: true })).find((c) => c.seats_left === 1)
  assert.ok(course, 'seed has a course with one seat left')
  const a = await newStudent(ctx, '+16155550183')
  const b = await newStudent(ctx, '+16155550184')
  const first = await enrollInCourse(ctx, { studentId: a.student.id, courseId: course.id, contactId: a.contactId, actor: agent })
  assert.equal(first.status, 'reserved')
  assert.equal(first.payment.amount_cents, 10000)
  const second = await enrollInCourse(ctx, { studentId: b.student.id, courseId: course.id, contactId: b.contactId, actor: agent })
  assert.equal(second.status, 'full')
  assert.ok(second.alternatives.length >= 1 && second.alternatives[0].seats_left > 0)
  const again = await enrollInCourse(ctx, { studentId: a.student.id, courseId: course.id, contactId: a.contactId, actor: agent })
  assert.equal(again.status, 'already')
})

test('payment confirms the booking once; duplicates are ignored; failures retry then alert', async () => {
  const { ctx } = await fresh()
  const svc = await getService(ctx, { code: 'LESSON60' })
  const a = await newStudent(ctx, '+16155550185')
  const [slot] = await findSlots(ctx, { service: svc, pickup: { lat: a.student.lat, lng: a.student.lng }, studentId: a.student.id, limit: 1 })
  const { lesson, payment } = await holdLesson(ctx, { studentId: a.student.id, serviceId: svc.id, instructorId: slot.instructorId, start: slot.start, contactId: a.contactId, actor: agent })
  assert.equal(lesson.status, 'held')
  await applyPaymentEvent(ctx, { paymentId: payment.id, kind: 'failed', eventId: 'evt_f1', reason: 'card declined' })
  await applyPaymentEvent(ctx, { paymentId: payment.id, kind: 'failed', eventId: 'evt_f2', reason: 'card declined' })
  assert.ok((await openInbox(ctx)).some((i) => /Payment failing/.test(i.title)), 'two failures raise an alert')
  const ok = await applyPaymentEvent(ctx, { paymentId: payment.id, kind: 'paid', eventId: 'evt_p1' })
  assert.equal(ok.outcome, 'lesson booked')
  const dup = await applyPaymentEvent(ctx, { paymentId: payment.id, kind: 'paid', eventId: 'evt_p1' })
  assert.equal(dup.applied, false)
  assert.equal((await oneRow(ctx.q, `select status from rs.lessons where id = $1`, [lesson.id])).status, 'booked')
  const texts = (await ctx.q.query(`select body from rs.outbox where to_address = '+16155550185' order by created_at`)).rows.map((r) => r.body)
  assert.ok(texts.some((t) => /confirmed for/.test(t)))
})

test('unpaid holds are released by the scheduler; a late payment is escalated, not silently booked', async () => {
  const { db, ctx } = await fresh()
  const svc = await getService(ctx, { code: 'LESSON60' })
  const a = await newStudent(ctx, '+16155550186')
  const slots = await findSlots(ctx, { service: svc, pickup: { lat: a.student.lat, lng: a.student.lng }, studentId: a.student.id, limit: 10 })
  const slot = slots.find((s) => +s.start - Date.now() > 4 * 3600000)
  const { lesson, payment } = await holdLesson(ctx, { studentId: a.student.id, serviceId: svc.id, instructorId: slot.instructorId, start: slot.start, contactId: a.contactId, actor: agent })
  globalThis.__rsClockOffsetMs = (+new Date(payment.expires_at) - Date.now()) + 60000
  await runDueJobs(db, ctx.school.id)
  assert.equal((await oneRow(db, `select status from rs.lessons where id = $1`, [lesson.id])).status, 'cancelled')
  assert.equal((await oneRow(db, `select status from rs.payments where id = $1`, [payment.id])).status, 'expired')
  const late = await applyPaymentEvent(ctx, { paymentId: payment.id, kind: 'paid', eventId: 'evt_late' })
  assert.match(late.outcome, /escalated/)
  assert.ok((await openInbox(ctx)).some((i) => i.priority === 'urgent' && /hold expired/.test(i.title)))
  globalThis.__rsClockOffsetMs = 0
})

test('cohort drive plans group pickups, skip students missing a permit, and re-validate on apply', async () => {
  const { ctx } = await fresh()
  const course = (await listCourses(ctx, { serviceCode: 'DRVED' })).find((c) => c.status === 'completed')
  const plan = await planCohortDrives(ctx, { courseId: course.id })
  assert.ok(plan.items.length >= 5)
  assert.ok(plan.unplaced.some((u) => /permit/.test(u.reason)))
  const keys = plan.items.map((i) => `${i.instructorId}|${i.start}`)
  assert.equal(new Set(keys).size, keys.length, 'no two drives share an instructor and start time')
  const owner = { type: 'staff', id: 'x', label: 'Owner' }
  const r = await ctx.q.tx((q) => applyDrivePlan({ q, school: ctx.school }, plan, owner))
  assert.equal(r.booked, plan.items.length)
  const again = await ctx.q.tx((q) => applyDrivePlan({ q, school: ctx.school }, plan, owner))
  assert.equal(again.booked, 0, 're-applying a stale plan books nothing')
})

test('automatic texts wait for quiet hours to end', async () => {
  const { school } = await fresh()
  const tz = school.timezone
  const d = localDate(now(), tz)
  const late = zonedToUtc(d, 22 * 60, tz)
  const deferred = quietHoursDeferral({ school }, late)
  assert.equal(+deferred, +zonedToUtc(addDays(d, 1), 8 * 60, tz))
  assert.equal(quietHoursDeferral({ school }, zonedToUtc(d, 12 * 60, tz)), null)
})

test('cancelling a paid lesson keeps the money until the owner approves a refund', async () => {
  const { ctx } = await fresh()
  const lesson = await oneRow(ctx.q, `select l.id from rs.lessons l join rs.payments p on p.lesson_id = l.id where l.status = 'booked' and l.starts_at > now() + interval '30 hours' and p.status = 'paid' limit 1`)
  const r = await cancelLesson(ctx, { lessonId: lesson.id, reason: 'test', actor: agent })
  assert.ok(r.refundable)
  assert.equal((await oneRow(ctx.q, `select status from rs.payments where id = $1`, [r.refundable.id])).status, 'paid')
})

test('addresses are placed by ZIP zone; unknown addresses get the conservative buffer', async () => {
  const { school } = await fresh()
  assert.equal(locateAddress('9 Elm St, Nashville TN 37206', school).quality, 'approximate')
  const unknown = locateAddress('1 Nowhere Rd, Memphis TN 38103', school)
  assert.equal(unknown.quality, 'unknown')
  assert.equal(unknown.outOfArea, true)
  assert.equal(travelMinutes(null, { lat: 36.17, lng: -86.75 }, school.playbook), school.playbook.travel.unknown_location_min)
})

test('Twilio signatures are validated against the configured URL', () => {
  const url = 'https://example.test/api/os/sms/twilio'
  const params = { Body: 'hi', From: '+16155550101', To: '+16155550100' }
  const sig = createHmac('sha1', 'tok').update(url + 'Bodyhi' + 'From+16155550101' + 'To+16155550100').digest('base64')
  assert.equal(validTwilioSignature('tok', url, params, sig), true)
  assert.equal(validTwilioSignature('tok', url, { ...params, Body: 'changed' }, sig), false)
  assert.equal(validTwilioSignature('tok', url, params, null), false)
})
