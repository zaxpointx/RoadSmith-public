import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { encryptField, decryptField, validatePhone, validateEmail, auditLog } from '@/lib/security'
import type { StudentsDriverEd } from '@/lib/supabase/types'

type StudentRow = Pick<StudentsDriverEd, 'id' | 'legal_name' | 'dob' | 'permit_number' | 'parent_email' | 'emergency_contact_name' | 'emergency_contact_phone' | 'driving_hours' | 'classroom_hours' | 'certificate_issued_at' | 'created_at' | 'school_id'> & { enrollment_date?: string | null; status?: string | null; instructor_id?: string | null; owner_email?: string | null; name?: string | null; phone?: string | null }

// NOTE: students_driver_ed has NO deleted_at column.
// DELETE performs a hard delete. To add soft-delete: add migration.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = getSupabaseAdmin()

  // Use any: generated types don't match actual DB schema
  const { data: student, error } = await admin
    .from('students_driver_ed')
    .select('id, legal_name, dob, permit_number, parent_email, emergency_contact_name, emergency_contact_phone, driving_hours, classroom_hours, certificate_issued_at, enrollment_date, created_at, school_id, status, instructor_id')
    .eq('id', id)
    .single() as { data: StudentRow | null; error: { message: string } | null }

  if (error || !student) {
    return new NextResponse('Student not found', { status: 404 })
  }

  // Decrypt for admin view
  const decryptedName = student.legal_name ? await decryptField(student.legal_name) : '[unknown]'
  const decryptedPermit = student.permit_number && student.permit_number !== 'PENDING' ? await decryptField(student.permit_number) : ''
  const decryptedPhone = student.emergency_contact_phone ? await decryptField(student.emergency_contact_phone) : ''

  return NextResponse.json({
    ...student,
    full_name: decryptedName,
    enrollment_status: student.status ?? 'pending',
    primary_instructor_id: student.instructor_id ?? null,
    legal_name: decryptedName,
    permit_number: decryptedPermit,
    emergency_contact_phone: decryptedPhone,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = getSupabaseAdmin()
  const body = await request.json()
  const nextStatus = body.status

  if (!['active', 'rejected'].includes(nextStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  let schoolId: string | null = request.headers.get('x-school-id')
  let instructorId: string | null = request.headers.get('x-instructor-id')
  let actorId = instructorId ?? 'system'

  if (!schoolId) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return new NextResponse('Unauthorized', { status: 401 })

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return new NextResponse('Invalid token', { status: 401 })
    actorId = user.id as string

    if (user.email) {
      const { data: instructor } = await admin
        .from('instructors')
        .select('id, school_id')
        .eq('email', user.email)
        .maybeSingle()

      if (instructor) {
        instructorId = instructor.id
        schoolId = instructor.school_id
      }
    }

    if (!schoolId && user.email) {
      const { data: schools } = await admin
        .from('schools')
        .select('id')
        .eq('owner_email', user.email)
        .limit(1) as { data: { id: string }[] | null; error: { message: string } | null }
      if (schools?.length) schoolId = schools[0].id as string
    }
  }

  if (!schoolId) return new NextResponse('Forbidden', { status: 403 })

  let query = admin
    .from('students_driver_ed')
    .update({ status: nextStatus })
    .eq('id', id)
    .eq('school_id', schoolId)

  if (instructorId) query = query.eq('instructor_id', instructorId)

  const { data: updated, error } = await query
    .select('id, status')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  await admin.from('audit_logs').insert(
    auditLog('STUDENT_STATUS_UPDATED', actorId, {
      student_id: id,
      school_id: schoolId,
      status: nextStatus,
    })
  )

  return NextResponse.json({ id: updated.id, status: updated.status, success: true })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = getSupabaseAdmin()

  // Auth: x-school-id header (set by middleware in demo mode) OR Bearer token (production)
  let schoolId: string | null = request.headers.get('x-school-id')
  let ownerEmail: string | null = null
  let actorId: string = 'system'

  if (schoolId) {
    // Demo mode / instructor dashboard: x-school-id already validated by middleware
    const { data: school } = await admin
      .from('schools')
      .select('owner_email')
      .eq('id', schoolId)
      .single() as { data: StudentRow | null; error: { message: string } | null }
    if (!school) return new NextResponse('Forbidden', { status: 403 })
    ownerEmail = school.owner_email ?? null
  } else {
    // Production mode: Bearer token auth
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return new NextResponse('Unauthorized', { status: 401 })
    const token = authHeader.slice(7)

    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return new NextResponse('Invalid token', { status: 401 })
    ownerEmail = user.email ?? null
    actorId = user.id as string

    // Resolve school_id from user's school ownership
    if (!user.email) return new NextResponse('Forbidden', { status: 403 })
    const { data: schools } = await admin
      .from('schools')
      .select('id')
      .eq('owner_email', user.email!)
      .limit(1) as { data: { id: string }[] | null; error: { message: string } | null }
    if (!schools?.length) return new NextResponse('Forbidden', { status: 403 })
    schoolId = schools[0].id as string
  }

  // Verify ownership via email match
  const { data: school } = await admin
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('owner_email', ownerEmail as string)
    .single()
  if (!school) return new NextResponse('Forbidden', { status: 403 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  // Support incremental hours (used by instructor dashboard for session completion)
  // Triggers session completed email to parent after successful update
  const isHoursUpdate = body.driving_hours_to_add !== undefined

  // Email context — populated when hours are being logged, used after successful DB update
  let emailCtx: {
    parentEmail: string; studentName: string; parentName: string;
    newTotal: number; sessionDate: string; instructorName: string;
    schoolName: string; schoolPhone: string; classroomHours: number;
  } | null = null

  if (isHoursUpdate) {
    const { data: studentCtx } = await admin
      .from('students_driver_ed')
      .select('legal_name, parent_email, driving_hours, classroom_hours, school_id, instructor_id')
      .eq('id', id)
      .single() as { data: StudentRow | null; error: { message: string } | null }

    if (!studentCtx) return new NextResponse('Student not found', { status: 404 })

    let instructorName = 'Your instructor'
    if (studentCtx.instructor_id) {
      const { data: instr } = await admin
        .from('instructors')
        .select('name')
        .eq('id', studentCtx.instructor_id)
        .single() as { data: StudentRow | null; error: { message: string } | null }
      if (instr) instructorName = instr.name ?? instructorName
    }

    let schoolName = 'Roadsmith'
    let schoolPhone = ''
    if (studentCtx.school_id) {
      const { data: sch } = await admin
        .from('schools')
        .select('name, phone')
        .eq('id', studentCtx.school_id)
        .single() as { data: StudentRow | null; error: { message: string } | null }
      if (sch) { schoolName = sch.name ?? schoolName; schoolPhone = sch.phone ?? '' }
    }

    const newTotal = Math.max(0, (studentCtx.driving_hours ?? 0) + body.driving_hours_to_add)
    const sessionDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const studentName = studentCtx.legal_name
      ? await decryptField(studentCtx.legal_name)
      : 'Student'

    const parentEmail = studentCtx.parent_email ?? ''
    const parentName = parentEmail
      ? parentEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\d+/g, '').trim().split(' ')[0] || 'there'
      : 'there'

    emailCtx = { parentEmail, studentName, parentName, newTotal, sessionDate, instructorName, schoolName, schoolPhone, classroomHours: studentCtx.classroom_hours ?? 0 }

    const { data: current } = await admin
      .from('students_driver_ed')
      .select('driving_hours')
      .eq('id', id)
      .single() as { data: StudentRow | null; error: { message: string } | null }
    if (current) {
      updates.driving_hours = Math.max(0, ((current.driving_hours as number) ?? 0) + body.driving_hours_to_add)
    }
  } else if (body.driving_hours !== undefined) {
    updates.driving_hours = Math.max(0, body.driving_hours)
  }
  if (body.classroom_hours !== undefined) updates.classroom_hours = Math.max(0, body.classroom_hours)
  if (body.emergency_contact_name !== undefined) updates.emergency_contact_name = body.emergency_contact_name
  if (body.parent_email !== undefined) {
    if (body.parent_email && !validateEmail(body.parent_email).valid) {
      return NextResponse.json({ error: 'Invalid parent email' }, { status: 400 })
    }
    updates.parent_email = body.parent_email
  }

  // Allow updating instructor assignment (school-admin can assign/change instructor)
  if (body.instructor_id !== undefined) {
    updates.instructor_id = body.instructor_id ?? null
  }

  if (body.legal_name !== undefined) {
    updates.legal_name = await encryptField(body.legal_name)
  }
  if (body.permit_number !== undefined) {
    updates.permit_number = body.permit_number ? await encryptField(body.permit_number) : 'PENDING'
  }
  if (body.emergency_contact_phone !== undefined) {
    if (body.emergency_contact_phone && !validatePhone(body.emergency_contact_phone).valid) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
    }
    updates.emergency_contact_phone = body.emergency_contact_phone ? await encryptField(body.emergency_contact_phone) : null
  }

  // Certificate issuance
  if (body.issue_certificate && body.issue_certificate === true) {
    const { data: current } = await admin
      .from('students_driver_ed')
      .select('driving_hours, classroom_hours, certificate_issued_at')
      .eq('id', id)
      .single()

    if (!current) return new NextResponse('Student not found', { status: 404 })
    if (current.certificate_issued_at) return NextResponse.json({ error: 'Certificate already issued' }, { status: 400 })
    if (current.driving_hours < 20 || current.classroom_hours < 30) {
      return NextResponse.json({ error: 'Not eligible — TCA minimums not met' }, { status: 400 })
    }
    updates.certificate_issued_at = new Date().toISOString()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: updated, error } = await admin
    .from('students_driver_ed')
    .update(updates, { count: 'exact' })
    .eq('id', id)
    .eq('school_id', schoolId)
    .select('id')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  // ── Send session completed email to parent after hours logged ───────────
  if (isHoursUpdate && emailCtx?.parentEmail) {
    try {
      const { sendSessionCompletedEmail, isEmailConfigured } = await import('@/lib/email')
      if (isEmailConfigured()) {
        const hoursLogged = body.driving_hours_to_add as number
        await sendSessionCompletedEmail(
          emailCtx.parentEmail,
          emailCtx.studentName,
          emailCtx.parentName,
          hoursLogged,
          emailCtx.newTotal,
          emailCtx.classroomHours,
          emailCtx.sessionDate,
          emailCtx.instructorName,
          emailCtx.schoolName,
          emailCtx.schoolPhone,
          body.instructor_notes
        )
        await admin.from('audit_logs').insert(
          auditLog('SESSION_COMPLETED_EMAIL_SENT', actorId, {
            student_id: id,
            parent_email: emailCtx.parentEmail,
            hours_logged: hoursLogged,
            total_hours: emailCtx.newTotal,
          })
        )
      }
    } catch (emailErr) {
      // Non-blocking — email failure should not break the hours update
      console.error('[students/[id]] Failed to send session completed email:', emailErr)
    }
  }

  await admin.from('audit_logs').insert(
    auditLog(
      updates.certificate_issued_at ? 'CERTIFICATE_ISSUED' : 'STUDENT_UPDATED',
      actorId,
      { student_id: id, school_id: schoolId, updated_fields: Object.keys(updates) }
    )
  )

  return NextResponse.json({ id: updated.id, success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = getSupabaseAdmin()

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return new NextResponse('Unauthorized', { status: 401 })
  const token = authHeader.slice(7)

  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return new NextResponse('Invalid token', { status: 401 })

  const schoolId = request.headers.get('x-school-id')
  if (!schoolId) return new NextResponse('Missing x-school-id', { status: 400 })

  const { error } = await admin
    .from('students_driver_ed')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId)

  if (error) return new NextResponse('Delete failed', { status: 500 })

  await admin.from('audit_logs').insert(
    auditLog('STUDENT_DELETED', user.id, { student_id: id, school_id: schoolId })
  )

  return new NextResponse('OK')
}
