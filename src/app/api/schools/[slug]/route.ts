/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  // Use admin client for public school page — bypasses RLS so booking info is visible
  const admin = getSupabaseAdmin()

  // Detect if slug is actually a UUID — query by id in that case
  const isUuid = slug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: school, error } = await (admin as any)
    .from('schools')
    .select('id, name, phone, state, service_zips, plan_tier')
    .eq(isUuid ? 'id' : 'slug', slug)
    .single() as { data: { id: string; name: string; phone: string; state: string; service_zips: string[]; plan_tier: string } | null; error: any }


  if (error || !school) {
    return new NextResponse('School not found', { status: 404 })
  }

  const { data: sessionTypes } = await admin
    .from('session_types')
    .select('id, name, description, duration_minutes, price_cents, deposit_cents, color, tca_hours_credit')
    .eq('school_id', school!.id)
    .eq('active', true)
    .order('price_cents', { ascending: true }) as { data: any[] | null; error: any }

  const { data: profile } = await admin
      .from('school_profiles')
      .select('tagline, about, address, city, zip, email, website, facebook, instagram')
      .eq('school_id', school!.id)
      .single() as { data: any; error: any }

  return NextResponse.json({
    school: {
      name: school.name,
      phone: school.phone,
      state: school.state,
      slug,
    },
    profile: profile ?? {},
    session_types: sessionTypes ?? [],
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && process.env.DEMO_MODE !== 'true') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const body = await request.json()
  const supabaseAdmin = getSupabaseAdmin()

  // Resolve school: if slug looks like a UUID, find by id; otherwise by slug
  const isUuid = slug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  let school: { id: string; owner_email?: string } | null = null

  if (isUuid) {
    const result = await (supabaseAdmin.from('schools') as any)
      .select('id, owner_email')
      .eq('id', slug)
      .single()
    school = result.data
  } else {
    const result = await (supabaseAdmin.from('schools') as any)
      .select('id, owner_email')
      .eq('slug', slug)
      .single()
    school = result.data
  }

  if (!school) return new NextResponse('School not found', { status: 404 })

  // Ownership check: user must own this school
  if (process.env.DEMO_MODE !== 'true' && user?.email !== school.owner_email) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { data: profile, error } = await (supabaseAdmin
      .from('school_profiles') as any)
    .upsert(
      {
        school_id: school.id,
        tagline: body.tagline ?? null,
        about: body.about ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        zip: body.zip ?? null,
        email: body.email ?? null,
        website: body.website ?? null,
        facebook: body.facebook ?? null,
        instagram: body.instagram ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'school_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (user) {
    await (supabaseAdmin.from('audit_logs') as any).insert(
      auditLog('SCHOOL_PROFILE_UPDATED', user.id, { school_id: school.id })
    )
  }

  return NextResponse.json(profile)
}