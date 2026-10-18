import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// ── Field catalog ──────────────────────────────────────────────────────────
//
// Each entry is a target field the import page can map a CSV column to.
// `aliases` is a list of header names we recognise (case-insensitive, after
// stripping spaces, quotes, and underscores). `required` is informational —
// the API only reports it; the page enforces it.
const FIELD_CATALOG = [
  {
    key: 'student_name',
    label: 'Student Name',
    required: true,
    aliases: [
      'student_name', 'studentname', 'student',
      'name', 'full_name', 'fullname', 'legal_name', 'legalname',
      'first_last', 'student full name', 'pupil', 'pupil_name',
    ],
  },
  {
    key: 'permit_number',
    label: 'Permit Number',
    required: false,
    aliases: [
      'permit_number', 'permitnumber', 'permit',
      'permit_no', 'permitno', 'permit #',
      'license', 'license_number', 'licensenumber', 'license_no',
      'learners', 'learner', 'learners_permit', 'learnerspermit',
    ],
  },
  {
    key: 'dob',
    label: 'Date of Birth',
    required: true,
    aliases: [
      'dob', 'date_of_birth', 'dateofbirth',
      'birth_date', 'birthdate', 'date_of_birth',
      'birthday', 'birth_date_iso',
    ],
  },
  {
    key: 'parent_email',
    label: 'Parent Email',
    required: false,
    aliases: [
      'parent_email', 'parentemail', 'parent email',
      'guardian_email', 'guardianemail', 'guardian email',
      'contact_email', 'contactemail',
    ],
  },
  {
    key: 'classroom_hours',
    label: 'Classroom Hours',
    required: false,
    aliases: [
      'classroom_hours', 'classroomhours', 'classroom hrs',
      'classroom', 'class_hours', 'classhours',
      'lecture_hours', 'lecturehours', 'theory_hours', 'theoryhours',
    ],
  },
  {
    key: 'driving_hours',
    label: 'Driving Hours',
    required: false,
    aliases: [
      'driving_hours', 'drivinghours', 'driving hrs',
      'driving', 'drive_hours', 'drivehours',
      'behind_the_wheel', 'btw_hours', 'btw',
    ],
  },
] as const

type FieldKey = (typeof FIELD_CATALOG)[number]['key']

// ── Helpers ────────────────────────────────────────────────────────────────

/** Normalize a header for comparison: lowercase, strip non-alphanumeric. */
function normHeader(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Parse a single CSV line (with quoted values). */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** Parse the CSV text. Returns headers (original) and parsed rows. */
function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.replace(/\r\n?/g, '\n').split('\n').filter(l => l.length > 0)
  if (lines.length < 1) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const rows: string[][] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i])
    // pad / truncate to header length
    while (vals.length < headers.length) vals.push('')
    rows.push(vals)
  }
  return { headers, rows }
}

/** Heuristic: which type does the column look like? */
type ColumnKind = 'name' | 'date' | 'email' | 'phone' | 'number' | 'permit' | 'unknown'

function detectColumnKind(samples: string[]): ColumnKind {
  const nonEmpty = samples.filter(s => s && s.trim().length > 0)
  if (nonEmpty.length === 0) return 'unknown'

  // Email
  if (nonEmpty.every(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()))) {
    return 'email'
  }
  // Date — accept YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY, DD/MM/YYYY
  if (nonEmpty.every(s => {
    const t = s.trim()
    if (!t) return false
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) return true
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t)) return true
    if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(t)) return true
    return false
  })) {
    return 'date'
  }
  // Phone — mostly digits, possibly 10-15 chars
  if (nonEmpty.every(s => /^[\d\s()+\-.]+$/.test(s.trim()) && s.replace(/\D/g, '').length >= 7)) {
    return 'phone'
  }
  // Permit — alphanumeric, 5-15 chars, contains a digit
  if (nonEmpty.every(s => /^[A-Za-z0-9-]{4,20}$/.test(s.trim()) && /\d/.test(s))) {
    return 'permit'
  }
  // Number — pure digits
  if (nonEmpty.every(s => /^\d+(\.\d+)?$/.test(s.trim()))) {
    return 'number'
  }
  // Name — free text with at least 2 words in most samples
  const twoWord = nonEmpty.filter(s => s.trim().split(/\s+/).length >= 2).length
  if (twoWord / nonEmpty.length >= 0.5) return 'name'

  return 'unknown'
}

