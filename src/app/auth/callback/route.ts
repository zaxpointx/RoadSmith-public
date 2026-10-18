import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function createSchoolSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  return `${base || 'driving-school'}-${Date.now().toString(36)}`
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectParam = searchParams.get('redirect')
  const mode = searchParams.get('mode')
  const schoolName = searchParams.get('schoolName')?.trim()
  const ownerName = searchParams.get('ownerName')?.trim()
  const next = redirectParam?.startsWith('/') ? `${origin}${redirectParam}` : `${origin}/school-admin`

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    const userEmail = user.email.trim()
    const userName =
      ownerName ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      userEmail.split('@')[0]

    const { data: existingSchool } = await supabaseAdmin
      .from('schools')
      .select('id, name, owner_user_id, stripe_customer_id')
      .eq('owner_email', userEmail)
      .limit(1)
      .maybeSingle()

    let school = existingSchool

    if (!school && mode === 'signup' && schoolName) {
      const { data: createdSchool, error: createSchoolError } = await supabaseAdmin
        .from('schools')
        .insert({
          name: schoolName,
          slug: createSchoolSlug(schoolName),
          owner_email: userEmail,
          owner_name: userName,
          plan_tier: 'starter',
          subscription_status: 'trial',
          active: true,
          owner_user_id: user.id,
        })
        .select('id, name, owner_user_id, stripe_customer_id')
        .single()

      if (createSchoolError || !createdSchool) {
        console.error('[Auth Callback] Google school create error:', createSchoolError)
        return NextResponse.redirect(`${origin}/signup?error=school_create_failed`)
      }

      school = createdSchool
    }

    if (!school) {
      const { data: linkedSchool } = await supabaseAdmin
        .from('schools')
        .select('id, name, owner_user_id, stripe_customer_id')
        .eq('stripe_customer_id', user.id)
        .limit(1)
        .maybeSingle()

      school = linkedSchool
    }

    if (!school) {
      const target = mode === 'signup' ? '/signup?error=school_required' : '/signup'
      console.log(`[Auth Callback] No school for ${userEmail} — redirecting to ${target}`)
      return NextResponse.redirect(`${origin}${target}`)
    }

    if (!school.owner_user_id) {
      await supabaseAdmin
        .from('schools')
        .update({ owner_user_id: user.id })
        .eq('id', school.id)
    }

    if (!school.stripe_customer_id) {
      await supabaseAdmin
        .from('schools')
        .update({ stripe_customer_id: user.id })
        .eq('id', school.id)
    }

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, school_id: school.id },
    })

    console.log(`[Auth Callback] Linked user ${user.id} to school ${school.id} (${school.name})`)
  } catch (err) {
    console.error('[Auth Callback] School linking error:', err)
  }

  return NextResponse.redirect(next)
}
