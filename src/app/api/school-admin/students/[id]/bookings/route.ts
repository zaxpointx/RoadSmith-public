import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveSchoolAdminContext } from '@/lib/school-admin/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: studentId } = await params

  // Verify the student belongs to this school
  const admin = (await import('@/lib/supabase/server')).getSupabaseAdmin() as unknown as SupabaseClient
  const { data: student } = await admin
    .from('students_driver_ed')
    .select('id')
    .eq('id', studentId)
    .eq('school_id', context.schoolId)
    .single()

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const { data: bookings, error } = await admin
    .from('bookings')
    .select(`
      id,
      session_date,
      session_time,
      status,
      payment_status,
      deposit_amount_cents,
      session_type:session_type_id(name),
      instructor:instructor_id(name)
    `)
    .eq('student_id', studentId)
    .order('session_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(bookings)
}
