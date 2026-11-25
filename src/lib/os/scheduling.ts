/**
 * Travel-aware lesson scheduling.
 *
 * The engine answers one question deterministically: "when could this
 * student's lesson happen without breaking anyone's day?" A time is offered
 * only if the instructor is working, not on time off, not teaching a class,
 * can drive from the previous stop to the pickup (and from the drop-off to
 * the next stop) in time, and the student is free. The database exclusion
 * constraints are the final guard against double-booking.
 */
import { many, type Q } from './db.ts'
import { now } from './clock.ts'
import { addDays, asDate, fmtDay, fmtTime, localDate, weekdayOf, zonedToUtc } from './time.ts'
import { travelMinutes, toPoint, type Point } from './travel.ts'
import { schoolPoint, type Ctx } from './school.ts'

export interface Service {
  id: string
  code: string
  name: string
  kind: 'lesson' | 'course'
  description: string
  duration_min: number
  price_cents: number
  deposit_cents: number
  pickup: boolean
  min_age_years: number | null
  active: boolean
}

export interface Commitment {
  start: Date
  end: Date
  loc: Point
  label: string
  lessonId?: string
}

export interface Slot {
  instructorId: string
  instructorName: string
  start: Date
  end: Date
  travelBefore: number
  travelAfter: number
  addedTravel: number
  /** e.g. "Tue, Nov 25 at 3:30 PM" */
  label: string
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'any'

export interface SlotQuery {
  service: Service
  pickup: Point
  studentId?: string
  from?: string // local YYYY-MM-DD
  to?: string
  instructorId?: string
  timeOfDay?: TimeOfDay
  weekdays?: number[]
  excludeLessonId?: string
  limit?: number
  /** Tentative commitments not yet in the database (drive-plan generation). */
  extra?: Record<string, Commitment[]>
  /** Tentative student commitments (drive-plan generation). */
  extraStudent?: Commitment[]
  ignoreNotice?: boolean
}

interface InstructorRow { id: string; name: string; teaches: string[] }

const STEP_MIN = 30

export async function eligibleInstructors(ctx: Ctx, serviceCode: string, instructorId?: string): Promise<InstructorRow[]> {
  const rows = await many<InstructorRow>(ctx.q,
    `select id, name, teaches from rs.staff
      where school_id = $1 and active and role in ('instructor', 'owner') and $2 = any(teaches)
      order by name`, [ctx.school.id, serviceCode])
  return instructorId ? rows.filter((r) => r.id === instructorId) : rows
}

interface DayPlan { windows: [Date, Date][]; commitments: Commitment[] }

/** Working windows and fixed commitments for each instructor over a local date range. */
export async function loadInstructorDays(ctx: Ctx, instructorIds: string[], from: string, to: string, excludeLessonId?: string): Promise<Map<string, Map<string, DayPlan>>> {
  const tz = ctx.school.timezone
  const rangeStart = zonedToUtc(from, 0, tz)
  const rangeEnd = zonedToUtc(addDays(to, 1), 0, tz)
  const sp = schoolPoint(ctx.school)
  const q: Q = ctx.q
  const [hours, off, lessons, sessions] = await Promise.all([
    many<{ staff_id: string; weekday: number; start_min: number; end_min: number }>(q,
      `select staff_id, weekday, start_min, end_min from rs.instructor_hours where school_id = $1 and staff_id = any($2::uuid[])`,
      [ctx.school.id, instructorIds]),
    many<{ staff_id: string; starts_at: Date; ends_at: Date }>(q,
      `select staff_id, starts_at, ends_at from rs.time_off where school_id = $1 and staff_id = any($2::uuid[]) and ends_at > $3 and starts_at < $4`,
      [ctx.school.id, instructorIds, rangeStart, rangeEnd]),
    many<{ id: string; instructor_id: string; starts_at: Date; ends_at: Date; pickup_lat: number | null; pickup_lng: number | null; first_name: string }>(q,
      `select l.id, l.instructor_id, l.starts_at, l.ends_at, l.pickup_lat, l.pickup_lng, s.first_name
         from rs.lessons l join rs.students s on s.id = l.student_id
        where l.school_id = $1 and l.instructor_id = any($2::uuid[]) and l.status in ('held','booked','completed')
          and l.ends_at > $3 and l.starts_at < $4 and ($5::uuid is null or l.id <> $5::uuid)`,
      [ctx.school.id, instructorIds, rangeStart, rangeEnd, excludeLessonId ?? null]),
    many<{ instructor_id: string; starts_at: Date; ends_at: Date; title: string }>(q,
      `select cs.instructor_id, cs.starts_at, cs.ends_at, c.title from rs.course_sessions cs join rs.courses c on c.id = cs.course_id
        where cs.school_id = $1 and cs.instructor_id = any($2::uuid[]) and cs.ends_at > $3 and cs.starts_at < $4`,
      [ctx.school.id, instructorIds, rangeStart, rangeEnd]),
  ])

  const out = new Map<string, Map<string, DayPlan>>()
  for (const id of instructorIds) {
    const days = new Map<string, DayPlan>()
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const wd = weekdayOf(d)
      let windows: [Date, Date][] = hours
        .filter((h) => h.staff_id === id && Number(h.weekday) === wd)
        .map((h) => [zonedToUtc(d, Number(h.start_min), tz), zonedToUtc(d, Number(h.end_min), tz)] as [Date, Date])
      for (const t of off.filter((o) => o.staff_id === id)) {
        windows = subtract(windows, asDate(t.starts_at), asDate(t.ends_at))
      }
      days.set(d, { windows, commitments: [] })
    }
    out.set(id, days)
  }
  const push = (iid: string, c: Commitment) => {
    const d = localDate(c.start, tz)
    out.get(iid)?.get(d)?.commitments.push(c)
  }
  for (const l of lessons) push(l.instructor_id, { start: asDate(l.starts_at), end: asDate(l.ends_at), loc: toPoint(l.pickup_lat, l.pickup_lng) ?? sp, label: `Lesson · ${l.first_name}`, lessonId: l.id })
  for (const s of sessions) push(s.instructor_id, { start: asDate(s.starts_at), end: asDate(s.ends_at), loc: sp, label: s.title })
  return out
}

