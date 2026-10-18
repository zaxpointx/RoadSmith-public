import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getStudentComplianceSummary } from '@/lib/compliance/tennessee-teen-driver-forms'
import { insertActivityLog, resolveSchoolAdminContext } from '@/lib/school-admin/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin() as unknown as SupabaseClient
  const { data: student, error } = await admin
    .from('students_driver_ed')
    .select('id, legal_name, dob, permit_number, parent_email, classroom_hours, driving_hours, night_hours, certificate_issued_at, enrollment_date')
    .eq('id', id)
    .eq('school_id', context.schoolId)
    .single()

  if (error || !student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const status = await admin
    .from('student_compliance_status')
    .select('*')
    .eq('student_id', id)
    .eq('school_id', context.schoolId)
    .maybeSingle()

  return NextResponse.json({
    summary: getStudentComplianceSummary(student),
    status: status.data ?? null,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin() as unknown as SupabaseClient
  const payload = {
    school_id: context.schoolId,
    student_id: id,
    sf_1010_ready: Boolean(body.sf_1010_ready),
    sf_1256_ready: Boolean(body.sf_1256_ready),
    sf_0259_ready: Boolean(body.sf_0259_ready),
    permit_verified: Boolean(body.permit_verified),
    required_driving_hours: Number(body.required_driving_hours ?? 50),
    required_classroom_hours: Number(body.required_classroom_hours ?? 30),
    notes: body.notes ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('student_compliance_status')
    .upsert(payload, { onConflict: 'school_id,student_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await insertActivityLog({
    schoolId: context.schoolId,
    actorType: context.demo ? 'demo_admin' : 'admin',
    actorId: context.userId,
    eventType: 'COMPLIANCE_UPDATED',
    entityType: 'student',
    entityId: id,
    message: 'Compliance readiness updated',
  })

  return NextResponse.json({ status: data })
}
