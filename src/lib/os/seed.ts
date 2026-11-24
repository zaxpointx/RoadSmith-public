/**
 * Synthetic sandbox data. Every person, phone number (555-01xx/02xx range)
 * and school here is fictional. Dates are relative to "today" so the demo
 * always looks current. A second school exists to prove tenant isolation.
 */
import type { Q } from './db.ts'
import { now } from './clock.ts'
import { addDays, localDate, zonedToUtc } from './time.ts'
import { token } from './util.ts'
import type { Playbook } from './playbook.ts'

const ZONES = [
  { name: 'East Nashville', zips: ['37206'], lat: 36.1782, lng: -86.748 },
  { name: 'Inglewood', zips: ['37216'], lat: 36.215, lng: -86.729 },
  { name: 'Germantown', zips: ['37208'], lat: 36.177, lng: -86.798 },
  { name: 'Downtown', zips: ['37201', '37203', '37219'], lat: 36.158, lng: -86.78 },
  { name: '12 South', zips: ['37204', '37212'], lat: 36.125, lng: -86.789 },
  { name: 'Sylvan Park', zips: ['37209'], lat: 36.153, lng: -86.853 },
  { name: 'Donelson', zips: ['37214'], lat: 36.165, lng: -86.667 },
  { name: 'Madison', zips: ['37115'], lat: 36.256, lng: -86.714 },
  { name: 'Antioch', zips: ['37013'], lat: 36.06, lng: -86.672 },
  { name: 'Bellevue', zips: ['37221'], lat: 36.07, lng: -86.933 },
]

export const LARKSPUR_PLAYBOOK: Partial<Playbook> & Record<string, unknown> = {
  about: 'Larkspur Driving School is a family-run driving school in East Nashville. We teach teens and adults in dual-control Toyota Corollas, with free home pickup across Nashville.',
  office_hours: 'Mon–Fri 9am–6pm, Sat 9am–1pm. Texts are answered any time by our assistant.',
  owner_note: 'Warm, brief, and clear. We talk to nervous teens and busy parents.',
  policies: {
    cancellation_hours: 24, late_cancel_fee_cents: 3500, hold_minutes: 120, min_notice_hours: 12,
    permit_required_for_lessons: true, minor_needs_guardian: true, booking_window_days: 21, max_lessons_per_week: 3,
  },
  faqs: [
    { q: 'What should the student bring?', a: "Their learner's permit, glasses or contacts if they need them, and closed-toe shoes." },
    { q: 'What cars do you use?', a: 'Dual-control Toyota Corollas with an instructor brake. Students never need their own car.' },
    { q: 'Where do you pick up?', a: 'Free pickup and drop-off at home or school anywhere in our Nashville service area (East Nashville, Inglewood, Germantown, Downtown, 12 South, Sylvan Park, Donelson, Madison). Antioch and Bellevue are a longer drive, so we schedule around it.' },
    { q: 'How do I pay?', a: 'By card through a secure payment link we text you. We never take card numbers by text.' },
    { q: 'What is the cancellation policy?', a: 'Free changes up to 24 hours before a lesson. Inside 24 hours the office has to approve, and a $35 late fee may apply.' },
    { q: 'Do I need a permit?', a: "Yes. Students need a valid learner's permit for behind-the-wheel lessons. The classroom course doesn't need one." },
    { q: 'What does Driver Education include?', a: '30 hours of classroom over one week (Mon–Thu, 4–7pm) plus one 90-minute behind-the-wheel session with home pickup. $395 total; a $100 deposit holds the seat and the balance is due before the course starts.' },
    { q: 'How old do students need to be?', a: 'Driving lessons and Driver Education start at 15. Traffic school is for licensed drivers of any age.' },
    { q: 'Can a parent ride along?', a: "Parents are welcome to ride along on the first lesson — just tell us when booking." },
    { q: 'Do you offer road test prep?', a: 'Yes — book a 90-minute private lesson and tell us it is for road test prep; the instructor will focus on the test route skills.' },
  ],
  service_area: { zones: ZONES },
  travel: { avg_speed_kmh: 32, road_factor: 1.35, buffer_min: 5, unknown_location_min: 30 },
  messaging: { quiet_start: '21:00', quiet_end: '08:00', reminder_hours_before: 24, instructor_brief_time: '07:00', owner_brief_time: '07:00', send_progress_to_parents: true },
  autonomy: { book_lessons: 'auto', enroll_courses: 'auto', reschedule: 'auto', late_changes: 'approve', cancel: 'auto', refunds: 'approve', drive_plans: 'approve' },
}