/** Levenshtein distance, capped at 64 chars for performance. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const al = a.length, bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al
  if (al > 64 || bl > 64) {
    // Cheap fallback: prefix match score
    let common = 0
    for (let i = 0; i < Math.min(al, bl); i++) {
      if (a[i] === b[i]) common++
      else break
    }
    return Math.max(al, bl) - common
  }
  const dp: number[] = new Array(bl + 1)
  for (let j = 0; j <= bl; j++) dp[j] = j
  for (let i = 1; i <= al; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[bl]
}

/** Similarity score 0..1 — combines alias match + fuzzy + kind match. */
function scoreMatch(
  normHeader: string,
  field: (typeof FIELD_CATALOG)[number],
  kind: ColumnKind,
): { score: number; reason: string } {
  // 1. Exact alias match — highest confidence
  for (const alias of field.aliases) {
    if (normHeader === alias) {
      return { score: 1.0, reason: `Header "${field.label}" matches alias "${alias}"` }
    }
  }
  // 2. Header CONTAINS the alias (or vice versa)
  for (const alias of field.aliases) {
    if (alias.length >= 4 && (normHeader.includes(alias) || alias.includes(normHeader))) {
      return { score: 0.85, reason: `Header contains "${alias}"` }
    }
  }
  // 3. Fuzzy match — only if the alias is reasonably long
  let bestFuzzy: { alias: string; score: number } | null = null
  for (const alias of field.aliases) {
    if (alias.length < 4) continue
    const dist = levenshtein(normHeader, alias)
    const score = 1 - dist / Math.max(normHeader.length, alias.length)
    if (score >= 0.7 && (!bestFuzzy || score > bestFuzzy.score)) {
      bestFuzzy = { alias, score }
    }
  }
  if (bestFuzzy) {
    return { score: bestFuzzy.score * 0.8, reason: `Header is similar to "${bestFuzzy.alias}"` }
  }
  // 4. Kind fallback — type matches but name doesn't
  const kindMap: Record<string, FieldKey> = {
    date: 'dob',
    email: 'parent_email',
    number: 'classroom_hours', // ambiguous between classroom/driving; fall through to header check
    phone: 'parent_email',     // phone is closest to parent contact
    permit: 'permit_number',
    name: 'student_name',
  }
  if (kindMap[kind] === field.key) {
    return { score: 0.4, reason: `Column values look like ${kind}s` }
  }
  return { score: 0, reason: '' }
}

// ── Auth ───────────────────────────────────────────────────────────────────

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

// ── POST /api/import/students/columns ──────────────────────────────────────
//
// Request: { csv_text: string, file_name?: string }
// Response: {
//   fields: FieldDef[]            // catalog (so the page can render
//                                  // the required/optional layout)
//   columns: ColumnAnalysis[]     // one per detected CSV header
//   suggested_mapping: { [key]: header }  // best guess per field
//   unmapped_required: FieldKey[] // required fields with no auto-match
//   stats: { total_rows, columns, auto_mapped, requires_review }
// }

