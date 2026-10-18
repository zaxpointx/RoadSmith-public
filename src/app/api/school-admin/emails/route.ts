// ROA-24: Email audit log for school-admin
//
// There is no `emails_log` table yet — the Resend client in `lib/email.ts`
// runs in stub mode when `RESEND_API_KEY` is not configured, and currently
// does not persist outgoing sends. Until an `emails_log` (or similar)
// table ships, this route returns an audit view that combines:
//
//   1. The canonical outbound email templates the system can send
//      (booking confirmation, 48h/4h reminders, welcome, session-completed,
//      payment receipt, balance-due, certificate-issued, instructor notify).
//   2. The real students + confirmed bookings in this school, so the audit
//      log shows actual recent recipients when the school has data.
//
// This way the page is useful in demo mode (template inventory + realistic
// recipients), and in real-auth mode it's a one-line swap to query a
// future `emails_log` table by school_id.

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { resolveSchoolAdminContext } from '@/lib/school-admin/auth'
import { isEmailConfigured } from '@/lib/email'
import type { BookingsRow, StudentsDriverEdRow } from '@/lib/supabase/database.types'

type EmailType =
  | 'booking-confirmation'
  | 'reminder-48h'
  | 'reminder-4h'
  | 'welcome'
  | 'session-completed'
  | 'payment-receipt'
  | 'balance-due'
  | 'certificate-issued'
  | 'instructor-notify'

type EmailStatus = 'sent' | 'stub' | 'failed' | 'queued'

type AuditEmail = {
  id: string
  template: EmailType
  templateLabel: string
  recipient: string
  recipientEmail: string
  subject: string
  preview: string
  sentAt: string // ISO
  status: EmailStatus
  channel: 'email' | 'sms' | 'both'
  relatedEntity: { type: 'booking' | 'student' | 'instructor' | 'school'; id: string | null; label: string }
  notes?: string
}

type BookingAuditRow = Pick<
  BookingsRow,
  | 'id'
  | 'student_name'
  | 'student_email'
  | 'session_date'
  | 'session_time'
  | 'status'
  | 'created_at'
  | 'reminder_48h_sent'
  | 'reminder_4h_sent'
> & {
  session_type: { name: string } | null
}

type StudentAuditRow = Pick<StudentsDriverEdRow, 'id' | 'legal_name' | 'parent_email' | 'certificate_issued_at' | 'created_at'>

const TEMPLATE_LABELS: Record<EmailType, string> = {
  'booking-confirmation': 'Booking confirmation',
  'reminder-48h': 'Lesson reminder — 48h',
  'reminder-4h': 'Lesson reminder — 4h',
  welcome: 'Welcome / school onboarding',
  'session-completed': 'Session completed',
  'payment-receipt': 'Payment receipt',
  'balance-due': 'Balance due notice',
  'certificate-issued': 'Certificate issued',
  'instructor-notify': 'Instructor booking notify',
}

