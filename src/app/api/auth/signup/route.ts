import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { createHmac } from 'crypto'

/**
 * POST /api/auth/signup
 *
 * Creates a Supabase auth user AND a school record in one atomic flow.
 * Immediately sets a session cookie and redirects to /school-admin.
 * Spotify-style: sign up → in, no second step.
 *
 * Body: { schoolName, ownerName, email, password }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { schoolName, ownerName, email, password } = body

  if (!schoolName || !email) {
    return NextResponse.json({ error: 'schoolName and email required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  // Trust forwarded origin (Vercel sets x-forwarded-host/proto), fall back to request origin
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const requestOrigin = request.headers.get('origin')
  const origin = requestOrigin
    ?? (forwardedHost ? `${forwardedProto}://${forwardedHost}` : `http://localhost:3000`)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const jwtSecret = process.env.SUPABASE_JWT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  const projectRef = supabaseUrl.split('//')[1]!.split('.')[0]!
  const isSecure = process.env.NODE_ENV === 'production'

  const slug =
    schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) +
    '-' +
    Date.now().toString(36)

  // 1. Create Supabase auth user
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: password || undefined,
    email_confirm: true,
    user_metadata: { owner_name: ownerName, school_name: schoolName },
  })

  if (authError) {
    if (authError.message?.includes('already registered')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  if (!authUser.user) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }

  const userId = authUser.user.id

  // 2. Check for duplicate school
  const { data: existing } = await admin
    .from('schools')
    .select('id')
    .eq('owner_email', email)
    .maybeSingle()

  if (existing) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return NextResponse.json(
      { error: 'A school with this email already exists' },
      { status: 409 }
    )
  }

  // 3. Create school
  const { data: school, error: schoolError } = await admin
    .from('schools')
    .insert({
      name: schoolName,
      slug,
      owner_email: email,
      owner_name: ownerName ?? null,
      plan_tier: 'starter',
      subscription_status: 'trial',
      active: true,
      owner_user_id: userId,
    })
    .select('id, name, slug')
    .single()

  if (schoolError || !school) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return NextResponse.json(
      { error: schoolError?.message ?? 'Failed to create school' },
      { status: 500 }
    )
  }

  // 4. Set school_id in user_metadata so RLS works immediately
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { school_id: school.id },
  })

  // 5. Welcome email (non-blocking)
  try {
    await sendWelcomeEmail(email, schoolName, school.id)
  } catch {
    console.log('[signup] Welcome email send failed (non-blocking)')
  }

  // 6. Create session JWT and set cookies — Spotify style, no second step
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 7 * 24 * 60 * 60 // 7 days

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: `${supabaseUrl}/auth/v1`,
    sub: userId,
    aud: 'authenticated',
    exp,
    iat: now,
    email,
    role: 'authenticated',
    cust_uid: userId,
  })).toString('base64url')

  const sig = createHmac('sha256', jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  const jwt = `${header}.${payload}.${sig}`

  // Build response with session cookies → redirect to school-admin
  const response = NextResponse.redirect(`${origin}/school-admin`, { status: 303 })

  // Access token cookie
  response.cookies.set(`sb-${projectRef}-access-token`, jwt, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  // Refresh token cookie
  const refreshPayload = Buffer.from(JSON.stringify({
    token: jwt,
    expiresAt: exp * 1000,
    expires: exp,
    email,
    lastRefreshedAt: now * 1000,
  })).toString('base64url')

  response.cookies.set(`sb-${projectRef}-refresh-token`, refreshPayload, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}
