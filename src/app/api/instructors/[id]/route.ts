import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: instructor, error } = await supabase
    .from('instructors')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !instructor) {
    return new NextResponse('Instructor not found', { status: 404 })
  }

  return NextResponse.json(instructor)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const schoolId = request.headers.get('x-school-id')
  if (!schoolId) return new NextResponse('Missing x-school-id header', { status: 400 })

  // Fix F: Explicit ownership check before update
  const { data: existing } = await supabase
    .from('instructors')
    .select('id, school_id')
    .eq('id', id)
    .single()

  if (!existing || existing.school_id !== schoolId) {
    return new NextResponse('Instructor not found', { status: 404 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: updated, error } = await supabaseAdmin
    .from('instructors')
    .update({
      name: body.name,
      email: body.email,
      phone: body.phone,
      license_number: body.license_number,
      license_expiry: body.license_expiry,
      active: body.active ?? true,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  await supabaseAdmin.from('audit_logs').insert(
    auditLog('INSTRUCTOR_UPDATED', user.id, {
      instructor_id: id,
      school_id: schoolId,
      updated_fields: Object.keys(body),
    })
  )

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const schoolId = _request.headers.get('x-school-id')
  if (!schoolId) return new NextResponse('Missing x-school-id header', { status: 400 })

  // Fix F: Explicit ownership check before delete
  const { data: existing } = await supabase
    .from('instructors')
    .select('id, school_id')
    .eq('id', id)
    .single()

  if (!existing || existing.school_id !== schoolId) {
    return new NextResponse('Instructor not found', { status: 404 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { error } = await supabaseAdmin
    .from('instructors')
    .update({ active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 })
  }

  await supabaseAdmin.from('audit_logs').insert(
    auditLog('INSTRUCTOR_DEACTIVATED', user.id, { instructor_id: id, school_id: schoolId })
  )

  return new NextResponse('OK')
}
