import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  )
}

// Admin client with service role — skips RLS, use only server-side
export function getSupabaseAdmin() {
  return createSupabase<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
