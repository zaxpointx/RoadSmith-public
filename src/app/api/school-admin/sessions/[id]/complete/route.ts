import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getStudentComplianceSummary } from '@/lib/compliance/tennessee-teen-driver-forms'
import { insertActivityLog, resolveSchoolAdminContext } from '@/lib/school-admin/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const admin = getSupabaseAdmin() as unknown as SupabaseClient

  const sessionUpdates = {
    status: 'completed',
    result_status: body.result_status ?? 'completed',
    miles_driven: body.miles_driven ?? null,
    skills_practiced: Array.isArray(body.skills_practiced) ? body.skills_practiced : [],
    instructor_notes: body.instructor_notes ?? null,
    parent_visible_notes: body.parent_visible_notes ?? null,
  }

  let sessionResult = await admin
    .from('sessions')
    .update(sessionUpdates)
    .eq('id', id)
    .eq('school_id', context.schoolId)
    .select('id, instructor_id, session_type_id')
    .single()

  if (sessionResult.error) {
    sessionResult = await admin
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', id)
      .eq('school_id', context.schoolId)
      .select('id, instructor_id, session_type_id')
      .single()
  }

  if (sessionResult.error || !sessionResult.data) {
    return NextResponse.json({ error: sessionResult.error?.message ?? 'Session not found' }, { status: 500 })
  }

  if (body.student_id && (body.driving_hours || body.classroom_hours)) {
    const { data: student } = await admin
      .from('students_driver_ed')
      .select('id, legal_name, dob, permit_number, parent_email, classroom_hours, driving_hours, night_hours, certificate_issued_at, enrollment_date')
      .eq('id', body.student_id)
      .eq('school_id', context.schoolId)
      .single()

    if (student) {
      const drivingHours = Number(student.driving_hours ?? 0) + Number(body.driving_hours ?? 0)
      const classroomHours = Number(student.classroom_hours ?? 0) + Number(body.classroom_hours ?? 0)
      // Night hours cannot exceed total driving hours
      const rawNightHours = Number(student.night_hours ?? 0) + Number(body.night_driving_hours ?? 0)
      const nightHours = Math.min(rawNightHours, drivingHours)
      await admin
        .from('students_driver_ed')
        .update({ driving_hours: drivingHours, classroom_hours: classroomHours, night_hours: nightHours })
        .eq('id', body.student_id)
        .eq('school_id', context.schoolId)

      const summary = getStudentComplianceSummary({ ...student, driving_hours: drivingHours, classroom_hours: classroomHours, night_hours: nightHours })
      await admin.from('student_compliance_status').upsert({
        school_id: context.schoolId,
        student_id: body.student_id,
        sf_1010_ready: summary.forms.find((form) => form.id === 'SF-1010')?.status === 'ready',
        sf_1256_ready: summary.forms.find((form) => form.id === 'SF-1256')?.status === 'ready',
        sf_0259_ready: summary.forms.find((form) => form.id === 'SF-0259')?.status === 'ready',
        permit_verified: Boolean(student.permit_number && student.permit_number !== 'PENDING'),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'school_id,student_id' })
    }
  }

  await insertActivityLog({
    schoolId: context.schoolId,
    actorType: context.demo ? 'demo_admin' : 'admin',
    actorId: context.userId,
    eventType: 'SESSION_COMPLETED',
    entityType: 'session',
    entityId: id,
    message: 'Session completed and progress logged',
    metadata: { student_id: body.student_id ?? null },
  })

  return NextResponse.json({ success: true, session: sessionResult.data })
}
