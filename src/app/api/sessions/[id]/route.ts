import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*, instructor:instructors(name)')
    .eq('id', id)
    .single()

  if (error || !session) {
    return new NextResponse('Session not found', { status: 404 })
  }

  return NextResponse.json(session)
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

  // Fix E: Verify session belongs to this school before update
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, school_id')
    .eq('id', id)
    .single()

  if (!existing || existing.school_id !== schoolId) {
    return new NextResponse('Session not found', { status: 404 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: updated, error } = await (supabaseAdmin as unknown as SupabaseClient)
    .from('sessions')
    .update({
      start_date: body.start_date,
      instructor_id: body.instructor_id,
      max_seats: body.max_seats,
      price_cents: body.price_cents,
      location: body.location,
      status: body.cancelled ? 'cancelled' : 'scheduled',
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  await (supabaseAdmin as unknown as SupabaseClient).from('audit_logs').insert(
    auditLog(body.cancelled ? 'SESSION_CANCELLED' : 'SESSION_UPDATED', user.id, {
      session_id: id,
      school_id: schoolId,
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

  // Fix E: Verify session belongs to this school before delete
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, school_id')
    .eq('id', id)
    .single()

  if (!existing || existing.school_id !== schoolId) {
    return new NextResponse('Session not found', { status: 404 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { error } = await (supabaseAdmin as unknown as SupabaseClient)
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 })
  }

  await (supabaseAdmin as unknown as SupabaseClient).from('audit_logs').insert(
    auditLog('SESSION_CANCELLED', user.id, { session_id: id, school_id: schoolId })
  )

  return new NextResponse('OK')
}
