import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

/**
 * POST /api/schools/update-info
 *
 * Updates school profile info (name, phone).
 * Requires session auth + school ownership.
 *
 * Body: { school_id, name?, phone? }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { school_id, name, phone } = body

  if (!school_id) {
    return NextResponse.json({ error: 'school_id required' }, { status: 400 })
  }

  // Verify ownership: user must own this school
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('id', school_id)
    .eq('owner_email', user.email)
    .single()
  if (!school) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (phone !== undefined) updates.phone = phone

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('schools')
    .update(updates)
    .eq('id', school_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
