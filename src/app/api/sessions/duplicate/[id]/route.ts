import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { auditLog } from '@/lib/security'

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabaseAdmin = getSupabaseAdmin()

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return new NextResponse('Unauthorized', { status: 401 })
  const token = authHeader.slice(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return new NextResponse('Invalid token', { status: 401 })

  const schoolId = request.headers.get('x-school-id')
  if (!schoolId) return new NextResponse('Missing x-school-id', { status: 400 })

  // Verify ownership
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('owner_email', user.email)
    .single()
  if (!school) return new NextResponse('Forbidden', { status: 403 })

  // Get original session
  const { data: original, error: fetchError } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()

  if (fetchError || !original) {
    return new NextResponse('Session not found', { status: 404 })
  }

  const body = await request.json()
  const weeks = Math.max(1, Math.min(12, body.weeks ?? 1))

  // Duplicate for N weeks forward (7-day intervals)
  const inserts = []
  for (let i = 1; i <= weeks; i++) {
    const newDate = new Date(original.start_date)
    newDate.setDate(newDate.getDate() + i * 7)
    // Compute new end_date if original has one (preserve duration)
    let newEndDate: string | null = null
    if (original.end_date) {
      const origEnd = new Date(original.end_date)
      const origStart = new Date(original.start_date)
      const durationDays = Math.round((origEnd.getTime() - origStart.getTime()) / (1000 * 60 * 60 * 24))
      const newEnd = new Date(newDate)
      newEnd.setDate(newEnd.getDate() + durationDays)
      newEndDate = newEnd.toISOString().split('T')[0]
    }

    inserts.push({
      school_id: schoolId,
      start_date: newDate.toISOString().split('T')[0],
      end_date: newEndDate,
      instructor_id: original.instructor_id,
      session_type_id: original.session_type_id,
      max_seats: original.max_seats,
      price_cents: original.price_cents,
      location: original.location,
      seats_booked: 0,
    })
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from('sessions')
    .insert(inserts)
    .select('id')

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  await supabaseAdmin.from('audit_logs').insert(
    auditLog('SESSION_DUPLICATED', user.id, {
      original_id: id,
      school_id: schoolId,
      weeks,
      created_count: created.length,
    })
  )

  return NextResponse.json({ created: created.length, session_ids: created.map((s: { id: string }) => s.id) })
}