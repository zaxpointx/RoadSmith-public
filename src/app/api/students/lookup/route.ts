import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { decryptField } from '@/lib/security'

type StudentLookupRow = {
  id: string
  legal_name: string | null
  parent_email: string | null
  dob: string | null
  enrollment_date: string | null
  classroom_hours: number | null
  driving_hours: number | null
}

/**
 * GET /api/students/lookup
 *
 * Search students_driver_ed records by name and/or email within a school.
 * Used by the booking auto-link ambiguity resolver and admin tools to
 * "prompt to select existing student" (ROA-13).
 *
 * Query params:
 *   - school_id (required) — scope the search to one school
 *   - email     (optional) — exact match on parent_email
 *   - name      (optional) — fuzzy match on decrypted legal_name
 *
 * Auth: requires an authenticated user who owns the school.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get('school_id')
  const email = (searchParams.get('email') ?? '').trim()
  const name = (searchParams.get('name') ?? '').trim()

  if (!schoolId) {
    return NextResponse.json({ error: 'school_id required' }, { status: 400 })
  }
  if (!email && !name) {
    return NextResponse.json({ error: 'email or name required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Verify school ownership with the authenticated user
  const admin = getSupabaseAdmin()
  const { data: school, error: schoolError } = await admin
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('owner_email', user.email)
    .maybeSingle()

  if (schoolError) return NextResponse.json({ error: schoolError.message }, { status: 500 })
  if (!school) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Query by email (if provided) or pull a recent batch for name matching.
  // For name-only lookups we bound to 200 rows so decryption is fast on demo data.
  let query = admin
    .from('students_driver_ed')
    .select('id, legal_name, parent_email, dob, enrollment_date, classroom_hours, driving_hours')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (email) {
    query = query.eq('parent_email', email)
  }

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Decrypt names server-side and apply name filter (fuzzy) if provided
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const candidates = await Promise.all(
    (rows as StudentLookupRow[] ?? []).map(async (r) => {
      const decryptedName = r.legal_name ? await decryptField(r.legal_name) : ''
      return {
        id: r.id,
        legal_name: decryptedName,
        parent_email: r.parent_email ?? '',
        dob: r.dob,
        enrollment_date: r.enrollment_date,
        classroom_hours: r.classroom_hours ?? 0,
        driving_hours: r.driving_hours ?? 0,
      }
    })
  )

  const filtered = name
    ? candidates.filter((c) => {
        const cn = c.legal_name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
        if (!cn) return false
        if (cn === normalizedName) return true
        if (cn.includes(normalizedName) || normalizedName.includes(cn)) return true
        // Token-set overlap (e.g. "Alex Smith" vs "Alexander P. Smith")
        const aTokens = new Set(cn.split(' ').filter((t) => t.length >= 2))
        const bTokens = new Set(normalizedName.split(' ').filter((t) => t.length >= 2))
        if (aTokens.size === 0 || bTokens.size === 0) return false
        let overlap = 0
        for (const t of bTokens) if (aTokens.has(t)) overlap++
        return overlap >= Math.min(aTokens.size, bTokens.size)
      })
    : candidates

  return NextResponse.json({
    candidates: filtered,
    total: filtered.length,
  })
}