function subtract(windows: [Date, Date][], s: Date, e: Date): [Date, Date][] {
  const out: [Date, Date][] = []
  for (const [a, b] of windows) {
    if (e <= a || s >= b) { out.push([a, b]); continue }
    if (s > a) out.push([a, s])
    if (e < b) out.push([e, b])
  }
  return out
}

/** Busy intervals for the student: lessons and classroom sessions of courses they're enrolled in. */
export async function studentBusy(ctx: Ctx, studentId: string, excludeLessonId?: string): Promise<Commitment[]> {
  const rows = await many<{ starts_at: Date; ends_at: Date; label: string }>(ctx.q,
    `select starts_at, ends_at, 'Lesson' as label from rs.lessons
      where school_id = $1 and student_id = $2 and status in ('held','booked') and ($3::uuid is null or id <> $3::uuid)
     union all
     select cs.starts_at, cs.ends_at, c.title from rs.course_sessions cs
       join rs.courses c on c.id = cs.course_id
       join rs.enrollments e on e.course_id = c.id and e.status in ('reserved','confirmed')
      where cs.school_id = $1 and e.student_id = $2`,
    [ctx.school.id, studentId, excludeLessonId ?? null])
  return rows.map((r) => ({ start: asDate(r.starts_at), end: asDate(r.ends_at), loc: null, label: r.label }))
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start < b.end && b.start < a.end
}

function timeOk(start: Date, tod: TimeOfDay | undefined, tz: string) {
  if (!tod || tod === 'any') return true
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(start)) % 24
  if (tod === 'morning') return h < 12
  if (tod === 'afternoon') return h >= 12 && h < 17
  return h >= 17
}

export interface Fit { ok: boolean; travelBefore: number; travelAfter: number; addedTravel: number; reason?: string }

/** Can a lesson [start, end) at `loc` fit into one instructor-day? */
export function fitInDay(ctx: Ctx, day: DayPlan, start: Date, end: Date, loc: Point): Fit {
  const pb = ctx.school.playbook
  const base = schoolPoint(ctx.school)
  const win = day.windows.find(([a, b]) => start >= a && end <= b)
  if (!win) return { ok: false, travelBefore: 0, travelAfter: 0, addedTravel: 0, reason: 'outside working hours' }
  const sorted = [...day.commitments].sort((a, b) => +a.start - +b.start)
  for (const c of sorted) if (overlaps(c, { start, end })) return { ok: false, travelBefore: 0, travelAfter: 0, addedTravel: 0, reason: `overlaps ${c.label}` }
  const prev = [...sorted].reverse().find((c) => c.end <= start)
  const next = sorted.find((c) => c.start >= end)
  const prevLoc = prev ? prev.loc : base
  const prevEnd = prev && prev.end > win[0] ? prev.end : win[0]
  const tb = travelMinutes(prevLoc, loc, pb)
  if (+start - +prevEnd < tb * 60000) return { ok: false, travelBefore: tb, travelAfter: 0, addedTravel: 0, reason: `needs ${tb} min to drive from ${prev ? prev.label : 'the school'}` }
  let ta = 0
  if (next) {
    ta = travelMinutes(loc, next.loc, pb)
    if (+next.start - +end < ta * 60000) return { ok: false, travelBefore: tb, travelAfter: ta, addedTravel: 0, reason: `needs ${ta} min to reach ${next.label}` }
  }
  const direct = next ? travelMinutes(prevLoc, next.loc, pb) : 0
  return { ok: true, travelBefore: tb, travelAfter: ta, addedTravel: Math.max(0, tb + ta - direct) }
}

