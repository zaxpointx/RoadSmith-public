import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/server'

type DemoSchool = {
  id: string
  name: string
  slug: string | null
  subscription_status: string | null
}

type QueryResult<T> = {
  data: T | null
  error: { message: string } | null
}

/**
 * Demo-mode school info (name + subscription status).
 * Used by layout.tsx to show school name in sidebar when in demo mode.
 */
export async function GET() {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  if (!demoUserCookie?.value) {
    return NextResponse.json({ error: 'No demo session' }, { status: 401 })
  }

  let payload: { schoolId?: string }
  try {
    payload = JSON.parse(Buffer.from(demoUserCookie.value, 'base64').toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid demo session' }, { status: 401 })
  }

  const schoolId = payload?.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'No school in demo session' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: school, error } = await admin
    .from('schools')
    .select('id, name, slug, subscription_status')
    .eq('id', schoolId)
    .single() as QueryResult<DemoSchool>

  if (error || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: school.id,
    name: school.name,
    slug: school.slug,
    subscription_status: school.subscription_status || 'trial',
  })
}