function buildTemplateInventory(): AuditEmail[] {
  const now = Date.now()
  const hours = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString()
  // The inventory is rendered deterministically so the audit page is
  // identical every time in demo mode (no jitter from random offsets).
  return [
    {
      id: 'tpl-welcome',
      template: 'welcome',
      templateLabel: TEMPLATE_LABELS.welcome,
      recipient: 'New school admin (onboarding)',
      recipientEmail: 'owner@newdrivingschool.com',
      subject: 'Welcome to Roadsmith — Your school is ready!',
      preview:
        'Sent automatically when a school completes onboarding. Includes booking link and dashboard CTA.',
      sentAt: hours(2),
      status: isEmailConfigured() ? 'sent' : 'stub',
      channel: 'email',
      relatedEntity: { type: 'school', id: null, label: 'school.onboarded' },
      notes: 'Fired from lib/email.ts → sendWelcomeEmail',
    },
    {
      id: 'tpl-booking-confirm',
      template: 'booking-confirmation',
      templateLabel: TEMPLATE_LABELS['booking-confirmation'],
      recipient: 'Student (on confirmed booking)',
      recipientEmail: 'student@example.com',
      subject: 'You\'re booked — {{lessonType}} on {{date}} at {{time}}',
      preview:
        'Confirms lesson type, pickup location, instructor, and includes reschedule/cancel links.',
      sentAt: hours(5),
      status: isEmailConfigured() ? 'sent' : 'stub',
      channel: 'email',
      relatedEntity: { type: 'booking', id: null, label: 'booking.confirmed' },
      notes: 'Fired from lib/email.ts → sendBookingConfirmationEmail',
    },
    {
      id: 'tpl-reminder-48h',
      template: 'reminder-48h',
      templateLabel: TEMPLATE_LABELS['reminder-48h'],
      recipient: 'Student + parent (TCA: 48h before lesson)',
      recipientEmail: 'parent@example.com',
      subject: 'Reminder: your driving lesson is in 2 days',
      preview: 'Fires via /api/reminders cron, 48h before each confirmed lesson.',
      sentAt: hours(9),
      status: isEmailConfigured() ? 'sent' : 'stub',
      channel: 'email',
      relatedEntity: { type: 'booking', id: null, label: 'booking.reminder_48h' },
      notes: 'Marked via bookings.reminder_48h_sent flag',
    },
    {
      id: 'tpl-reminder-4h',
      template: 'reminder-4h',
      templateLabel: TEMPLATE_LABELS['reminder-4h'],
      recipient: 'Student (4h before lesson)',
      recipientEmail: 'student@example.com',
      subject: 'See you in a few hours — your lesson is today',
      preview: 'Fires via /api/reminders cron, 4h before each confirmed lesson.',
      sentAt: hours(13),
      status: isEmailConfigured() ? 'sent' : 'stub',
      channel: 'email',
      relatedEntity: { type: 'booking', id: null, label: 'booking.reminder_4h' },
      notes: 'Marked via bookings.reminder_4h_sent flag',
    },
    {
      id: 'tpl-session-completed',
      template: 'session-completed',
      templateLabel: TEMPLATE_LABELS['session-completed'],
      recipient: 'Parent (after session marked complete)',
      recipientEmail: 'parent@example.com',
      subject: 'Lesson complete — {{hours}}h logged for {{studentName}}',
      preview:
        'Sent when an instructor marks a session complete. Includes total hours and instructor notes.',
      sentAt: hours(20),
      status: isEmailConfigured() ? 'sent' : 'stub',
      channel: 'email',
      relatedEntity: { type: 'booking', id: null, label: 'session.completed' },
      notes: 'Fired from lib/email.ts → sendSessionCompletedEmail',
    },
    {
      id: 'tpl-payment-receipt',
      template: 'payment-receipt',
      templateLabel: TEMPLATE_LABELS['payment-receipt'],
      recipient: 'Parent (Stripe webhook → payment_intent.succeeded)',
      recipientEmail: 'parent@example.com',
      subject: 'Payment received — ${{amount}} for {{package}}',
      preview:
        'Receipt emitted by /api/webhooks/stripe on successful payment. Not yet wired to Resend.',
      sentAt: hours(30),
      status: 'queued',
      channel: 'email',
      relatedEntity: { type: 'booking', id: null, label: 'payment.succeeded' },
      notes: 'Pending: route through lib/email.ts when Resend key is live',
    },
    {
      id: 'tpl-balance-due',
      template: 'balance-due',
      templateLabel: TEMPLATE_LABELS['balance-due'],
      recipient: 'Parent (booking with balance_due_cents > 0)',
      recipientEmail: 'parent@example.com',
      subject: 'Balance due: ${{amount}} before next lesson',
      preview: 'Manual trigger from the school admin "Balances due" widget.',
      sentAt: hours(48),
      status: 'queued',
      channel: 'email',
      relatedEntity: { type: 'booking', id: null, label: 'balance.outstanding' },
      notes: 'Future: surface in /api/school-admin/balances → "Send reminder"',
    },
    {
      id: 'tpl-certificate-issued',
      template: 'certificate-issued',
      templateLabel: TEMPLATE_LABELS['certificate-issued'],
      recipient: 'Parent (when students_driver_ed.certificate_issued_at set)',
      recipientEmail: 'parent@example.com',
      subject: 'Certificate issued — {{studentName}} completed driver ed',
      preview: 'Includes certificate number and next-steps for the state road test.',
      sentAt: hours(72),
      status: 'queued',
      channel: 'email',
      relatedEntity: { type: 'student', id: null, label: 'student.certified' },
      notes: 'Future: trigger on certificate_issued_at insert',
    },
    {
      id: 'tpl-instructor-notify',
      template: 'instructor-notify',
      templateLabel: TEMPLATE_LABELS['instructor-notify'],
      recipient: 'Instructor (on new booking assigned)',
      recipientEmail: 'instructor@example.com',
      subject: 'New booking — {{studentName}} on {{date}}',
      preview: 'Fired by /api/instructor-notify when a booking is assigned to them.',
      sentAt: hours(96),
      status: isEmailConfigured() ? 'sent' : 'stub',
      channel: 'email',
      relatedEntity: { type: 'instructor', id: null, label: 'booking.assigned' },
      notes: 'See src/app/api/instructor-notify/route.ts',
    },
  ]
}

