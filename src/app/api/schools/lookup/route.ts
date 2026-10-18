/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/schools/lookup?slug=xxx
 *
 * Resolves a school slug to its ID and basic info.
 * Used by /book/[slug] to find the school_id from a URL-friendly slug.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: school, error } = await (admin as any)
    .from('schools')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json(school)
}
