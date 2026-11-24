/**
 * The playbook is the school's operating knowledge: what it sells, its rules,
 * the answers it gives, and how much the agent may do without asking. The
 * agent can only state facts that come from here or from live records.
 */
import { z } from 'zod'

export const AUTONOMY_LEVELS = ['auto', 'approve', 'never'] as const
export type Autonomy = (typeof AUTONOMY_LEVELS)[number]

export const AUTONOMY_ACTIONS = {
  book_lessons: 'Book driving lessons into open times',
  enroll_courses: 'Enroll students in classroom courses',
  reschedule: 'Move a lesson outside the cancellation window',
  late_changes: 'Move or cancel a lesson inside the cancellation window',
  cancel: 'Cancel a lesson outside the cancellation window',
  refunds: 'Refund a payment',
  drive_plans: 'Book a whole cohort\'s drive schedule',
} as const
export type AutonomyAction = keyof typeof AUTONOMY_ACTIONS

const zone = z.object({ name: z.string(), zips: z.array(z.string()), lat: z.number(), lng: z.number() })

export const playbookSchema = z.object({
  about: z.string().default(''),
  office_hours: z.string().default(''),
  owner_note: z.string().default(''), // how the owner wants to sound
  policies: z.object({
    cancellation_hours: z.number().int().min(0).max(168).default(24),
    late_cancel_fee_cents: z.number().int().min(0).default(0),
    hold_minutes: z.number().int().min(10).max(1440).default(120),
    min_notice_hours: z.number().int().min(0).max(168).default(12),
    permit_required_for_lessons: z.boolean().default(true),
    minor_needs_guardian: z.boolean().default(true),
    booking_window_days: z.number().int().min(1).max(120).default(21),
    max_lessons_per_week: z.number().int().min(1).max(14).default(3),
  }).prefault({}),
  closed_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]), // holidays: no lessons or classes
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  service_area: z.object({ zones: z.array(zone).default([]) }).prefault({}),
  travel: z.object({
    avg_speed_kmh: z.number().min(10).max(90).default(32),
    road_factor: z.number().min(1).max(2).default(1.35),
    buffer_min: z.number().int().min(0).max(30).default(5),
    unknown_location_min: z.number().int().min(10).max(90).default(30),
  }).prefault({}),
  messaging: z.object({
    quiet_start: z.string().default('21:00'),
    quiet_end: z.string().default('08:00'),
    reminder_hours_before: z.number().int().min(1).max(72).default(24),
    instructor_brief_time: z.string().default('07:00'),
    owner_brief_time: z.string().default('07:00'),
    send_progress_to_parents: z.boolean().default(true),
  }).prefault({}),
  autonomy: z.object({
    book_lessons: z.enum(AUTONOMY_LEVELS).default('auto'),
    enroll_courses: z.enum(AUTONOMY_LEVELS).default('auto'),
    reschedule: z.enum(AUTONOMY_LEVELS).default('auto'),
    late_changes: z.enum(AUTONOMY_LEVELS).default('approve'),
    cancel: z.enum(AUTONOMY_LEVELS).default('auto'),
    refunds: z.enum(AUTONOMY_LEVELS).default('approve'),
    drive_plans: z.enum(AUTONOMY_LEVELS).default('approve'),
  }).prefault({}),
})

export type Playbook = z.infer<typeof playbookSchema>

export function parsePlaybook(raw: unknown): Playbook {
  return playbookSchema.parse(raw ?? {})
}

export function hhmmToMin(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + (m || 0)
}
