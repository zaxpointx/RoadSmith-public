import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import {
  getComplianceRollup,
  getStudentComplianceSummary,
  TENNESSEE_TEEN_DRIVER_FORMS,
} from '@/lib/compliance/tennessee-teen-driver-forms'
import { resolveSchoolAdminContext } from '@/lib/school-admin/auth'

const DEFAULT_WIDGETS = [
  'todays_lessons',
  'pending_bookings',
  'open_seats',
  'balances_due',
  'students_need_action',
  'compliance_ready',
  'monthly_revenue',
  'completion_rate',
]

type DashboardStudent = {
  id: string
  legal_name: string
  dob?: string | null
  permit_number?: string | null
  parent_email?: string | null
  classroom_hours?: number | null
  driving_hours?: number | null
  certificate_issued_at?: string | null
  enrollment_date?: string | null
  status?: string | null
}

type DashboardBooking = {
  status: string | null
  payment_status: string | null
  deposit_amount_cents: number | null
  balance_due_cents: number | null
  created_at: string | null
}

type DashboardSession = {
  start_date: string
  max_seats: number | null
  seats_booked: number | null
  status: string | null
  instructor: { id: string } | null
}

type DashboardWidget = {
  widget_key: string
  enabled: boolean
  display_order: number
  size: string
}

type WidgetInput = {
  widget_key?: unknown
  enabled?: unknown
  display_order?: unknown
  size?: unknown
}

type WidgetInputWithKey = WidgetInput & { widget_key: string }

function hasWidgetKey(widget: WidgetInput): widget is WidgetInputWithKey {
  return typeof widget.widget_key === 'string'
}

function centsTotal(rows: { deposit_amount_cents?: number | null; balance_due_cents?: number | null }[], field: 'deposit_amount_cents' | 'balance_due_cents') {
  return rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0)
}

function statusCount(students: { status?: string | null; certificate_issued_at?: string | null }[]) {
  return students.filter((student) => student.status === 'pending' || !student.certificate_issued_at).length
}

