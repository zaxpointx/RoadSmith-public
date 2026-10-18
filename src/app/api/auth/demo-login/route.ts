import { NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'

/**
 * DEMO_MODE only — instant demo login bypassing magic link email requirement.
 * PIN: 0000
 *
 * Sets three cookies:
 *   demo_session  (HttpOnly) — custom session marker, read by middleware
 *   demo_user     (plain)    — readable by JS for schoolId
 *   sb-<project>-access-token — real Supabase JWT so createClient() queries work
 */
export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const { email, pin } = await request.json()

  if (pin !== '0000') return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  // SUPABASE_JWT_SECRET is the HMAC secret for signing client JWTs.
  // Fall back to service role key if not set (e.g. old Vercel deployments).
  const jwtSecret = process.env.SUPABASE_JWT_SECRET ?? serviceKey!
  const DEMO_SCHOOL_ID = process.env.DEMO_SCHOOL_ID ?? '2c749bc6-0283-4c93-8ac2-64389a5705b0' // Showcase Academy
  const projectRef = supabaseUrl.split('//')[1]!.split('.')[0]!

  // 1. Get demo school
  const schoolRes = await fetch(
    `${supabaseUrl}/rest/v1/schools?id=eq.${DEMO_SCHOOL_ID}&select=id,name,slug`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  const schools: { id: string; name: string; slug: string }[] = await schoolRes.json()
  const school = schools?.[0]
  if (!school) return NextResponse.json({ error: 'Demo school not found' }, { status: 500 })

  // 2. Create a fresh demo user per request. Each call gets a unique email so
  //    create never collides with prior demo users, and we never depend on
  //    Supabase admin list pagination. The user is then linked to the demo
  //    school as owner.
  const demoEmail = `demo-${Date.now()}-${randomBytes(4).toString('hex')}@roadsmith-demo.local`
  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ email: demoEmail, email_confirm: true, user_metadata: { school_id: school.id, demo: true } }),
  })

  if (!createRes.ok) {
    const errBody = await createRes.text().catch(() => '')
    return NextResponse.json({ error: 'Could not create demo user', detail: errBody.slice(0, 200) }, { status: 500 })
  }

  const newUser: { id: string } = await createRes.json()
  const userId = newUser.id

  const { data: instructor } = await fetch(
    `${supabaseUrl}/rest/v1/instructors?school_id=eq.${school.id}&active=eq.true&select=id,name,email&order=created_at.asc&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  ).then(async r => ({ data: r.ok ? await r.json() : [] }))
  const demoInstructor = instructor?.[0] as { id: string; name: string; email: string | null } | undefined

  // 3. Link school to user
  await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/schools?id=eq.${school.id}`, {
      method: 'PATCH',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_user_id: userId, stripe_customer_id: userId }),
    }),
    fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_metadata: { school_id: school.id } }),
    }),
  ])

  // 4. Create a real Supabase JWT for the session cookie
  // Supabase uses HS256 with SUPABASE_JWT_SECRET
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 7 * 24 * 60 * 60 // 7 days

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: `${supabaseUrl}/auth/v1`,
    sub: userId,
    aud: 'authenticated',
    exp,
    iat: now,
    email: demoEmail,
    role: 'authenticated',
    cust_uid: userId,
  })).toString('base64url')

  const sig = createHmac('sha256', jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  const jwt = `${header}.${payload}.${sig}`

  // 5. Build response with all cookies
  const response = NextResponse.json({
    success: true,
    demoMode: true,
    schoolId: school.id,
    schoolName: school.name,
    userId,
  })

  const isSecure = process.env.NODE_ENV === 'production'

  // Supabase JWT session cookie — makes createClient() work in browser
  response.cookies.set(`sb-${projectRef}-access-token`, jwt, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  // Refresh token (simplified — stores expiry, browser-side jose lib handles actual refresh)
  const refreshPayload = Buffer.from(JSON.stringify({
    token: jwt,
    expiresAt: exp * 1000,
    expires: exp,
    email: demoEmail,
    lastRefreshedAt: now * 1000,
  })).toString('base64url')
  response.cookies.set(`sb-${projectRef}-refresh-token`, refreshPayload, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  // Custom demo markers
  const demoPayload = Buffer.from(JSON.stringify({
    userId,
    schoolId: school.id,
    schoolName: school.name,
    instructorId: demoInstructor?.id ?? null,
    email: demoEmail,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString('base64')

  response.cookies.set('demo_session', demoPayload, {
    httpOnly: false,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  response.cookies.set('demo_user', demoPayload, {
    httpOnly: false,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}
