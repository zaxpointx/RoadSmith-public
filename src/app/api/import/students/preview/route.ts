import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { decryptField, validateDOB, validatePermitNumber } from '@/lib/security'

interface StudentRow {
  student_name: string
  permit_number: string
  dob: string
  parent_email: string
  classroom_hours: string
  driving_hours: string
  phone: string
}

interface ExistingStudent {
  id: string
  name: string
  dob: string | null
  email: string | null
  phone: string | null
  permit_number: string | null
  classroom_hours: number | null
  driving_hours: number | null
  enrollment_date: string | null
  created_at: string | null
}

type DupMatchReason = 'email' | 'name_phone' | 'dob'

interface DuplicateCandidate {
  // Stable id for client-side resolution (rowKey::existingId)
  id: string
  matchReason: DupMatchReason
  confidence: 'high' | 'medium'
  existing: ExistingStudent
  incoming: StudentRow
}

// ── Auth ───────────────────────────────────────────────────────────────────────

async function getSessionUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Normalize an email for comparison: lowercase + trim */
function normEmail(e: string | null | undefined): string {
  return (e || '').trim().toLowerCase()
}

/** Normalize a phone: strip everything except digits, keep last 10 */
function normPhone(p: string | null | undefined): string {
  const digits = (p || '').replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

/** Normalize a name for comparison: lowercase + collapse whitespace */
function normName(n: string | null | undefined): string {
  return (n || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// ── POST /api/import/students/preview ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  const demoMode = process.env.DEMO_MODE === 'true'

  let schoolId = request.headers.get('x-school-id')
  let userId: string | null = null

  if (demoMode) {
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing x-school-id' }, { status: 400 })
    }
  } else {
    const sessionUser = await getSessionUser(request)
    if (!sessionUser) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    userId = sessionUser.id

    if (!schoolId) {
      schoolId = sessionUser.user_metadata?.school_id
    }
    if (!schoolId) {
      return NextResponse.json({ error: 'No school linked to your account' }, { status: 400 })
    }

    const adminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: school } = await adminClient
      .from('schools')
      .select('owner_email, owner_user_id')
      .eq('id', schoolId)
      .maybeSingle()

    const isOwner = school?.owner_user_id === userId || school?.owner_email === sessionUser.email
    if (!isOwner) {
      return NextResponse.json({ error: 'You do not own this school' }, { status: 403 })
    }
  }

  // ── Parse request ──────────────────────────────────────────────────────────

  const body = await request.json()
  const { rows, columnMapping } = body as {
    rows: Record<string, string>[]
    columnMapping: Record<string, string>
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 })
  }

  // Map columns using user-defined mapping (with sensible fallbacks for
  // common aliases so a CSV without an explicit mapping for email/phone
  // still gets reasonable dedupe behavior).
  const mappedRows: StudentRow[] = []
  const errors: { row: number; message: string }[] = []

  // Build a lowercased alias set for any column the user didn't explicitly
  // map. This lets us sniff out "email" or "phone" columns even when the
  // user only mapped student_name/permit/dob.
  const headerAliasMap: Record<string, string[]> = {
    parent_email: ['parent_email', 'parentemail', 'parent email', 'guardian_email', 'guardianemail', 'guardian email', 'email', 'student_email', 'studentemail', 'student email'],
    phone: ['phone', 'mobile', 'cell', 'telephone', 'emergency_contact_phone', 'emergencycontactphone', 'emergency phone', 'contact_phone', 'contactphone', 'contact phone'],
  }

  function resolveExtraField(fieldKey: 'parent_email' | 'phone', row: Record<string, string>): string {
    const explicit = columnMapping[fieldKey]
    if (explicit) return (row[explicit] || '').trim()
    // sniff by header alias
    const aliases = headerAliasMap[fieldKey] || []
    for (const h of Object.keys(row)) {
      const norm = h.toLowerCase().replace(/['"\s_]/g, '')
      if (aliases.some(a => a.replace(/['"\s_]/g, '') === norm)) {
        return (row[h] || '').trim()
      }
    }
    return ''
  }

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const student_name = (raw[columnMapping['student_name']] || '').trim()
    const permit_number = (raw[columnMapping['permit_number']] || '').trim()
    const dob = (raw[columnMapping['dob']] || '').trim()
    const parent_email = resolveExtraField('parent_email', raw)
    const phone = resolveExtraField('phone', raw)
    const classroom_hours = (raw[columnMapping['classroom_hours']] || '').trim()
    const driving_hours = (raw[columnMapping['driving_hours']] || '').trim()

    // Validate required fields
    if (!student_name) {
      errors.push({ row: i + 1, message: 'Missing student name' })
      continue
    }
    if (!dob) {
      errors.push({ row: i + 1, message: 'Missing DOB' })
      continue
    }

    const dobCheck = validateDOB(dob)
    if (!dobCheck.valid) {
      errors.push({ row: i + 1, message: dobCheck.error || 'Invalid DOB' })
      continue
    }

    if (permit_number) {
      const permitCheck = validatePermitNumber(permit_number)
      if (!permitCheck.valid) {
        errors.push({ row: i + 1, message: permitCheck.error || 'Invalid permit number' })
        continue
      }
    }

    mappedRows.push({ student_name, permit_number, dob, parent_email, classroom_hours, driving_hours, phone })
  }

  if (mappedRows.length === 0) {
    return NextResponse.json({ toInsert: [], toUpdate: [], duplicates: [], errors }, { status: 200 })
  }

  // ── Load existing students for this school ─────────────────────────────────
  // We need them for email, name+phone, and DOB match. Names and phones are
  // encrypted at rest, so we decrypt them here (school-scoped, typically a
  // few hundred rows at most).

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existingRaw } = await supabaseAdmin
    .from('students_driver_ed')
    .select('id, legal_name, dob, parent_email, emergency_contact_phone, permit_number, classroom_hours, driving_hours, enrollment_date, created_at')
    .eq('school_id', schoolId)

  const existingStudents: ExistingStudent[] = await Promise.all(
    (existingRaw || []).map(async (s) => ({
      id: s.id as string,
      name: s.legal_name ? (await decryptField(s.legal_name)) : '',
      dob: (s.dob as string | null) || null,
      email: (s.parent_email as string | null) || null,
      phone: s.emergency_contact_phone ? (await decryptField(s.emergency_contact_phone)) : null,
      permit_number: (s.permit_number as string | null) || null,
      classroom_hours: (s.classroom_hours as number | null) ?? null,
      driving_hours: (s.driving_hours as number | null) ?? null,
      enrollment_date: (s.enrollment_date as string | null) || null,
      created_at: (s.created_at as string | null) || null,
    }))
  )

  // Build lookup indices for fast matching
  const emailIdx = new Map<string, ExistingStudent>()
  const phoneIdx = new Map<string, ExistingStudent>()
  const dobIdx = new Map<string, ExistingStudent[]>()
  for (const s of existingStudents) {
    const e = normEmail(s.email)
    if (e) emailIdx.set(e, s)
    const p = normPhone(s.phone)
    if (p) phoneIdx.set(p, s)
    if (s.dob) {
      const arr = dobIdx.get(s.dob) || []
      arr.push(s)
      dobIdx.set(s.dob, arr)
    }
  }

  // ── Match each mapped CSV row against existing students ───────────────────
  // Each incoming row matches at most one existing. Each existing can be
  // matched by multiple incoming rows (e.g. two CSV rows for the same kid)
  // — all of those are reported as duplicates.

  const toInsert: StudentRow[] = []
  const toUpdate: (StudentRow & { existingId: string })[] = []
  const duplicates: DuplicateCandidate[] = []

  // Track which existing students have already been "claimed" by a primary
  // (non-duplicate) match so we only emit one toUpdate per existing.
  const primaryClaim = new Set<string>()

  // Pre-index incoming by normalized email/phone/dob to detect duplicates
  // between rows in the same CSV (intra-file duplicates).
  const incomingEmailIdx = new Map<string, number[]>()
  const incomingPhoneIdx = new Map<string, number[]>()
  const incomingDobIdx = new Map<string, number[]>()
  mappedRows.forEach((r, idx) => {
    const e = normEmail(r.parent_email)
    if (e) {
      const arr = incomingEmailIdx.get(e) || []
      arr.push(idx)
      incomingEmailIdx.set(e, arr)
    }
    const p = normPhone(r.phone)
    if (p) {
      const arr = incomingPhoneIdx.get(p) || []
      arr.push(idx)
      incomingPhoneIdx.set(p, arr)
    }
    const d = (r.dob || '').trim()
    if (d) {
      const arr = incomingDobIdx.get(d) || []
      arr.push(idx)
      incomingDobIdx.set(d, arr)
    }
  })

  // For each incoming row, find the best existing match (email > name_phone > dob)
  // and decide whether to surface as a duplicate, a primary update, or a fresh insert.
  const matchedExistingIds = new Set<string>() // for each row, which existing it matched
  const rowMatch = new Map<number, { existing: ExistingStudent; reason: DupMatchReason; confidence: 'high' | 'medium' }>()

  for (let i = 0; i < mappedRows.length; i++) {
    const r = mappedRows[i]
    const inEmail = normEmail(r.parent_email)
    const inPhone = normPhone(r.phone)
    const inName = normName(r.student_name)
    const inDob = (r.dob || '').trim()

    // 1) Email match (high confidence)
    if (inEmail) {
      const candidate = emailIdx.get(inEmail)
      if (candidate) {
        rowMatch.set(i, { existing: candidate, reason: 'email', confidence: 'high' })
        continue
      }
    }

    // 2) Name + phone match (high confidence) — both name and phone must match
    if (inName && inPhone) {
      // Search by phone first (smaller index), then verify name
      const byPhone = phoneIdx.get(inPhone)
      if (byPhone && normName(byPhone.name) === inName) {
        rowMatch.set(i, { existing: byPhone, reason: 'name_phone', confidence: 'high' })
        continue
      }
    }

    // 3) DOB match (medium confidence) — only count as duplicate if email
    // and name+phone did not produce a hit. Multiple existing students can
    // share a DOB (twins, siblings); pick the closest by name if possible.
    if (inDob) {
      const dobCandidates = dobIdx.get(inDob) || []
      if (dobCandidates.length === 1) {
        rowMatch.set(i, { existing: dobCandidates[0], reason: 'dob', confidence: 'medium' })
        continue
      }
      if (dobCandidates.length > 1) {
        // Try to disambiguate by name (decrypted in existingStudents list)
        const exact = dobCandidates.find(c => normName(c.name) === inName)
        if (exact) {
          rowMatch.set(i, { existing: exact, reason: 'dob', confidence: 'medium' })
          continue
        }
        // No name match — surface as a duplicate against the first candidate
        // (UI will let the user resolve by re-running the import with more
        // identifying info if needed). The user picks the action.
        rowMatch.set(i, { existing: dobCandidates[0], reason: 'dob', confidence: 'medium' })
        continue
      }
    }
  }

  // Build stable IDs: rowIdx::existingId. This stays unique even if a row
  // is later removed/added (we only use it for React keys in the UI).
  function dupId(rowIdx: number, existingId: string) {
    return `r${rowIdx}::${existingId}`
  }

  // Walk rows in order. For each row, classify:
  //   - first occurrence against an existing → toUpdate (if not already
  //     claimed as a primary) OR duplicate (if existing was already claimed
  //     by an earlier row)
  //   - later rows against the same existing → duplicate
  //   - no existing → toInsert (or duplicate if multiple rows match same
  //     incoming email/phone/dob)
  for (let i = 0; i < mappedRows.length; i++) {
    const r = mappedRows[i]
    const match = rowMatch.get(i)

    if (match) {
      const m = match
      if (primaryClaim.has(m.existing.id)) {
        // Same existing already getting a primary update — surface as dup
        duplicates.push({
          id: dupId(i, m.existing.id),
          matchReason: m.reason,
          confidence: m.confidence,
          existing: m.existing,
          incoming: r,
        })
      } else {
        // Primary update for this existing
        primaryClaim.add(m.existing.id)
        toUpdate.push({ ...r, existingId: m.existing.id })
        matchedExistingIds.add(m.existing.id)
      }
      continue
    }

    // No existing match — but check for intra-CSV duplicates (two rows in
    // the same upload that look like the same person).
    let intraDup: { reason: DupMatchReason; confidence: 'high' | 'medium' } | null = null
    const e = normEmail(r.parent_email)
    if (e) {
      const idxs = incomingEmailIdx.get(e) || []
      // any earlier index with the same email that's an insert → treat as dup
      const earlier = idxs.find(j => j < i)
      if (earlier !== undefined) intraDup = { reason: 'email', confidence: 'high' }
    }
    if (!intraDup) {
      const p = normPhone(r.phone)
      if (p) {
        const idxs = incomingPhoneIdx.get(p) || []
        const earlier = idxs.find(j => j < i)
        if (earlier !== undefined) intraDup = { reason: 'name_phone', confidence: 'high' }
      }
    }
    if (!intraDup) {
      const d = (r.dob || '').trim()
      if (d) {
        const idxs = incomingDobIdx.get(d) || []
        const earlier = idxs.find(j => j < i)
        if (earlier !== undefined) intraDup = { reason: 'dob', confidence: 'medium' }
      }
    }

    if (intraDup) {
      // Synthesize a "virtual existing" so the UI can still show a side-by-side
      // by using the earlier row as the reference.
      const earlierIdx = (() => {
        const e = normEmail(r.parent_email); if (e) return (incomingEmailIdx.get(e) || []).find(j => j < i)
        const p = normPhone(r.phone); if (p) return (incomingPhoneIdx.get(p) || []).find(j => j < i)
        const d = (r.dob || '').trim(); if (d) return (incomingDobIdx.get(d) || []).find(j => j < i)
        return undefined
      })()
      const refRow = earlierIdx !== undefined ? mappedRows[earlierIdx] : r
      const virtualExisting: ExistingStudent = {
        id: `intra::${earlierIdx ?? i}`,
        name: refRow.student_name,
        dob: refRow.dob,
        email: refRow.parent_email || null,
        phone: refRow.phone || null,
        permit_number: refRow.permit_number || null,
        classroom_hours: refRow.classroom_hours ? Number(refRow.classroom_hours) : null,
        driving_hours: refRow.driving_hours ? Number(refRow.driving_hours) : null,
        enrollment_date: null,
        created_at: null,
      }
      duplicates.push({
        id: dupId(i, virtualExisting.id),
        matchReason: intraDup.reason,
        confidence: intraDup.confidence,
        existing: virtualExisting,
        incoming: r,
      })
    } else {
      toInsert.push(r)
    }
  }

  return NextResponse.json({
    toInsert,
    toUpdate,
    duplicates,
    errors,
    summary: {
      total: rows.length,
      valid: mappedRows.length,
      toInsert: toInsert.length,
      toUpdate: toUpdate.length,
      duplicates: duplicates.length,
      errorsCount: errors.length,
    },
  })
}