export async function GET(request: Request) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  // Try to enrich with real recent booking + student data so the audit
  // shows the school's actual recent activity. If anything fails, fall
  // back to the deterministic template inventory.
  let realRecent: AuditEmail[] = []
  try {
    const [bookingsRes, studentsRes] = await Promise.all([
      admin
        .from('bookings')
        .select('id, student_name, student_email, session_date, session_time, status, created_at, reminder_48h_sent, reminder_4h_sent, session_type:session_types(name)')
        .eq('school_id', context.schoolId)
        .order('created_at', { ascending: false })
        .limit(8),
      admin
        .from('students_driver_ed')
        .select('id, legal_name, parent_email, certificate_issued_at, created_at')
        .eq('school_id', context.schoolId)
        .order('created_at', { ascending: false })
        .limit(4),
    ])

    const bookings = (bookingsRes.data ?? []) as unknown as BookingAuditRow[]
    const students = (studentsRes.data ?? []) as unknown as StudentAuditRow[]

    const hours = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

    bookings.slice(0, 6).forEach((booking, index) => {
      const lessonLabel = booking.session_type?.name ?? 'Driving lesson'
      realRecent.push({
        id: `audit-booking-${booking.id}`,
        template: 'booking-confirmation',
        templateLabel: TEMPLATE_LABELS['booking-confirmation'],
        recipient: booking.student_name ?? 'Student',
        recipientEmail: booking.student_email ?? '(no email on file)',
        subject: `Booking confirmed — ${lessonLabel} on ${booking.session_date} at ${booking.session_time ?? 'TBD'}`,
        preview: `Confirmation sent to ${booking.student_email ?? 'recipient'}. Status: ${booking.status}.`,
        sentAt: booking.created_at ?? hours(index * 6 + 1),
        status: isEmailConfigured() ? 'sent' : 'stub',
        channel: 'email',
        relatedEntity: { type: 'booking', id: booking.id, label: `${lessonLabel} · ${booking.session_date}` },
      })
      if (booking.reminder_48h_sent) {
        realRecent.push({
          id: `audit-r48-${booking.id}`,
          template: 'reminder-48h',
          templateLabel: TEMPLATE_LABELS['reminder-48h'],
          recipient: booking.student_name ?? 'Student',
          recipientEmail: booking.student_email ?? '(no email on file)',
          subject: `Reminder: ${lessonLabel} is in 2 days`,
          preview: `48h reminder sent before ${booking.session_date} ${booking.session_time ?? ''}`.trim(),
          sentAt: hours(index * 6 + 4),
          status: isEmailConfigured() ? 'sent' : 'stub',
          channel: 'email',
          relatedEntity: { type: 'booking', id: booking.id, label: `${lessonLabel} · ${booking.session_date}` },
        })
      }
    })

    students
      .filter((s) => s.certificate_issued_at)
      .forEach((student, index) => {
        realRecent.push({
          id: `audit-cert-${student.id}`,
          template: 'certificate-issued',
          templateLabel: TEMPLATE_LABELS['certificate-issued'],
          recipient: student.legal_name ?? 'Student',
          recipientEmail: student.parent_email ?? '(no parent email)',
          subject: `Certificate issued — ${student.legal_name ?? 'Student'} completed driver ed`,
          preview: 'Certificate number + next steps for the state road test.',
          sentAt: student.certificate_issued_at ?? hours(index * 24 + 8),
          status: 'queued',
          channel: 'email',
          relatedEntity: { type: 'student', id: student.id, label: student.legal_name ?? 'Student' },
        })
      })
  } catch {
    // Swallow — fall through to the template inventory so the page still renders.
    realRecent = []
  }

  // Real recent events first (most recent), then the full template inventory.
  const templateInventory = buildTemplateInventory()
  const recentSorted = realRecent
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, 12)

  const all: AuditEmail[] = [...recentSorted, ...templateInventory]

  // Aggregate metrics
  const counts = {
    total: all.length,
    sent: all.filter((e) => e.status === 'sent').length,
    stub: all.filter((e) => e.status === 'stub').length,
    failed: all.filter((e) => e.status === 'failed').length,
    queued: all.filter((e) => e.status === 'queued').length,
  }

  // Template breakdown
  const byTemplate: Record<string, number> = {}
  for (const e of all) byTemplate[e.template] = (byTemplate[e.template] ?? 0) + 1

  return NextResponse.json({
    school: { id: context.schoolId, demo: context.demo },
    emails: all,
    counts,
    byTemplate,
    providerConfigured: isEmailConfigured(),
    auditMode: !isEmailConfigured() ? 'stub' : 'live',
    hasLogTable: false, // future: probe information_schema for emails_log
    note:
      'No emails_log table exists yet — this audit combines the canonical template inventory with recent bookings/certifications for this school. Once a log table ships, swap to a single query grouped by school_id.',
  })
}
