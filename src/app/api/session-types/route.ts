import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { validateRequired } from '@/lib/validation'

/**
 * GET /api/session-types?school_id=xxx
 *
 * Returns all active session types for a school.
 * DEMO_MODE: uses service role key (bypasses RLS).
 * Non-demo: uses authenticated user's client.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get('school_id')

  if (!schoolId) {
    return NextResponse.json({ error: 'school_id required' }, { status: 400 })
  }

  const isDemoMode = process.env.DEMO_MODE === 'true'
  const client = isDemoMode ? getSupabaseAdmin() : await createClient()

  const { data: types, error } = await (client as unknown as SupabaseClient)
    .from('session_types')
    .select('id, name, description, duration_minutes, price_cents, deposit_cents, color, tca_hours_credit')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('price_cents', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(types ?? [])
}

/**
 * POST /api/session-types
 *
 * Create a new session type for a school.
 * Uses service role admin client.
 *
 * Body: { school_id, name, deposit_cents, duration_minutes, price_cents }
 * Headers: x-school-id (or body.school_id)
 */
export async function POST(request: Request) {
  const body = await request.json()
  const schoolId = body.school_id || request.headers.get('x-school-id')

  if (!schoolId) {
    return NextResponse.json({ error: 'school_id required in body or x-school-id header' }, { status: 400 })
  }

  validateRequired(body, ['name'])

  const { name, description, deposit_cents, duration_minutes, price_cents, color, tca_hours_credit } = body

  const admin = getSupabaseAdmin()
  const { data: sessionType, error } = await (admin as unknown as SupabaseClient)
    .from('session_types')
    .insert({
      school_id: schoolId,
      name,
      description: description ?? null,
      deposit_cents: deposit_cents ?? 0,
      duration_minutes: duration_minutes ?? 60,
      price_cents: price_cents ?? deposit_cents ?? 0,
      color: color ?? null,
      tca_hours_credit: tca_hours_credit ?? null,
      active: true,
    })
    .select('id, name, duration_minutes, deposit_cents, price_cents')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(sessionType, { status: 201 })
}