/** Offer bookable times, ranked to keep instructors' driving low and spread across days. */
export async function findSlots(ctx: Ctx, qy: SlotQuery): Promise<Slot[]> {
  const tz = ctx.school.timezone
  const pb = ctx.school.playbook
  const t0 = now()
  const today = localDate(t0, tz)
  const from = qy.from && qy.from > today ? qy.from : today
  const maxTo = addDays(today, pb.policies.booking_window_days)
  const to = qy.to && qy.to < maxTo ? qy.to : maxTo
  if (to < from) return []
  const earliest = qy.ignoreNotice ? t0 : new Date(+t0 + pb.policies.min_notice_hours * 3600000)
  const instructors = await eligibleInstructors(ctx, qy.service.code, qy.instructorId)
  if (!instructors.length) return []
  const days = await loadInstructorDays(ctx, instructors.map((i) => i.id), from, to, qy.excludeLessonId)
  for (const [iid, cs] of Object.entries(qy.extra ?? {})) for (const c of cs) days.get(iid)?.get(localDate(c.start, tz))?.commitments.push(c)
  const busy = [...(qy.studentId ? await studentBusy(ctx, qy.studentId, qy.excludeLessonId) : []), ...(qy.extraStudent ?? [])]
  const busyDays = new Set(busy.filter((b) => b.label === 'Lesson').map((b) => localDate(b.start, tz)))

  const all: Slot[] = []
  const dur = qy.service.duration_min * 60000
  for (const ins of instructors) {
    for (const [date, day] of days.get(ins.id) ?? []) {
      if (qy.weekdays?.length && !qy.weekdays.includes(weekdayOf(date))) continue
      if (pb.closed_dates.includes(date)) continue
      if (busyDays.has(date)) continue // one driving lesson per student per day
      for (const [ws, we] of day.windows) {
        for (let t = +ws; t + dur <= +we; t += STEP_MIN * 60000) {
          const start = new Date(t), end = new Date(t + dur)
          if (start < earliest || !timeOk(start, qy.timeOfDay, tz)) continue
          if (busy.some((b) => overlaps(b, { start, end }))) continue
          const fit = fitInDay(ctx, day, start, end, qy.pickup)
          if (!fit.ok) continue
          all.push({ instructorId: ins.id, instructorName: ins.name, start, end, travelBefore: fit.travelBefore, travelAfter: fit.travelAfter, addedTravel: fit.addedTravel, label: `${fmtDay(start, tz)} at ${fmtTime(start, tz)}` })
        }
      }
    }
  }
  return pickDiverse(all, qy.limit ?? 5, tz)
}

/** Best (least added driving) options, at most two per day and 90+ min apart, earliest days first. */
function pickDiverse(all: Slot[], limit: number, tz: string): Slot[] {
  const byDay = new Map<string, Slot[]>()
  for (const s of all) {
    const d = localDate(s.start, tz)
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(s)
  }
  const out: Slot[] = []
  for (const d of [...byDay.keys()].sort()) {
    const ranked = byDay.get(d)!.sort((a, b) => a.addedTravel - b.addedTravel || +a.start - +b.start)
    const chosen: Slot[] = []
    for (const s of ranked) {
      if (chosen.length >= 2) break
      if (chosen.some((c) => Math.abs(+c.start - +s.start) < 90 * 60000)) continue
      chosen.push(s)
    }
    out.push(...chosen.sort((a, b) => +a.start - +b.start))
    if (out.length >= limit) break
  }
  return out.slice(0, limit)
}

/** Re-validate one exact time right before writing it (proposals go stale). */
export async function checkSlot(ctx: Ctx, args: { service: Service; instructorId: string; start: Date; pickup: Point; studentId?: string; excludeLessonId?: string; ignoreNotice?: boolean }): Promise<Fit> {
  const tz = ctx.school.timezone
  const pb = ctx.school.playbook
  const end = new Date(+args.start + args.service.duration_min * 60000)
  if (!args.ignoreNotice && args.start < new Date(+now() + pb.policies.min_notice_hours * 3600000)) {
    return { ok: false, travelBefore: 0, travelAfter: 0, addedTravel: 0, reason: `needs at least ${pb.policies.min_notice_hours} hours notice` }
  }
  const date = localDate(args.start, tz)
  if (pb.closed_dates.includes(date)) return { ok: false, travelBefore: 0, travelAfter: 0, addedTravel: 0, reason: 'the school is closed that day' }
  const days = await loadInstructorDays(ctx, [args.instructorId], date, date, args.excludeLessonId)
  const day = days.get(args.instructorId)?.get(date)
  if (!day) return { ok: false, travelBefore: 0, travelAfter: 0, addedTravel: 0, reason: 'instructor not available' }
  if (args.studentId) {
    const busy = await studentBusy(ctx, args.studentId, args.excludeLessonId)
    const clash = busy.find((b) => overlaps(b, { start: args.start, end }) || (b.label === 'Lesson' && localDate(b.start, tz) === date))
    if (clash) return { ok: false, travelBefore: 0, travelAfter: 0, addedTravel: 0, reason: `student already has ${clash.label.toLowerCase()} that day` }
  }
  return fitInDay(ctx, day, args.start, end, args.pickup)
}