const FIRST = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Eli', 'Chloe', 'Owen', 'Lily', 'Caleb', 'Nora', 'Isaac', 'Ruby', 'Levi', 'Hazel', 'Jonah', 'Ivy', 'Miles', 'Leah', 'Ezra', 'Maya', 'Asher', 'Stella', 'Wyatt', 'Aria', 'Gavin', 'Elena', 'Jude', 'Piper', 'Silas', 'Tessa', 'Rhett']
const PARENT = ['Karen', 'David', 'Michelle', 'Brian', 'Angela', 'Marcus', 'Denise', 'Jason', 'Tanya', 'Robert', 'Lisa', 'Kevin', 'Monique', 'Greg', 'Heather', 'Andre', 'Stacy', 'Chris', 'Nicole', 'Derek', 'Wendy', 'Paul', 'Erica', 'Sam', 'Holly', 'Victor', 'Dana', 'Luis', 'Grace', 'Omar', 'Beth', 'Ray']
const LAST = ['Nguyen', 'Brooks', 'Patel', 'Hughes', 'Ramirez', 'Foster', 'Kim', 'Bennett', 'Ortiz', 'Hayes', 'Price', 'Coleman', 'Jenkins', 'Perry', 'Long', 'Reed', 'Ward', 'Cruz', 'Myers', 'Ford', 'Grant', 'Shaw', 'Lane', 'Stone', 'Burke', 'Wells', 'Hale', 'Webb', 'Dunn', 'Rhodes', 'Pope', 'Moss']

