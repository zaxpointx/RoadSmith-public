import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { resolveSchoolAdminContext } from '@/lib/school-admin/auth'

export async function GET(request: Request) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('activity_log')
    .select('id, event_type, entity_type, entity_id, message, metadata, created_at')
    .eq('school_id', context.schoolId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!error) return NextResponse.json({ activity: data ?? [] })

  const fallback = await admin
    .from('bookings')
    .select('id, student_name, status, created_at')
    .eq('school_id', context.schoolId)
    .order('created_at', { ascending: false })
    .limit(10)

  const activity = (fallback.data ?? []).map((booking) => ({
    id: booking.id,
    event_type: 'BOOKING_ACTIVITY',
    entity_type: 'booking',
    entity_id: booking.id,
    message: `${booking.student_name ?? 'A student'} booking is ${booking.status ?? 'updated'}`,
    created_at: booking.created_at,
  }))

  return NextResponse.json({ activity })
}
