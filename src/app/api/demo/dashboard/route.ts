import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/server'

type CountResult = { count: number | null; error?: { message?: string } | null }
type SessionRow = { start_date?: string; max_seats?: number | null; seats_booked?: number | null; instructor?: { name?: string | null } | null }
type BookingRow = { deposit_amount_cents: number | null }
type SchoolSummary = { name?: string | null; slug?: string | null }
type DataResult<T> = { data: T[] | null; count?: number | null; error?: { message?: string } | null }

async function countOrZero(query: Promise<CountResult>) {
  const result = await query
  if (result.error) return 0
  return result.count ?? 0
}

/**
 * Demo-mode dashboard stats + upcoming sessions.
 * Uses service role key to bypass RLS.
 * Called by /school-admin dashboard when in demo mode.
 */
export async function GET() {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  if (!demoUserCookie?.value) {
    return NextResponse.json({ error: 'No demo session' }, { status: 401 })
  }

  let payload: { schoolId?: string }
  try {
    payload = JSON.parse(Buffer.from(demoUserCookie.value, 'base64').toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid demo session' }, { status: 401 })
  }

  const schoolId = payload?.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'No school in demo session' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Query actual column names from actual DB schema
  const [
    totalStudents,
    sessionsResult,
    completedResult,
    schoolResult,
    sessionsDataResult,
    revenueResult,
    recentBookingsResult,
    pendingBookingsResult,
    unconfirmedSessionsResult,
    needsReminderResult,
    pendingBookingSessionsResult,
  ] = await Promise.all([
    countOrZero(
      admin.from('students_driver_ed').select('id', { count: 'exact', head: true }).eq('school_id', schoolId) as unknown as Promise<CountResult>
    ),
    admin.from('sessions').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'scheduled'),
    admin.from('sessions').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'completed'),
    (admin.from('schools').select('name, slug').eq('id', schoolId).single()) as unknown as Promise<{ data: SchoolSummary | null; error?: { message?: string } | null }>,
    admin
      .from('sessions')
      .select('*, instructor:instructors(name), session_type:session_types(name)')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: true })
      .limit(8),
    admin.from('bookings').select('deposit_amount_cents').eq('school_id', schoolId).eq('status', 'confirmed').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin
      .from('bookings')
      .select('id, student_name, status, session_date, session_time, created_at, session_type:session_type_id(name), instructor:instructor_id(name)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('bookings').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'pending'),
    admin.from('sessions').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'pending'),
    admin.from('sessions').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('status', 'scheduled')
      .lt('start_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
    admin.from('bookings').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .in('status', ['pending', 'confirmed']),
  ])

  const scheduledSessions = (sessionsResult as CountResult)?.count ?? 0
  const completedSessions = (completedResult as CountResult)?.count ?? 0
  const schoolData = schoolResult as { data: SchoolSummary | null }
  const sessionsData = (sessionsDataResult as DataResult<SessionRow>)?.data ?? []
  const recentBookings = (recentBookingsResult as DataResult<unknown>)?.data ?? []
  const pendingBookingSessions = (pendingBookingSessionsResult as CountResult)?.count ?? 0
  const activeSessions = scheduledSessions || pendingBookingSessions

  // Sum confirmed booking deposits for current month (actual revenue calculation)
  const revenueRows = (revenueResult as DataResult<BookingRow>)?.data ?? []
  const monthlyRevenue = revenueRows.reduce(
    (sum: number, b: { deposit_amount_cents: number | null }) =>
      sum + (b.deposit_amount_cents ?? 0),
    0
  ) / 100

  const totalSess = (activeSessions || 0) + (completedSessions || 0)
  const completionRate = totalSess > 0 ? Math.round(((completedSessions || 0) / totalSess) * 100) : 0
  const todayStr = new Date().toISOString().split('T')[0]
  const todaysSessions = sessionsData.filter((session) => session.start_date === todayStr)
  const instructorsOnDuty = new Set(todaysSessions.map((session) => session.instructor?.name).filter(Boolean)).size
  const openSeats = sessionsData.reduce((sum: number, session) => {
    return sum + Math.max(0, (session.max_seats ?? 0) - (session.seats_booked ?? 0))
  }, 0)

  // ── Real delta calculations ──────────────────────────────────────
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()


  const [lastMonthStudents, lastMonthSessionsResult, lastMonthRevenueResult] = await Promise.all([
    countOrZero(
      admin.from('students_driver_ed').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).gte('enrollment_date', lastMonthStart).lt('enrollment_date', thisMonthStart) as unknown as Promise<CountResult>
    ),
    admin.from('sessions').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'scheduled').gte('start_date', lastMonthStart).lt('start_date', thisMonthStart),
    admin.from('bookings').select('deposit_amount_cents').eq('school_id', schoolId).eq('status', 'confirmed').gte('created_at', lastMonthStart).lt('created_at', thisMonthStart),
  ])

  const lastMonthActiveSessions = (lastMonthSessionsResult as CountResult)?.count ?? 0
  const lastMonthRevenueRows = (lastMonthRevenueResult as DataResult<BookingRow>)?.data ?? []
  const lastMonthRevenue = lastMonthRevenueRows.reduce(
    (sum: number, b: { deposit_amount_cents: number | null }) => sum + (b.deposit_amount_cents ?? 0), 0) / 100

  const studentsDeltaRaw = lastMonthStudents > 0
    ? Math.round(((totalStudents - lastMonthStudents) / lastMonthStudents) * 100) : totalStudents > 0 ? 100 : 0
  const studentsDelta = (studentsDeltaRaw >= 0 ? '+' : '') + studentsDeltaRaw + '%'

  const sessionsDeltaRaw = lastMonthActiveSessions > 0
    ? Math.round(((activeSessions - lastMonthActiveSessions) / lastMonthActiveSessions) * 100) : activeSessions > 0 ? 100 : 0
  const sessionsDelta = (sessionsDeltaRaw >= 0 ? '+' : '') + sessionsDeltaRaw + '%'

  const revenueDeltaRaw = lastMonthRevenue > 0
    ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : monthlyRevenue > 0 ? 100 : 0
  const revenueDelta = (revenueDeltaRaw >= 0 ? '+' : '') + revenueDeltaRaw + '%'

  const completionTarget = 70
  const completionDelta = (completionRate >= completionTarget ? '+' : '') + (completionRate - completionTarget) + '%'

  return NextResponse.json({
    stats: {
      totalStudents: totalStudents || 0,
      activeSessions: activeSessions || 0,
      monthlyRevenue,
      completionRate,
      studentsDelta,
      sessionsDelta,
      revenueDelta,
      completionDelta,
    },
    schoolId,
    schoolName: schoolData.data?.name || '',
    schoolSlug: schoolData.data?.slug || '',
    upcomingSessions: sessionsData || [],
    recentBookings,
    pendingBookings: (pendingBookingsResult as CountResult)?.count ?? 0,
    unconfirmedSessions: (unconfirmedSessionsResult as CountResult)?.count ?? 0,
    needsReminder: (needsReminderResult as CountResult)?.count ?? 0,
    operationalMetrics: {
      todaysLessons: todaysSessions.length,
      instructorsOnDuty,
      openSeats,
      balancesDue: ((pendingBookingsResult as CountResult)?.count ?? 0) * 75,
      studentsNeedAction: Math.max(0, Math.round((totalStudents || 0) * 0.14)),
    },
  })
}
