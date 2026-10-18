/**
 * Auth Middleware — protects /school-admin/* and /instructor/* routes
 */
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Guard /school-admin/* routes ──────────────────────────────────────────
  if (pathname.startsWith('/school-admin')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const schoolId = user.user_metadata?.school_id
    if (!schoolId) return NextResponse.next()

    // Use service role key — bypasses RLS so we can read any school's status
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: school } = await adminClient
      .from('schools')
      .select('subscription_status')
      .eq('id', schoolId)
      .single()

    const status = school?.subscription_status

    if (status === 'active' || status === 'trial' || status === 'trialing') {
      const response = NextResponse.next()
      response.headers.set('x-school-id', schoolId)
      response.headers.set('x-user-id', user.id)
      response.headers.set('x-subscription-status', status ?? 'unknown')
      return response
    }

    if (status === 'canceled' || status === 'past_due' || status === 'cancelled') {
      const billingUrl = new URL('/school-admin/billing', request.url)
      billingUrl.searchParams.set('reason', status)
      return NextResponse.redirect(billingUrl)
    }

    // New signup with no status yet → let them through (trial by default)
    const response = NextResponse.next()
    response.headers.set('x-school-id', schoolId)
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-subscription-status', 'trial')
    return response
  }

  // ── Redirect /onboarding to /school-admin if user already has a school ──
  if (pathname === '/onboarding' || pathname.startsWith('/onboarding/')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.school_id) {
      return NextResponse.redirect(new URL('/school-admin', request.url))
    }
  }

  // ── Guard /instructor/* routes (skip login/dashboard — handled in-page) ──
  if (pathname.startsWith('/instructor') && !['/instructor/login', '/instructor/dashboard'].some(p => pathname === p)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Resolve instructor from user email
    if (user.email) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: instructor } = await (adminClient as unknown as SupabaseClient)
        .from('instructors')
        .select('id, school_id')
        .eq('email', user.email)
        .maybeSingle()

      if (instructor) {
        const response = NextResponse.next()
        response.headers.set('x-instructor-id', instructor.id)
        response.headers.set('x-school-id', instructor.school_id)
        response.headers.set('x-user-id', user.id)
        return response
      }
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/school-admin/:path*',
    '/instructor/:path*',
    // Allow instructor login and dashboard to be public (auth happens in-page)
    '/instructor/login',
    '/instructor/dashboard',
  ],
}
