import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { encryptField, validateDOB, validatePermitNumber } from '@/lib/security'

interface StudentRow {
  legal_name: string
  dob: string
  permit_number?: string
  parent_email?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  driving_hours?: string
  classroom_hours?: string
  enrollment_date?: string
}

interface DuplicateResolution {
  // Index of the row in the parsed CSV (0-indexed, matches the order of
  // the parsed rows array — NOT the original CSV row number). The client
  // is responsible for keeping the row order in the csv_content aligned
  // with the resolutions it sends.
  rowIndex: number
  existingId: string
  matchReason?: string
  confidence?: string
  resolution: 'keep_existing' | 'update_existing' | 'import_as_new'
}

// ── CSV Parsing ──────────────────────────────────────────────────────────────

function parseCSV(csvText: string): StudentRow[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const rows: StudentRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim().replace(/^["']|["']$/g, '')
    })

    if (row.legal_name || row.name || row.student_name) {
      rows.push({
        legal_name: row.legal_name || row.name || row.student_name || '',
        dob: row.dob || row.date_of_birth || row.date || '',
        permit_number: row.permit_number || row.permit || row.license || '',
        parent_email: row.parent_email || row.email || row.student_email || '',
        emergency_contact_name: row.emergency_contact_name || row.emergency_name || row.contact || '',
        emergency_contact_phone: row.emergency_contact_phone || row.emergency_phone || row.phone || row.contact_phone || '',
        driving_hours: row.driving_hours || row.drivinghrs || row.drivinghours || '',
        classroom_hours: row.classroom_hours || row.classroomhrs || row.classroomhours || '',
        enrollment_date: row.enrollment_date || row.enrolled || row.enrollment || '',
      })
    }
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// ── Auth: session cookie (browser) ──────────────────────────────────────────

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

// ── Import Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const demoMode = process.env.DEMO_MODE === 'true'

  let schoolId = request.headers.get('x-school-id')
  let userId: string | null = null

  if (demoMode) {
    // DEMO_MODE: trust x-school-id from the middleware-verified session
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing x-school-id' }, { status: 400 })
    }
  } else {
    // PROD_MODE: verify session + school ownership
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

    // Verify the logged-in user owns this school
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

  // ── Parse + validate CSV ─────────────────────────────────────────────────

  const body = await request.json()
  const { csv_content, duplicate_resolutions } = body

  if (!csv_content || typeof csv_content !== 'string') {
    return NextResponse.json({ error: 'csv_content is required' }, { status: 400 })
  }

  // Index duplicate resolutions by their parsed-CSV row index so we can
  // apply the user's per-row resolution while processing the CSV.
  // Rows that resolve to "keep_existing" should not be sent from the
  // client at all, so we only need to handle "update_existing" and
  // "import_as_new" here.
  const dupResByRow = new Map<number, DuplicateResolution>()
  if (Array.isArray(duplicate_resolutions)) {
    for (const dr of duplicate_resolutions as DuplicateResolution[]) {
      if (!dr || !dr.existingId || !dr.resolution) continue
      if (dr.resolution === 'keep_existing') continue
      if (typeof dr.rowIndex === 'number') {
        dupResByRow.set(dr.rowIndex, dr)
      }
    }
  }

  const rows = parseCSV(csv_content)
  if (rows.length === 0) {
    return NextResponse.json({
      error: 'No valid student rows found.',
      hint: 'Accepted headers: legal_name (or name/student_name), dob (YYYY-MM-DD)',
    }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results = { total: rows.length, imported: 0, failed: 0, skipped: 0, errors: [] as string[] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.legal_name) { results.errors.push(`Row ${i + 2}: Missing name`); results.failed++; continue }
    if (!row.dob) { results.errors.push(`Row ${i + 2}: Missing DOB`); results.failed++; continue }
    const dobCheck = validateDOB(row.dob)
    if (!dobCheck.valid) { results.errors.push(`Row ${i + 2}: ${dobCheck.error}`); results.failed++; continue }
    if (row.permit_number) {
      const permitCheck = validatePermitNumber(row.permit_number)
      if (!permitCheck.valid) { results.errors.push(`Row ${i + 2}: ${permitCheck.error}`); results.failed++; continue }
    }

    // Did the user resolve a duplicate at this row index? If so, override
    // the default DOB-based match.
    const dupRes = dupResByRow.get(i)
    const forceInsert = dupRes?.resolution === 'import_as_new'
    const targetExistingId = dupRes && dupRes.resolution === 'update_existing'
      ? dupRes.existingId
      : null

    try {
      const encryptedName = await encryptField(row.legal_name)
      const encryptedPermit = row.permit_number ? await encryptField(row.permit_number) : 'PENDING'
      const encryptedPhone = row.emergency_contact_phone ? await encryptField(row.emergency_contact_phone) : null

      // Look up an existing student: by explicit existingId first (the
      // user picked "update existing" for this duplicate), then fall back
      // to the legacy DOB-based match.
      let existing: { id: string } | null = null
      if (targetExistingId) {
        const { data } = await supabaseAdmin
          .from('students_driver_ed')
          .select('id')
          .eq('id', targetExistingId)
          .eq('school_id', schoolId)
          .maybeSingle()
        existing = data
      }
      if (!existing && !forceInsert) {
        // Dedupe: match by dob + this school (not name — name is encrypted)
        const { data } = await supabaseAdmin
          .from('students_driver_ed')
          .select('id')
          .eq('school_id', schoolId)
          .eq('dob', row.dob)
          .limit(1)
        existing = data && data.length > 0 ? data[0] : null
      }

      if (existing) {
        const { error } = await supabaseAdmin
          .from('students_driver_ed')
          .update({
            legal_name: encryptedName,
            permit_number: encryptedPermit,
            parent_email: row.parent_email || '',
            emergency_contact_name: row.emergency_contact_name || '',
            emergency_contact_phone: encryptedPhone,
            driving_hours: row.driving_hours ? parseInt(row.driving_hours) : 0,
            classroom_hours: row.classroom_hours ? parseInt(row.classroom_hours) : 0,
          })
          .eq('id', existing.id)
        if (error) { results.errors.push(`Row ${i + 2}: ${error.message}`); results.failed++ }
        else { results.imported++; results.skipped++ }
      } else {
        const { error } = await supabaseAdmin
          .from('students_driver_ed')
          .insert({
            school_id: schoolId,
            legal_name: encryptedName,
            dob: row.dob,
            permit_number: encryptedPermit,
            parent_email: row.parent_email || '',
            emergency_contact_name: row.emergency_contact_name || '',
            emergency_contact_phone: encryptedPhone,
            driving_hours: row.driving_hours ? parseInt(row.driving_hours) : 0,
            classroom_hours: row.classroom_hours ? parseInt(row.classroom_hours) : 0,
            enrollment_date: row.enrollment_date || new Date().toISOString().split('T')[0],
          })
        if (error) { results.errors.push(`Row ${i + 2}: ${error.message}`); results.failed++ }
        else results.imported++
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown import error'
      results.errors.push(`Row ${i + 2}: ${message}`); results.failed++
    }
  }

  return NextResponse.json(results)
}