export async function POST(request: NextRequest) {
  const demoMode = process.env.DEMO_MODE === 'true'

  if (demoMode) {
    // Demo mode — accept the request without auth
  } else {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    // Verify user owns a school (use the same x-school-id convention
    // as the rest of the import pipeline)
    const schoolId = request.headers.get('x-school-id') || user.user_metadata?.school_id
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
    const isOwner = school?.owner_user_id === user.id || school?.owner_email === user.email
    if (!isOwner) {
      return NextResponse.json({ error: 'You do not own this school' }, { status: 403 })
    }
  }

  let body: { csv_text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const csvText = (body.csv_text || '').trim()
  if (!csvText) {
    return NextResponse.json({ error: 'csv_text is required' }, { status: 400 })
  }

  // Parse the CSV
  const { headers, rows } = parseCSV(csvText)
  if (headers.length === 0) {
    return NextResponse.json({ error: 'CSV has no headers' }, { status: 400 })
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV has headers but no data rows' }, { status: 400 })
  }

  // Per-column analysis
  const columnAnalysis = headers.map((header, idx) => {
    const samples = rows.slice(0, 20).map(r => r[idx] || '')
    const nonEmpty = samples.filter(s => s && s.trim().length > 0)
    const fillRate = samples.length > 0 ? nonEmpty.length / samples.length : 0
    const kind = detectColumnKind(samples)
    return {
      header,
      index: idx,
      kind,
      sample_count: rows.length,
      filled_count: nonEmpty.length,
      fill_rate: Math.round(fillRate * 100) / 100,
      samples: samples.slice(0, 3),
    }
  })

  // For each catalog field, find the best column (or none)
  const usedHeaders = new Set<string>()
  const suggestedMapping: Partial<Record<FieldKey, string>> = {}
  const fieldScores: Record<string, { header: string; score: number; reason: string }[]> = {}

  for (const field of FIELD_CATALOG) {
    const candidates: { header: string; score: number; reason: string; kind: ColumnKind }[] = []
    for (const col of columnAnalysis) {
      if (usedHeaders.has(col.header)) continue
      const norm = normHeader(col.header)
      const { score, reason } = scoreMatch(norm, field, col.kind)
      if (score > 0) {
        candidates.push({ header: col.header, score, reason, kind: col.kind })
      }
    }
    candidates.sort((a, b) => b.score - a.score)
    fieldScores[field.key] = candidates.slice(0, 3)
    if (candidates.length > 0) {
      suggestedMapping[field.key] = candidates[0].header
      usedHeaders.add(candidates[0].header)
    }
  }

  // Identify required fields that have no confident match
  const unmappedRequired: FieldKey[] = []
  for (const field of FIELD_CATALOG) {
    if (!field.required) continue
    const mapped = suggestedMapping[field.key]
    if (!mapped) {
      unmappedRequired.push(field.key)
      continue
    }
    // Required but mapped with low confidence — flag for review
    const cand = fieldScores[field.key]?.[0]
    if (cand && cand.score < 0.6) {
      unmappedRequired.push(field.key)
    }
  }

  // Map each used header back to the field that claimed it, so the
  // page can show "X is mapped to Y" badges on detected columns
  const headerToField: Record<string, FieldKey> = {}
  for (const [fieldKey, header] of Object.entries(suggestedMapping)) {
    if (header) headerToField[header] = fieldKey as FieldKey
  }

  // Per-column mapping hint (only for the columns we actually mapped)
  const columnsWithMapping = columnAnalysis.map(c => ({
    ...c,
    mapped_to: headerToField[c.header] || null,
    is_mapped: !!headerToField[c.header],
  }))

  const autoMapped = Object.keys(suggestedMapping).length
  const requiresReview = unmappedRequired.length

  return NextResponse.json({
    fields: FIELD_CATALOG.map(f => ({
      key: f.key,
      label: f.label,
      required: f.required,
    })),
    columns: columnsWithMapping,
    suggested_mapping: suggestedMapping,
    field_scores: fieldScores,
    unmapped_required: unmappedRequired,
    stats: {
      total_rows: rows.length,
      column_count: headers.length,
      auto_mapped: autoMapped,
      requires_review: requiresReview,
    },
  })
}
