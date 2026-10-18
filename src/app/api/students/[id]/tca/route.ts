import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'
import type { StudentsDriverEd } from '@/lib/supabase/types'


// Tennessee T.C.A. § 40-35-102 requires 30 hours classroom + 20 hours behind-the-wheel for initial driver education

interface StudentProgress {
  id: string
  legal_name_decrypted?: string
  classroom_hours: number
  driving_hours: number
  dob: string
  certificate_issued_at: string | null
  enrollment_date: string
}

function calculateTCAProgress(student: StudentProgress) {
  const REQUIRED_CLASSROOM = 30  // T.C.A. minimum classroom hours
  const REQUIRED_DRIVING = 20     // T.C.A. minimum behind-the-wheel hours

  const classroom_pct = Math.min(100, Math.round((student.classroom_hours / REQUIRED_CLASSROOM) * 100))
  const driving_pct = Math.min(100, Math.round((student.driving_hours / REQUIRED_DRIVING) * 100))

  const total_required = REQUIRED_CLASSROOM + REQUIRED_DRIVING
  const total_completed = student.classroom_hours + student.driving_hours
  const overall_pct = Math.min(100, Math.round((total_completed / total_required) * 100))

  const can_issue_certificate =
    student.classroom_hours >= REQUIRED_CLASSROOM &&
    student.driving_hours >= REQUIRED_DRIVING &&
    student.certificate_issued_at === null

  return {
    required_classroom: REQUIRED_CLASSROOM,
    required_driving: REQUIRED_DRIVING,
    classroom_hours: student.classroom_hours,
    driving_hours: student.driving_hours,
    classroom_pct,
    driving_pct,
    overall_pct,
    can_issue_certificate,
    tca_compliant: student.certificate_issued_at !== null,
    age_years: student.dob
      ? Math.floor((Date.now() - new Date(student.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const schoolId = request.headers.get('x-school-id')
  const supabaseAdmin = getSupabaseAdmin()!

  const { data: student, error } = await supabaseAdmin
    .from('students_driver_ed')
    .select('*')
    .eq('id', id)
    .eq('school_id', schoolId as string)
    .single() as { data: StudentsDriverEd | null; error: { message: string } | null }

  if (error || !student) {
    return new NextResponse('Student not found', { status: 404 })
  }

  const progress = calculateTCAProgress(student as unknown as StudentProgress)

  return NextResponse.json({ student_id: id, progress })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const schoolId = request.headers.get('x-school-id')
  const body = await request.json()
  const { classroom_hours, driving_hours } = body

  const supabaseAdmin = getSupabaseAdmin()!

  // Get current student
  const { data: student } = await supabaseAdmin
    .from('students_driver_ed')
    .select('*')
    .eq('id', id)
    .eq('school_id', schoolId as string)
    .single() as { data: StudentsDriverEd | null; error: { message: string } | null }

  if (!student) return new NextResponse('Student not found', { status: 404 })

  // Update hours
  const updates: Record<string, unknown> = {}
  if (classroom_hours !== undefined) updates.classroom_hours = classroom_hours
  if (driving_hours !== undefined) updates.driving_hours = driving_hours

  // Check if now eligible for certificate
  const REQUIRED_CLASSROOM = 30
  const REQUIRED_DRIVING = 20
  const newClassroom = classroom_hours ?? student.classroom_hours
  const newDriving = driving_hours ?? student.driving_hours

  if (
    newClassroom >= REQUIRED_CLASSROOM &&
    newDriving >= REQUIRED_DRIVING &&
    !student.certificate_issued_at &&
    body.issue_certificate
  ) {
    updates.certificate_issued_at = new Date().toISOString()
  }

  const { data: updated, error } = await supabaseAdmin
    .from('students_driver_ed')
    .update(updates)
    .eq('id', id)
    .eq('school_id', schoolId as string)
    .select()
    .single() as { data: StudentsDriverEd | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: (error as { message?: string }).message }, { status: 500 })

  const progress = calculateTCAProgress(updated as unknown as StudentProgress)

  const logEntry = auditLog(
    body.issue_certificate ? 'CERTIFICATE_ISSUED' : 'STUDENT_HOURS_UPDATED',
    user.id,
    {
      student_id: id,
      school_id: schoolId as string,
      classroom_hours: newClassroom,
      driving_hours: newDriving,
      certificate_issued: !!updates.certificate_issued_at,
    }
  )

  await supabaseAdmin.from('audit_logs').insert(logEntry)

  return NextResponse.json({ student_id: id, progress })
}