export async function seedSandbox(q: Q): Promise<{ schoolId: string }> {
  const tz = 'America/Chicago'
  const T = localDate(now(), tz)
  const at = (off: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return zonedToUtc(addDays(T, off), h * 60 + m, tz)
  }
  const ins = async (sql: string, p: unknown[]) => (await q.query<{ id: string }>(sql + ' returning id', p)).rows[0].id

  const year = Number(T.slice(0, 4))
  const playbook = { ...LARKSPUR_PLAYBOOK, closed_dates: [year, year + 1].flatMap((y) => [thanksgiving(y), `${y}-12-25`, `${y}-01-01`, `${y}-07-04`]) }
  const school = await ins(`insert into rs.schools (slug, name, timezone, currency, agent_phone, address, lat, lng, playbook, is_sandbox)
    values ('larkspur', 'Larkspur Driving School', $1, 'usd', '+16155550100', '410 Fatherland St, Nashville, TN 37206', 36.1745, -86.7605, $2::jsonb, true)`,
    [tz, JSON.stringify(playbook)])

  const staff = async (role: string, name: string, phone: string, email: string, teaches: string[], color: string) =>
    ins(`insert into rs.staff (school_id, role, name, phone, email, teaches, color) values ($1,$2,$3,$4,$5,$6,$7)`, [school, role, name, phone, email, teaches, color])
  const maya = await staff('owner', 'Maya Torres', '+16155550101', 'maya@larkspur.example', [], '#0f766e')
  const john = await staff('instructor', 'John Smith', '+16155550111', 'john@larkspur.example', ['LESSON60', 'LESSON90', 'BTW'], '#2563eb')
  const dan = await staff('instructor', 'Dan Montgomery', '+16155550112', 'dan@larkspur.example', ['LESSON60', 'BTW', 'DRVED', 'TRAFFIC'], '#c2410c')
  const priya = await staff('instructor', 'Priya Shah', '+16155550113', 'priya@larkspur.example', ['LESSON60', 'LESSON90', 'BTW'], '#7c3aed')
  void maya
  const hours = async (id: string, days: number[], s: string, e: string) => {
    const [sh, sm] = s.split(':').map(Number), [eh, em] = e.split(':').map(Number)
    for (const d of days) await q.query(`insert into rs.instructor_hours (school_id, staff_id, weekday, start_min, end_min) values ($1,$2,$3,$4,$5)`, [school, id, d, sh * 60 + sm, eh * 60 + em])
  }
  await hours(john, [1, 2, 3, 4, 5], '09:00', '18:00'); await hours(john, [6], '09:00', '13:00')
  await hours(dan, [1, 2, 3, 4, 5], '11:00', '15:30'); await hours(dan, [6], '09:00', '15:00')
  await hours(priya, [2, 3, 4, 5, 6], '10:00', '18:00')
  // John is off on the day after tomorrow afternoon (dentist).
  await q.query(`insert into rs.time_off (school_id, staff_id, starts_at, ends_at, reason) values ($1,$2,$3,$4,'Appointment')`, [school, john, at(2, '13:00'), at(2, '18:00')])

  const svc = async (code: string, name: string, kind: string, desc: string, dur: number, price: number, dep: number, pickup: boolean, minAge: number | null) =>
    ins(`insert into rs.services (school_id, code, name, kind, description, duration_min, price_cents, deposit_cents, pickup, min_age_years) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [school, code, name, kind, desc, dur, price, dep, pickup, minAge])
  const l60 = await svc('LESSON60', 'Private lesson · 60 min', 'lesson', 'One-on-one lesson with home pickup.', 60, 7500, 0, true, 15)
  const l90 = await svc('LESSON90', 'Private lesson · 90 min', 'lesson', 'Longer lesson, good for highway practice and road test prep.', 90, 10500, 0, true, 15)
  const btw = await svc('BTW', 'Behind-the-wheel (Driver Ed)', 'lesson', 'The 90-minute drive included with Driver Education. Scheduled by the school after the classroom week.', 90, 0, 0, true, 15)
  const drved = await svc('DRVED', 'Driver Education', 'course', '30 hours of classroom (Mon–Thu, 4–7pm) plus one 90-minute behind-the-wheel session.', 180, 39500, 10000, false, 15)
  const traffic = await svc('TRAFFIC', 'Traffic school · 4 hr', 'course', 'Defensive driving class for licensed drivers (court or insurance).', 240, 6900, 0, false, null)

  // ── Families ────────────────────────────────────────────────────────────
  let phoneN = 300
  const contact = async (name: string, kind: string, phone?: string) =>
    ins(`insert into rs.contacts (school_id, name, phone, kind, first_contact_at) values ($1,$2,$3,$4,$5)`, [school, name, phone ?? `+1615555${String(phoneN++).padStart(4, '0')}`, kind, at(-40, '12:00')])
  const zone = (name: string) => ZONES.find((z) => z.name === name)!
  const student = async (first: string, last: string, dob: string, z: string, street: string, guardian: string | null, own: string | null, permit = true, drivingMin = 0, notes = '') => {
    const zz = zone(z)
    const jitter = (n: number) => n + (((first.charCodeAt(0) * 7 + last.charCodeAt(0) * 13) % 21) - 10) / 2000
    return ins(`insert into rs.students (school_id, first_name, last_name, dob, permit_number, address, lat, lng, location_quality, guardian_contact_id, student_contact_id, driving_minutes, notes)
      values ($1,$2,$3,$4,$5,$6,$7,$8,'exact',$9,$10,$11,$12)`,
      [school, first, last, dob, permit ? `TN${(first.length * 1234567 + last.length * 7654321) % 90000000 + 10000000}` : null,
        `${street}, Nashville, TN ${zz.zips[0]}`, jitter(zz.lat), jitter(zz.lng), guardian, own, drivingMin, notes])
  }
  const age = (y: number, md: string) => `${Number(T.slice(0, 4)) - y}-${md}`

  const linda = await contact('Linda Carter', 'parent', '+16155550201')
  const emma = await student('Emma', 'Carter', age(16, '03-14'), 'East Nashville', '1204 Holly St', linda, null, true, 90, 'Nervous on highways; build up slowly.')
  const jamesC = await contact('James Rivera', 'student', '+16155550221')
  const rosa = await contact('Rosa Rivera', 'parent', '+16155550202')
  const james = await student('James', 'Rivera', age(17, '07-02'), 'Germantown', '1310 6th Ave N', rosa, jamesC, true, 180)
  const tom = await contact('Tom Okafor', 'parent', '+16155550203')
  const sarah = await student('Sarah', 'Okafor', age(16, '11-30'), 'Donelson', '2716 Lakeland Dr', tom, null, true, 60)
  const jimC = await contact('Jim Lawson', 'student', '+16155550222')
  const jim = await student('Jim', 'Lawson', age(34, '01-21'), 'Sylvan Park', '4413 Nebraska Ave', null, jimC, true, 120, 'Adult learner, prefers mornings.')
  const anne = await contact('Anne Whitaker', 'parent', '+16155550204')
  const noah = await student('Noah', 'Whitaker', age(15, '09-09'), 'Antioch', '5100 Hickory Hollow Pkwy', anne, null, false, 0)
  const carlos = await contact('Carlos Mendez', 'parent', '+16155550205')
  const lucia = await student('Lucia', 'Mendez', age(16, '05-05'), 'Inglewood', '3800 Gallatin Pike', carlos, null, true, 0)

  // ── Courses ─────────────────────────────────────────────────────────────
  const nextMonday = (() => { for (let i = 3; i < 10; i++) if (new Date(addDays(T, i) + 'T12:00:00Z').getUTCDay() === 1) return i; return 7 })()
  const course = async (title: string, svcId: string, startOff: number, days: number, cap: number, instructor: string, hhmm: [string, string], note: string, status = 'open') => {
    const id = await ins(`insert into rs.courses (school_id, service_id, title, starts_on, ends_on, schedule_note, capacity, location, instructor_id, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [school, svcId, title, addDays(T, startOff), addDays(T, startOff + days - 1), note, cap, 'Larkspur classroom, 410 Fatherland St', instructor, status])
    for (let d = 0; d < days; d++) await q.query(`insert into rs.course_sessions (school_id, course_id, instructor_id, starts_at, ends_at) values ($1,$2,$3,$4,$5)`, [school, id, instructor, at(startOff + d, hhmm[0]), at(startOff + d, hhmm[1])])
    return id
  }
  const fallPast = await course('Driver Ed · Week of ' + fmtShort(addDays(T, nextMonday - 14)), drved, nextMonday - 14, 4, 30, dan, ['16:00', '19:00'], 'Mon–Thu, 4–7 pm', 'completed')
  const nextWeek = await course('Driver Ed · Week of ' + fmtShort(addDays(T, nextMonday)), drved, nextMonday, 4, 30, dan, ['16:00', '19:00'], 'Mon–Thu, 4–7 pm')
  const later = await course('Driver Ed · Week of ' + fmtShort(addDays(T, nextMonday + 14)), drved, nextMonday + 14, 4, 30, dan, ['16:00', '19:00'], 'Mon–Thu, 4–7 pm')
  const satOff = (() => { for (let i = 2; i < 9; i++) if (new Date(addDays(T, i) + 'T12:00:00Z').getUTCDay() === 6) return i; return 5 })()
  await course('Traffic school · ' + fmtShort(addDays(T, satOff)), traffic, satOff, 1, 20, dan, ['09:00', '13:00'], 'Saturday, 9 am–1 pm')

  const nowT = +now()
  const pay = async (contactId: string | null, studentId: string, purpose: string, desc: string, cents: number, status: string, paidAtRaw: Date | null, link: { lesson?: string; enrollment?: string }) => {
    // Never record a payment in the future.
    const paidAt = paidAtRaw && +paidAtRaw > nowT ? new Date(nowT - ((cents % 7) + 1) * 3600000) : paidAtRaw
    return q.query(`insert into rs.payments (school_id, contact_id, student_id, purpose, lesson_id, enrollment_id, description, amount_cents, status, token, provider, paid_at, created_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'sandbox',$11,$12)`,
      [school, contactId, studentId, purpose, link.lesson ?? null, link.enrollment ?? null, desc, cents, status, token(), paidAt, paidAt ?? now()])
  }
  const enroll = async (courseId: string, studentId: string, contactId: string | null, depositOff: number, fullyPaid: boolean, title: string) => {
    const e = await ins(`insert into rs.enrollments (school_id, course_id, student_id, status, created_at) values ($1,$2,$3,'confirmed',$4)`, [school, courseId, studentId, at(depositOff, '10:00')])
    await pay(contactId, studentId, 'course_deposit', `Deposit: ${title}`, 10000, 'paid', at(depositOff, '10:05'), { enrollment: e })
    if (fullyPaid) await pay(contactId, studentId, 'balance', `Balance: ${title}`, 29500, 'paid', at(depositOff + 3, '19:30'), { enrollment: e })
    return e
  }

  // Last week's cohort (finished; nobody has a drive booked yet → "plan drives").
  await enroll(fallPast, emma, linda, -25, true, 'Driver Ed')
  await enroll(fallPast, sarah, tom, -22, true, 'Driver Ed')
  await enroll(fallPast, lucia, carlos, -20, true, 'Driver Ed')
  await enroll(fallPast, noah, anne, -18, true, 'Driver Ed') // no permit yet → unplaceable
  const pastZones = ['Inglewood', 'Madison', '12 South', 'Downtown', 'Bellevue']
  for (let i = 0; i < 5; i++) {
    const c = await contact(`${PARENT[i + 20]} ${LAST[i + 20]}`, 'parent')
    const s = await student(FIRST[i + 20], LAST[i + 20], age(16, `0${(i % 8) + 1}-1${i}`), pastZones[i], `${200 + i * 37} Maple St`, c, null)
    await enroll(fallPast, s, c, -24 + i, i !== 2, 'Driver Ed')
  }
  // Next week's cohort: 29 of 30 seats taken.
  const nextZones = ZONES.map((z) => z.name)
  for (let i = 0; i < 29; i++) {
    const c = await contact(`${PARENT[i % PARENT.length]} ${LAST[(i * 7) % LAST.length]}`, 'parent')
    const s = await student(FIRST[(i + 3) % FIRST.length], LAST[(i * 7) % LAST.length], age(15 + (i % 3), `${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`), nextZones[i % nextZones.length], `${100 + i * 11} Oak Ave`, c, null)
    await enroll(nextWeek, s, c, -14 + (i % 12), i % 3 === 0, 'Driver Ed')
  }
  // The cohort after: 6 enrolled.
  for (let i = 0; i < 6; i++) {
    const c = await contact(`${PARENT[(i + 9) % PARENT.length]} ${LAST[(i * 5 + 2) % LAST.length]}`, 'parent')
    const s = await student(FIRST[(i + 11) % FIRST.length], LAST[(i * 5 + 2) % LAST.length], age(15, `0${i + 2}-2${i}`), nextZones[(i + 4) % nextZones.length], `${400 + i * 9} Elm St`, c, null)
    await enroll(later, s, c, -3 + i % 3, false, 'Driver Ed')
  }

  // ── Lessons (past and upcoming) ─────────────────────────────────────────
  const lesson = async (studentId: string, instructor: string, service: string, start: Date, mins: number, status: string, contactId: string | null, cents: number, notes = '') => {
    const st = await q.query<{ address: string; lat: number; lng: number }>(`select address, lat, lng from rs.students where id = $1`, [studentId])
    const s = st.rows[0]
    const id = await ins(`insert into rs.lessons (school_id, student_id, instructor_id, service_id, starts_at, ends_at, pickup_address, pickup_lat, pickup_lng, status, instructor_notes, completed_minutes, created_by, created_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'agent',$13)`,
      [school, studentId, instructor, service, start, new Date(+start + mins * 60000), s.address, s.lat, s.lng, status, notes, status === 'completed' ? mins : null, new Date(+start - 5 * 86400000)])
    if (cents > 0) await pay(contactId, studentId, 'lesson', 'Private lesson', cents, 'paid', new Date(+start - 3 * 86400000), { lesson: id })
    return id
  }
  // Past
  await lesson(emma, john, l90, at(-6, '15:00'), 90, 'completed', linda, 10500, 'Good mirror checks. Practice left turns across traffic.')
  await lesson(james, priya, l90, at(-5, '10:30'), 90, 'completed', rosa, 10500, 'Ready for highway merge practice.')
  await lesson(james, john, l90, at(-12, '11:00'), 90, 'completed', rosa, 10500)
  await lesson(jim, priya, l60, at(-4, '10:00'), 60, 'completed', jimC, 7500, 'Parallel parking improving.')
  await lesson(jim, priya, l60, at(-11, '10:00'), 60, 'completed', jimC, 7500)
  await lesson(sarah, john, l60, at(-3, '16:00'), 60, 'no_show', tom, 7500)
  await lesson(emma, john, l60, at(-15, '15:00'), 60, 'completed', linda, 7500)
  await lesson(lucia, priya, l60, at(-2, '14:00'), 60, 'completed', carlos, 7500, 'First lesson. Calm and attentive.')
  // Upcoming
  await lesson(james, john, l90, at(1, '10:00'), 90, 'booked', rosa, 10500)
  await lesson(emma, john, l60, at(1, '15:00'), 60, 'booked', linda, 7500)
  await lesson(jim, priya, l60, at(1, '10:30'), 60, 'booked', jimC, 7500)
  await lesson(sarah, priya, l60, at(3, '16:00'), 60, 'booked', tom, 7500)
  await lesson(lucia, john, l60, at(4, '11:00'), 60, 'booked', carlos, 7500)
  await lesson(jim, priya, l60, at(6, '10:00'), 60, 'booked', jimC, 7500)
  await q.query(`update rs.students s set driving_minutes = coalesce((select sum(completed_minutes) from rs.lessons l where l.student_id = s.id and l.status = 'completed'), 0) where s.school_id = $1`, [school])
  // Today (if it's a working day the schedule isn't empty)
  await lesson(james, priya, l60, at(0, '16:30'), 60, 'booked', rosa, 7500)
  void btw

  // Reminders for upcoming lessons are ordinary jobs.
  const upcoming = await q.query<{ id: string; starts_at: Date }>(`select id, starts_at from rs.lessons where school_id = $1 and status = 'booked' and starts_at > $2`, [school, now()])
  for (const l of upcoming.rows) {
    const remind = new Date(+new Date(l.starts_at) - 24 * 3600000)
    if (remind > now()) await q.query(`insert into rs.jobs (school_id, kind, run_at, payload, dedupe_key) values ($1,'lesson_reminder',$2,$3::jsonb,$4)`, [school, remind, JSON.stringify({ lessonId: l.id }), `remind:lesson:${l.id}`])
  }
  for (const cId of [nextWeek, later]) {
    const first = await q.query<{ starts_at: Date }>(`select starts_at from rs.course_sessions where course_id = $1 order by starts_at limit 1`, [cId])
    await q.query(`insert into rs.jobs (school_id, kind, run_at, payload, dedupe_key) values ($1,'course_reminder',$2,$3::jsonb,$4)`, [school, new Date(+new Date(first.rows[0].starts_at) - 86400000), JSON.stringify({ courseId: cId }), `remind:course:${cId}`])
  }

  // A prior conversation, so the inbox has a real escalation to look at.
  const ago = (h: number) => new Date(nowT - h * 3600000)
  const conv = await ins(`insert into rs.conversations (school_id, phone, contact_id, audience, last_message_at, state) values ($1,'+16155550204',$2,'customer',$3,'{"disclosed":true}'::jsonb)`, [school, anne, ago(5)])
  const msg = (dir: string, author: string, body: string, t: Date) => q.query(`insert into rs.messages (school_id, conversation_id, direction, author, body, created_at) values ($1,$2,$3,$4,$5,$6)`, [school, conv, dir, author, body, t])
  await msg('in', 'contact', 'Hi, Noah has epilepsy but has been seizure-free for 2 years and his doctor cleared him. Is that ok for lessons?', at(0, '08:05'))
  await msg('out', 'agent', "Thanks for telling us, Anne. That's a question for Maya, our owner, rather than me — I've passed it to her and she'll reply personally today.", ago(5))
  await q.query(`insert into rs.inbox (school_id, kind, priority, title, detail, conversation_id, created_at) values ($1,'escalation','normal',$2,$3,$4,$5)`,
    [school, 'Medical question from Anne Whitaker (Noah)', 'Parent says Noah has epilepsy, seizure-free 2 years, cleared by his doctor. Asking whether he can take lessons. The agent did not answer — this is your call. Noah also still needs a permit number before booking.', conv, ago(5)])

  // ── A second, unrelated school (tenant isolation) ───────────────────────
  const other = await ins(`insert into rs.schools (slug, name, timezone, currency, agent_phone, address, lat, lng, playbook, is_sandbox)
    values ('harbor-point', 'Harbor Point Driving', 'America/New_York', 'usd', '+16175550100', '12 Harbor St, Boston, MA 02210', 42.35, -71.045, $1::jsonb, true)`,
    [JSON.stringify({ about: 'Harbor Point Driving serves Boston.', faqs: [{ q: 'Price?', a: 'Lessons are $90.' }], service_area: { zones: [{ name: 'Seaport', zips: ['02210'], lat: 42.35, lng: -71.045 }] } })])
  const hpC = (await q.query<{ id: string }>(`insert into rs.contacts (school_id, name, phone, kind) values ($1,'Pat Carter','+16175550201','parent') returning id`, [other])).rows[0].id
  await q.query(`insert into rs.students (school_id, first_name, last_name, dob, address, guardian_contact_id, notes) values ($1,'Emma','Carter',$2,'99 Seaport Blvd, Boston, MA 02210',$3,'Harbor Point private note: do not disclose')`, [other, age(16, '03-14'), hpC])
  await q.query(`insert into rs.staff (school_id, role, name, phone, email) values ($1,'owner','Harbor Owner','+16175550101','owner@harbor.example')`, [other])
  return { schoolId: school }
}

function fmtShort(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })
}

function thanksgiving(y: number) {
  const nov1 = new Date(Date.UTC(y, 10, 1)).getUTCDay()
  const firstThu = 1 + ((4 - nov1 + 7) % 7)
  return `${y}-11-${String(firstThu + 21).padStart(2, '0')}`
}