export async function GET(request: Request) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const today = new Date().toISOString().slice(0, 10)

  const [
    schoolResult,
    studentsResult,
    sessionsResult,
    bookingsResult,
    instructorsResult,
    widgetsResult,
  ] = await Promise.all([
    admin.from('schools').select('id, name, slug, phone, state, subscription_status, timezone, booking_min_notice_hours, booking_max_days_ahead').eq('id', context.schoolId).maybeSingle(),
    admin.from('students_driver_ed').select('id, legal_name, dob, permit_number, parent_email, classroom_hours, driving_hours, certificate_issued_at, enrollment_date, status').eq('school_id', context.schoolId),
    admin.from('sessions').select('id, start_date, start_time, end_date, max_seats, seats_booked, status, location, instructor:instructors(id, name), session_type:session_types(id, name, duration_minutes, color)').eq('school_id', context.schoolId).order('start_date', { ascending: true }).limit(30),
    admin.from('bookings').select('id, status, payment_status, deposit_amount_cents, balance_due_cents, created_at, student_name, session_date, session_time').eq('school_id', context.schoolId).order('created_at', { ascending: false }).limit(40),
    admin.from('instructors').select('id, name, active').eq('school_id', context.schoolId),
    admin.from('dashboard_widget_preferences').select('widget_key, enabled, display_order, size').eq('school_id', context.schoolId).eq('role', 'admin').order('display_order', { ascending: true }),
  ])

  const school = schoolResult.data ?? { id: context.schoolId, name: 'Roadsmith' }
  const students = (studentsResult.data ?? []) as unknown as DashboardStudent[]
  const sessions = (sessionsResult.data ?? []) as unknown as DashboardSession[]
  const bookings = (bookingsResult.data ?? []) as unknown as DashboardBooking[]
  const instructors = instructorsResult.data ?? []

  const confirmedBookings = bookings.filter((booking) => ['confirmed', 'paid'].includes(booking.status ?? '') || booking.payment_status === 'paid')
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length
  const monthlyRevenue = centsTotal(confirmedBookings.filter((booking) => String(booking.created_at ?? '') >= monthStart), 'deposit_amount_cents') / 100
  const balancesDue = centsTotal(bookings, 'balance_due_cents') / 100
  const scheduledSessions = sessions.filter((session) => session.status !== 'cancelled' && session.status !== 'canceled')
  const completedSessions = sessions.filter((session) => session.status === 'completed').length
  const completionRate = scheduledSessions.length ? Math.round((completedSessions / scheduledSessions.length) * 100) : 0
  const todaysSessions = sessions.filter((session) => String(session.start_date).slice(0, 10) === today)
  const instructorsOnDuty = new Set(todaysSessions.map((session) => session.instructor?.id).filter(Boolean)).size
  const openSeats = sessions.reduce((sum, session) => sum + Math.max(0, Number(session.max_seats ?? 0) - Number(session.seats_booked ?? 0)), 0)
  const complianceSummaries = students.map((student) => getStudentComplianceSummary(student))
  const complianceRollup = getComplianceRollup(complianceSummaries)
  const complianceReady = complianceRollup.reduce((sum, form) => sum + form.ready, 0)

  // School-wide compliance readiness (ROA-11): real data from the compliance library
  // Computed from every student's per-form status, not hardcoded.
  const totalStudents = complianceSummaries.length
  const fullyReady = complianceSummaries.filter((s) => s.readyCount === TENNESSEE_TEEN_DRIVER_FORMS.length).length
  const studentsBlocked = complianceSummaries.filter((s) => s.blockedCount > 0).length
  const studentsNeedingInfo = complianceSummaries.filter((s) => s.needsInfoCount > 0).length
  const fullyCompletePct = totalStudents > 0 ? Math.round((fullyReady / totalStudents) * 100) : 0
  const formTotals = complianceRollup.reduce(
    (acc, form) => {
      acc.ready += form.ready
      acc.needsInfo += form.needsInfo
      acc.blocked += form.blocked
      return acc
    },
    { ready: 0, needsInfo: 0, blocked: 0 },
  )
  const totalFormChecks = formTotals.ready + formTotals.needsInfo + formTotals.blocked
  const formReadyPct = totalFormChecks > 0 ? Math.round((formTotals.ready / totalFormChecks) * 100) : 0

  // Missing documents frequency (top offenders) — counted from real per-form missing[] arrays
  const missingCounts = new Map<string, number>()
  for (const summary of complianceSummaries) {
    for (const form of summary.forms) {
      for (const item of form.missing) {
        missingCounts.set(item, (missingCounts.get(item) ?? 0) + 1)
      }
    }
  }
  const missingDocuments = Array.from(missingCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const widgetRows = Array.isArray(widgetsResult.data) && widgetsResult.data.length
    ? widgetsResult.data as unknown as DashboardWidget[]
    : DEFAULT_WIDGETS.map((widget_key, index) => ({ widget_key, enabled: true, display_order: index, size: 'normal' }))

  // Activation progress
  const schoolDetails = schoolResult.data as unknown as { subscription_status?: string | null; slug?: string | null }
  const hasStripeConnected = ['active', 'trialing'].includes(schoolDetails.subscription_status ?? '')
  const hasBookingLink = Boolean(schoolDetails.slug)
  const { data: sessionTypesData } = await admin.from('session_types').select('id').eq('school_id', context.schoolId).limit(1)
  const hasSessionTypes = Boolean(sessionTypesData?.length)
  const hasInstructors = instructors.length > 0
  const hasStudents = students.length > 0
  const activationSteps = [
    { key: 'import_students', label: 'Import students', done: hasStudents, href: '/school-admin/students', icon: 'Users' },
    { key: 'add_instructors', label: 'Add instructors', done: hasInstructors, href: '/school-admin/instructors', icon: 'Users' },
    { key: 'define_session_types', label: 'Define session types', done: hasSessionTypes, href: '/school-admin/settings', icon: 'Calendar' },
    { key: 'connect_stripe', label: 'Connect Stripe', done: hasStripeConnected, href: '/school-admin/billing', icon: 'CreditCard' },
    { key: 'publish_booking_link', label: 'Publish booking link', done: hasBookingLink, href: '/school-admin/settings', icon: 'Link' },
  ]
  const activationProgress = {
    steps: activationSteps,
    completedCount: activationSteps.filter((s) => s.done).length,
    totalCount: activationSteps.length,
  }

  return NextResponse.json({
    school,
    stats: {
      totalStudents: students.length,
      monthlyRevenue,
      completionRate,
      activeSessions: scheduledSessions.length,
    },
    operationalMetrics: {
      todaysLessons: todaysSessions.length,
      pendingBookings,
      openSeats,
      balancesDue,
      studentsNeedAction: statusCount(students),
      instructorsOnDuty,
      complianceReady,
    },
    widgets: widgetRows,
    upcomingSessions: sessions.slice(0, 8),
    recentBookings: bookings.slice(0, 6),
    instructors,
    complianceRollup,
    complianceReadiness: {
      totalStudents,
      fullyReady,
      fullyCompletePct,
      formReadyPct,
      totalFormChecks,
      readyChecks: formTotals.ready,
      needsInfoChecks: formTotals.needsInfo,
      blockedChecks: formTotals.blocked,
      studentsBlocked,
      studentsNeedingInfo,
      missingDocuments,
    },
    activationProgress,
  })
}

export async function PATCH(request: Request) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const widgets = Array.isArray(body.widgets) ? body.widgets : []
  const admin = getSupabaseAdmin()

  const rows = (widgets as WidgetInput[])
    .filter(hasWidgetKey)
    .map((widget, index) => ({
      school_id: context.schoolId,
      user_id: context.userId,
      role: 'admin',
      widget_key: widget.widget_key,
      enabled: Boolean(widget.enabled),
      display_order: Number(widget.display_order ?? index),
      size: typeof widget.size === 'string' ? widget.size : 'normal',
      updated_at: new Date().toISOString(),
    }))

  if (!rows.length) return NextResponse.json({ error: 'No widgets provided' }, { status: 400 })

  const { data, error } = await admin
    .from('dashboard_widget_preferences')
    .upsert(rows, { onConflict: 'school_id,role,widget_key,user_id' })
    .select('widget_key, enabled, display_order, size')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ widgets: data ?? rows })
}
