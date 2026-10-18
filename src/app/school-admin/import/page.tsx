'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Upload, FileText, Download, ChevronLeft, Check, AlertCircle, X, Loader2, ArrowUp, ArrowRight, Columns, Eye, ListChecks, ClipboardList, Square, CheckSquare, UserCheck, UserPlus, RefreshCw, Mail, Phone, Calendar, Sparkles, Tag, Hash, Type } from 'lucide-react'

// ── Design tokens ──────────────────────────────────────────────────────────
// ── Student fields for column mapping ─────────────────────────────────────
const STUDENT_FIELDS = [
  { key: 'student_name', label: 'Student Name', required: true },
  { key: 'permit_number', label: 'Permit Number', required: false },
  { key: 'dob', label: 'Date of Birth', required: true },
  { key: 'parent_email', label: 'Parent Email', required: false },
  { key: 'classroom_hours', label: 'Classroom Hours', required: false },
  { key: 'driving_hours', label: 'Driving Hours', required: false },
] as const

type StudentField = typeof STUDENT_FIELDS[number]['key']

// ── Column analysis response from /api/import/students/columns ──────────────
type ColumnKind = 'name' | 'date' | 'email' | 'phone' | 'number' | 'permit' | 'unknown'

interface ColumnAnalysis {
  header: string
  index: number
  kind: ColumnKind
  sample_count: number
  filled_count: number
  fill_rate: number
  samples: string[]
  mapped_to: StudentField | null
  is_mapped: boolean
}

interface FieldScore {
  header: string
  score: number
  reason: string
  kind: ColumnKind
}

interface ColumnsResponse {
  fields: { key: StudentField; label: string; required: boolean }[]
  columns: ColumnAnalysis[]
  suggested_mapping: Partial<Record<StudentField, string>>
  field_scores: Partial<Record<StudentField, FieldScore[]>>
  unmapped_required: StudentField[]
  stats: {
    total_rows: number
    column_count: number
    auto_mapped: number
    requires_review: number
  }
}

// Human-friendly labels for the optional fields surfaced as cleanup tasks
const OPTIONAL_CLEANUP_FIELDS: { key: string; label: string; labelFull: string }[] = [
  { key: 'permit_number', label: 'permit number', labelFull: 'Permit Number' },
  { key: 'parent_email', label: 'parent email', labelFull: 'Parent Email' },
  { key: 'classroom_hours', label: 'classroom hours', labelFull: 'Classroom Hours' },
  { key: 'driving_hours', label: 'driving hours', labelFull: 'Driving Hours' },
]

interface CleanupTask {
  id: string
  studentName: string
  fieldKey: string
  fieldLabel: string
  message: string
}

interface ExportRow {
  student_name: string
  status: 'inserted' | 'updated' | 'skipped' | 'failed'
  missing_fields: string[]
  errors: string
}

interface ParsedRow {
  [key: string]: string
}

interface ExistingStudentInfo {
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
  id: string
  matchReason: DupMatchReason
  confidence: 'high' | 'medium'
  existing: ExistingStudentInfo
  incoming: ParsedRow
}

interface PreviewSummary {
  total: number
  valid: number
  toInsert: number
  toUpdate: number
  duplicates: number
  errorsCount: number
}

interface PreviewResponse {
  toInsert: ParsedRow[]
  toUpdate: (ParsedRow & { existingId: string })[]
  duplicates: DuplicateCandidate[]
  errors: { row: number; message: string }[]
  summary: PreviewSummary
}

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done'

type DuplicateResolution = 'keep_existing' | 'update_existing' | 'import_as_new'

// ── CSV Parsing ────────────────────────────────────────────────────────────

function parseCSVPreview(csvText: string): { headers: string[]; rows: Record<string, string>[]; errors: string[] } {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [], errors: ['CSV must have at least a header row and one data row'] }

  const rawHeaders = lines[0].split(',').map(h => h.trim())
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/['"]/g, ''))
  const rows: Record<string, string>[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim().replace(/^[\"']|[\"']$/g, '')
    })
    // Also preserve original header values
    headers.forEach((h, idx) => {
      row[`_orig_${h}`] = (values[idx] || '').trim().replace(/^[\"']|[\"']$/g, '')
    })
    rows.push(row)
  }

  if (rows.length === 0) {
    errors.push('No data rows found in CSV')
  }

  return { headers: rawHeaders, rows, errors }
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

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// Escape a single CSV cell (quote if it contains comma, quote, or newline)
function csvEscape(value: string): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// ── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar-labels">
        <span className="progress-label">Importing... {current} of {total}</span>
        <span className="progress-pct">{pct}%</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Import Page ────────────────────────────────────────────────────────────

export default function ImportStudentsPage() {
  const [step, setStep] = useState<Step>('upload')
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('upload')
  const [csvText, setCsvText] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [columnsAnalysis, setColumnsAnalysis] = useState<ColumnsResponse | null>(null)
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [columnsError, setColumnsError] = useState('')
  const [autoDetectedCount, setAutoDetectedCount] = useState(0)
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)
  const [result, setResult] = useState<{ imported: number; failed: number; total: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set())
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<string, DuplicateResolution>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File handling ─────────────────────────────────────────────────────────

  // Local fallback: simple client-side mapping when the API is unavailable.
  // Same alias table as before so behaviour matches the previous version.
  function localAutoMap(headers: string[]): Record<string, string> {
    const aliasMap: Record<string, string[]> = {
      student_name: ['student_name', 'name', 'full_name', 'legal_name', 'studentname', 'fullname'],
      permit_number: ['permit_number', 'permit', 'permitnumber', 'license', 'license_number'],
      dob: ['dob', 'date_of_birth', 'birth_date', 'birthdate'],
      parent_email: ['parent_email', 'parentemail', 'parent email', 'guardian_email'],
      classroom_hours: ['classroom_hours', 'classroomhrs', 'classroomhours', 'classroom'],
      driving_hours: ['driving_hours', 'drivinghrs', 'drivinghours', 'driving'],
    }
    const autoMapping: Record<string, string> = {}
    for (const field of STUDENT_FIELDS) {
      const aliases = aliasMap[field.key] || [field.key]
      const normAliases = aliases.map(a => a.toLowerCase().replace(/['"\s_]/g, ''))
      const match = headers.find(h => {
        const norm = h.toLowerCase().replace(/['"\s_]/g, '')
        return normAliases.includes(norm)
      })
      if (match) autoMapping[field.key] = match
    }
    return autoMapping
  }

  // Build x-school-id header for non-demo requests.
  function buildSchoolHeader(): Record<string, string> {
    const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
    if (!demoCookie) return {}
    try {
      const sid = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId
      return sid ? { 'x-school-id': sid } : {}
    } catch {
      return {}
    }
  }

  // Ask the server to analyze the CSV and suggest field mappings.
  async function analyzeColumns(csvText: string): Promise<ColumnsResponse | null> {
    setColumnsLoading(true)
    setColumnsError('')
    try {
      const res = await fetch('/api/import/students/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildSchoolHeader() },
        body: JSON.stringify({ csv_text: csvText }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setColumnsError(data.error || `Server returned ${res.status}`)
        return null
      }
      return await res.json()
    } catch (err: unknown) {
      setColumnsError(err instanceof Error ? err.message : 'Could not reach the columns API')
      return null
    } finally {
      setColumnsLoading(false)
    }
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a .csv file')
      return
    }
    setError('')
    setColumnsError('')
    const text = await readFileAsText(file)
    setCsvText(text)
    const p = parseCSVPreview(text)
    if (p.rows.length === 0) {
      setError(p.errors[0] || 'No valid rows found in the CSV')
      return
    }
    setCsvHeaders(p.headers)
    setCsvRows(p.rows)

    // Try the server-side analysis first — it has better heuristics,
    // kind detection, and confidence scoring. Fall back to local mapping
    // if the API is down or rejects the request.
    const analysis = await analyzeColumns(text)
    if (analysis) {
      setColumnsAnalysis(analysis)
      const mapping: Record<string, string> = {}
      let autoCount = 0
      for (const f of analysis.fields) {
        const suggested = analysis.suggested_mapping[f.key]
        if (suggested) {
          mapping[f.key] = suggested
          autoCount++
        }
      }
      setColumnMapping(mapping)
      setAutoDetectedCount(autoCount)
    } else {
      setColumnsAnalysis(null)
      const mapping = localAutoMap(p.headers)
      setColumnMapping(mapping)
      setAutoDetectedCount(Object.keys(mapping).length)
    }
    setStep('map')
  }, [])

  async function handlePasteSubmit() {
    if (!csvText.trim()) { setError('Please paste your CSV data'); return }
    setError('')
    setColumnsError('')
    const p = parseCSVPreview(csvText)
    if (p.rows.length === 0) {
      setError(p.errors[0] || 'No valid rows found')
      return
    }
    setCsvHeaders(p.headers)
    setCsvRows(p.rows)

    const analysis = await analyzeColumns(csvText)
    if (analysis) {
      setColumnsAnalysis(analysis)
      const mapping: Record<string, string> = {}
      let autoCount = 0
      for (const f of analysis.fields) {
        const suggested = analysis.suggested_mapping[f.key]
        if (suggested) {
          mapping[f.key] = suggested
          autoCount++
        }
      }
      setColumnMapping(mapping)
      setAutoDetectedCount(autoCount)
    } else {
      setColumnsAnalysis(null)
      const mapping = localAutoMap(p.headers)
      setColumnMapping(mapping)
      setAutoDetectedCount(Object.keys(mapping).length)
    }
    setStep('map')
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave() { setDragOver(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── Fetch preview ─────────────────────────────────────────────────────────

  async function handleShowPreview() {
    setLoading(true)
    setError('')
    try {
      const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
      const isDemo = !!demoCookie
      const endpoint = isDemo ? '/api/demo/students' : '/api/import/students/preview'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (!isDemo) {
        let sid: string | null = null
        if (demoCookie) {
          try { sid = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId } catch {}
        }
        if (sid) headers['x-school-id'] = sid
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rows: csvRows, columnMapping }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Preview failed')
        setLoading(false)
        return
      }
      setPreviewData(data)
      setDuplicateResolutions({}) // new preview, reset any prior choices
      setStep('preview')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }

  // ── Run import ─────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!previewData) return
    setLoading(true)
    setStep('importing')
    setProgress({ current: 0, total: effectiveCounts.total })
    setError('')

    try {
      const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
      const isDemo = !!demoCookie
      const endpoint = isDemo ? '/api/demo/students' : '/api/import/students'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (!isDemo) {
        let sid: string | null = null
        if (demoCookie) {
          try { sid = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId } catch {}
        }
        if (sid) headers['x-school-id'] = sid
      }

      // Build the set of rows to send, applying duplicate resolutions.
      //   keep_existing  → drop the row entirely (existing is left alone)
      //   update_existing → include the row, server will update the matching
      //                     existing record (using existingId from the
      //                     duplicate resolution)
      //   import_as_new  → include the row, server will force-insert a
      //                     new record instead of matching by DOB
      const baseCount = previewData.toInsert.length + previewData.toUpdate.length
      // resolvedIdx is the position of each kept duplicate row in the CSV
      // we build below (i.e. its index in the filtered list, NOT its
      // original index in previewData.duplicates).
      const resolvedDuplicates = previewData.duplicates
        .map(d => ({ d, r: getResolution(d) }))
        .filter(x => x.r !== 'keep_existing')
        .map((x, resolvedIdx) => ({
          row: x.d.incoming,
          resolution: x.r,
          dup: x.d,
          resolvedIdx,
        }))

      const allRows = [...previewData.toInsert, ...previewData.toUpdate, ...resolvedDuplicates.map(x => x.row)]
      const csvHeaders2 = ['student_name', 'permit_number', 'dob', 'parent_email', 'classroom_hours', 'driving_hours']
      const csvLines = [csvHeaders2.join(',')]
      for (const row of allRows) {
        const vals = csvHeaders2.map(h => {
          const v = row[h] || ''
          return v.includes(',') ? `"${v}"` : v
        })
        csvLines.push(vals.join(','))
      }

      // Also send the duplicate resolutions so the import backend can
      // apply them precisely. rowIndex matches the position of the row in
      // the CSV we just built (toInsert + toUpdate + resolvedDuplicates).
      const dupResolutionsPayload = resolvedDuplicates.map(x => ({
        rowIndex: baseCount + x.resolvedIdx,
        existingId: x.dup.existing.id,
        matchReason: x.dup.matchReason,
        confidence: x.dup.confidence,
        resolution: x.resolution,
      }))

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          csv_content: csvLines.join('\n'),
          duplicate_resolutions: dupResolutionsPayload,
        }),
      })
      const data = await res.json()
      setProgress({ current: data.imported + data.failed, total: data.total })
      setResult({ imported: data.imported, failed: data.failed, total: data.total, errors: data.errors || [] })
      setCheckedTasks(new Set()) // reset checklist for new import
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStep('preview')
    }
    setLoading(false)
  }

  // ── Cleanup tasks + export rows (derived from previewData) ────────────────

  // Build cleanup task list from the rows that were actually imported
  // (toInsert + toUpdate + duplicate rows that resolve to insert/update).
  // For each row, surface any missing optional fields.
  const cleanupTasks: CleanupTask[] = []
  if (previewData) {
    const importedRows: ParsedRow[] = [
      ...previewData.toInsert,
      ...previewData.toUpdate,
      ...previewData.duplicates
        .filter(d => {
          const r = getResolution(d)
          return r === 'update_existing' || r === 'import_as_new'
        })
        .map(d => d.incoming),
    ]
    importedRows.forEach((row, idx) => {
      const name = row.student_name || `Row ${idx + 1}`
      for (const f of OPTIONAL_CLEANUP_FIELDS) {
        const val = row[f.key]
        if (val == null || String(val).trim() === '') {
          cleanupTasks.push({
            id: `${name}::${f.key}`,
            studentName: name,
            fieldKey: f.key,
            fieldLabel: f.label,
            message: `Add ${f.label} for ${name}`,
          })
        }
      }
    })
  }

  // Build export rows: one per row in the import (toInsert, toUpdate, duplicates)
  // plus one synthesized row per validation error
  const exportRows: ExportRow[] = []
  if (previewData) {
    for (const row of previewData.toInsert) {
      const name = row.student_name || ''
      const missing = OPTIONAL_CLEANUP_FIELDS
        .filter(f => {
          const v = row[f.key]
          return v == null || String(v).trim() === ''
        })
        .map(f => f.labelFull)
      exportRows.push({ student_name: name, status: 'inserted', missing_fields: missing, errors: '' })
    }
    for (const row of previewData.toUpdate) {
      const name = row.student_name || ''
      const missing = OPTIONAL_CLEANUP_FIELDS
        .filter(f => {
          const v = row[f.key]
          return v == null || String(v).trim() === ''
        })
        .map(f => f.labelFull)
      exportRows.push({ student_name: name, status: 'updated', missing_fields: missing, errors: '' })
    }
    for (const dup of previewData.duplicates) {
      const r = getResolution(dup)
      const name = dup.incoming.student_name || dup.existing.name || ''
      const errors: string[] = []
      const reasonLabel = dup.matchReason === 'email' ? 'Email match' : dup.matchReason === 'name_phone' ? 'Name + phone match' : 'DOB match'
      if (r === 'keep_existing') {
        errors.push(`Duplicate (${reasonLabel}) — kept existing`)
        exportRows.push({ student_name: name, status: 'skipped', missing_fields: [], errors: errors.join('; ') })
      } else if (r === 'update_existing') {
        exportRows.push({ student_name: name, status: 'updated', missing_fields: [], errors: `Duplicate (${reasonLabel}) — updated existing` })
      } else {
        exportRows.push({ student_name: name, status: 'inserted', missing_fields: [], errors: `Duplicate (${reasonLabel}) — imported as new` })
      }
    }
    for (const err of previewData.errors) {
      exportRows.push({ student_name: `Row ${err.row}`, status: 'failed', missing_fields: [], errors: err.message })
    }
  }

  function toggleTask(id: string) {
    setCheckedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Duplicate resolution state helpers ──────────────────────────────────────

  function setResolution(dupId: string, res: DuplicateResolution) {
    setDuplicateResolutions(prev => ({ ...prev, [dupId]: res }))
  }

  /** Default a duplicate to a sensible resolution the first time we see it. */
  function getResolution(dup: DuplicateCandidate): DuplicateResolution {
    if (duplicateResolutions[dup.id]) return duplicateResolutions[dup.id]
    // High-confidence matches default to "update existing" (least surprising)
    // Medium-confidence (DOB only) default to "keep existing" so the user
    // actively has to OK a merge.
    return dup.confidence === 'high' ? 'update_existing' : 'keep_existing'
  }

  // ── Effective import sets (apply resolutions to toUpdate / toInsert) ────────

  const effectiveCounts = useMemo(() => {
    if (!previewData) return { inserts: 0, updates: 0, kept: 0, importsAsNew: 0, total: 0 }
    const inserts = previewData.toInsert.length
    let updates = previewData.toUpdate.length
    let kept = 0
    let importsAsNew = 0
    for (const dup of previewData.duplicates) {
      const r = getResolution(dup)
      if (r === 'keep_existing') {
        kept++
      } else if (r === 'update_existing') {
        // adds an additional update against the same existing
        updates++
      } else {
        importsAsNew++
      }
    }
    return {
      inserts,
      updates,
      kept,
      importsAsNew,
      total: inserts + updates + importsAsNew,
    }
  }, [previewData, duplicateResolutions])

  function handleExportReport() {
    const headers = ['student_name', 'status', 'missing_fields', 'errors']
    const lines = [headers.join(',')]
    for (const r of exportRows) {
      lines.push([
        csvEscape(r.student_name),
        csvEscape(r.status),
        csvEscape(r.missing_fields.join('; ')),
        csvEscape(r.errors),
      ].join(','))
    }
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.href = url
    a.download = `import-report-${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Give the browser a tick to start the download before revoking
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function reset() {
    setStep('upload')
    setCsvText('')
    setCsvHeaders([])
    setCsvRows([])
    setColumnMapping({})
    setColumnsAnalysis(null)
    setColumnsLoading(false)
    setColumnsError('')
    setAutoDetectedCount(0)
    setPreviewData(null)
    setResult(null)
    setError('')
    setProgress({ current: 0, total: 0 })
    setCheckedTasks(new Set())
    setDuplicateResolutions({})
  }

  return (
    <div className="admin-main-inner">
      {/* Back link */}
      <div className="back-link-wrapper">
        <Link href="/school-admin" className="back-link">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="import-header">
        <h1 className="import-title">Import Students from CSV</h1>
        <p className="import-desc">
          Upload a CSV, map columns to student fields, preview what will be imported, then confirm.
        </p>
      </div>

      {/* Step indicator */}
      <div className="import-steps">
        {(['upload', 'map', 'preview', 'importing', 'done'] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = {
            upload: '1. Upload',
            map: '2. Map Columns',
            preview: '3. Preview',
            importing: 'Importing',
            done: 'Done',
          }
          const icons: Record<Step, React.ReactNode> = {
            upload: <Upload className="w-4 h-4" />,
            map: <Columns className="w-4 h-4" />,
            preview: <Eye className="w-4 h-4" />,
            importing: <Loader2 className="w-4 h-4 import-spin" />,
            done: <Check className="w-4 h-4" />,
          }
          const isActive = step === s
          const isPast = ['upload', 'map', 'preview', 'importing', 'done'].indexOf(step) > i
          return (
            <div key={s} className={`import-step ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}>
              <div className="import-step-icon">{icons[s]}</div>
              <span className="import-step-label">{labels[s]}</span>
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      {step === 'upload' && (
        <>
          {/* Instructions card */}
          <div className="import-instructions-card">
            <div className="import-instructions-header">
              <Download className="w-4 h-4 import-instructions-icon" />
              <span className="import-instructions-title">Expected CSV columns</span>
            </div>
            <div className="import-instructions-grid">
              {STUDENT_FIELDS.map(f => (
                <div key={f.key} className="import-instructions-item">
                  <span className="import-instructions-col">{f.label}</span>
                  {f.required && <span className="import-instructions-required">required</span>}
                </div>
              ))}
            </div>
            <div className="import-instructions-hint">
              Headers can use aliases: name, permit, date_of_birth, parent email, etc.
            </div>
          </div>

          {/* Toggle: Upload vs Paste */}
          <div className="import-method-toggle">
            <button
              onClick={() => setInputMethod('upload')}
              className={`import-method-btn ${inputMethod === 'upload' ? 'active' : ''}`}
            >
              <Upload className="w-4 h-4" /> Upload File
            </button>
            <button
              onClick={() => setInputMethod('paste')}
              className={`import-method-btn ${inputMethod === 'paste' ? 'active' : ''}`}
            >
              <FileText className="w-4 h-4" /> Paste Text
            </button>
          </div>

          {/* Upload zone */}
          {inputMethod === 'upload' && (
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="file-input-hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
              <div className="upload-zone-icon">
                {dragOver ? (
                  <ArrowUp className="w-6 h-6" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <p className="upload-zone-title">
                {dragOver ? 'Drop your CSV file here' : 'Upload a CSV file'}
              </p>
              <p className="upload-zone-subtitle">Drag and drop, or click to browse</p>
              <div className="upload-zone-badge">.csv</div>
            </div>
          )}

          {/* Paste text area */}
          {inputMethod === 'paste' && (
            <div className="paste-wrapper">
              <textarea
                className="paste-textarea"
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={`student_name,date_of_birth,permit_number,parent_email,classroom_hours,driving_hours\nJane Smith,2010-03-15,LM-123456,jane@parent.com,6,4\nJohn Doe,2009-11-22,,john@parent.com,4,6`}
                rows={10}
              />
              {csvText.trim() && (
                <div className="paste-row-count">
                  <span className="paste-row-count-num">{csvText.trim().split('\n').length - 1}</span> rows detected
                </div>
              )}
              <button
                onClick={handlePasteSubmit}
                disabled={!csvText.trim()}
                className="paste-submit-btn"
              >
                <Eye className="w-4 h-4" /> Preview Data
              </button>
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: MAP COLUMNS ── */}
      {step === 'map' && (
        <>
          <div className="map-header">
            <div className="map-header-left">
              <div className="map-info">
                <Check className="w-4 h-4 map-check-icon" />
                <span className="map-info-text">
                  <strong>{csvRows.length}</strong> rows parsed from CSV
                </span>
              </div>
              {columnsLoading && (
                <div className="map-loading-pill">
                  <Loader2 className="w-3 h-3 import-spin" /> Analyzing columns…
                </div>
              )}
              {!columnsLoading && autoDetectedCount > 0 && (
                <div className="map-detect-pill">
                  <Sparkles className="w-3 h-3" /> {autoDetectedCount} of {STUDENT_FIELDS.length} fields auto-detected
                </div>
              )}
              {!columnsLoading && columnsError && (
                <div className="map-warn-pill" title={columnsError}>
                  <AlertCircle className="w-3 h-3" /> Using local mapping
                </div>
              )}
            </div>
            <button onClick={reset} className="map-reset-btn">
              <X className="w-4 h-4" /> Start Over
            </button>
          </div>

          {/* Two-column layout: detected CSV headers (left) | field mapping (right) */}
          <div className="map-layout">
            {/* LEFT: detected CSV columns */}
            <div className="map-side-card">
              <div className="map-side-header">
                <Columns className="w-4 h-4 map-side-icon" />
                <span className="map-side-title">Detected CSV columns</span>
                <span className="map-side-count">{csvHeaders.length}</span>
              </div>
              <div className="map-side-list">
                {columnsAnalysis?.columns
                  ? columnsAnalysis.columns.map(col => {
                      const kindIcon =
                        col.kind === 'date' ? <Calendar className="w-3 h-3" /> :
                        col.kind === 'email' ? <Mail className="w-3 h-3" /> :
                        col.kind === 'phone' ? <Phone className="w-3 h-3" /> :
                        col.kind === 'number' ? <Hash className="w-3 h-3" /> :
                        col.kind === 'name' ? <Type className="w-3 h-3" /> :
                        <Tag className="w-3 h-3" />
                      return (
                        <div
                          key={col.header}
                          className={`map-side-row ${col.is_mapped ? 'is-mapped' : ''}`}
                        >
                          <div className="map-side-row-main">
                            <span className="map-side-row-header" title={col.header}>
                              {col.header}
                            </span>
                            <span className="map-side-row-kind" title={`Detected type: ${col.kind}`}>
                              {kindIcon}
                              {col.kind}
                            </span>
                          </div>
                          <div className="map-side-row-meta">
                            <span className="map-side-row-fill">
                              {Math.round(col.fill_rate * 100)}% filled
                            </span>
                            {col.is_mapped && col.mapped_to && (
                              <span className="map-side-row-mapped">
                                → {STUDENT_FIELDS.find(f => f.key === col.mapped_to)?.label}
                              </span>
                            )}
                          </div>
                          {col.samples.length > 0 && (
                            <div className="map-side-row-samples">
                              {col.samples.slice(0, 2).map((s, i) => (
                                <span key={i} className="map-side-row-sample">
                                  {s || <em>(empty)</em>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  : csvHeaders.map(h => (
                      <div key={h} className="map-side-row">
                        <div className="map-side-row-main">
                          <span className="map-side-row-header">{h}</span>
                          {columnMapping && Object.values(columnMapping).includes(h) && (
                            <span className="map-side-row-mapped">
                              → {STUDENT_FIELDS.find(f => columnMapping[f.key] === h)?.label}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {/* RIGHT: field mapping */}
            <div className="map-card">
              <div className="map-card-title">Map to student fields</div>
              <div className="map-card-subtitle">
                Match each student field to a CSV column. Required fields are highlighted; optional ones can be skipped.
              </div>
              <div className="map-fields">
                {STUDENT_FIELDS.map(field => {
                  const suggested = columnsAnalysis?.suggested_mapping?.[field.key]
                  const topScore = columnsAnalysis?.field_scores?.[field.key]?.[0]
                  const wasAuto = !!(suggested && columnMapping[field.key] === suggested)
                  const isMapped = !!columnMapping[field.key]
                  const status: 'auto' | 'manual' | 'skipped' =
                    !isMapped ? 'skipped' : wasAuto ? 'auto' : 'manual'
                  return (
                    <div
                      key={field.key}
                      className={`map-field-row map-field-${status} ${field.required ? 'map-field-is-required' : 'map-field-is-optional'}`}
                    >
                      <div className="map-field-label">
                        <span className="map-field-name">{field.label}</span>
                        {field.required
                          ? <span className="map-field-required">required</span>
                          : <span className="map-field-optional">optional</span>}
                      </div>
                      <div className="map-field-arrow">→</div>
                      <div className="map-field-control">
                        <select
                          className="map-field-select"
                          value={columnMapping[field.key] || ''}
                          onChange={e => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                          aria-label={`Map ${field.label} to a CSV column`}
                        >
                          <option value="">— skip —</option>
                          {csvHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <div className="map-field-status">
                          {status === 'auto' && (
                            <span className="map-field-badge map-field-badge-auto" title={topScore?.reason || 'Auto-detected'}>
                              <Sparkles className="w-3 h-3" /> auto
                            </span>
                          )}
                          {status === 'manual' && (
                            <span className="map-field-badge map-field-badge-manual" title="Manually selected">
                              manual
                            </span>
                          )}
                          {status === 'skipped' && field.required && (
                            <span className="map-field-badge map-field-badge-warn" title="Required field — please map it">
                              <AlertCircle className="w-3 h-3" /> needs mapping
                            </span>
                          )}
                          {status === 'skipped' && !field.required && (
                            <span className="map-field-badge map-field-badge-skip" title="Optional — will be left blank">
                              skipped
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mapped preview */}
          {csvRows.length > 0 && (
            <div className="map-preview-card">
              <div className="map-preview-title">Sample (first 3 rows)</div>
              <div className="map-preview-table-wrap">
                <table className="map-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {STUDENT_FIELDS.map(f => (
                        <th key={f.key}>
                          {f.label}
                          {f.required && <span className="map-preview-th-required">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        <td className="map-preview-row-num">{i + 1}</td>
                        {STUDENT_FIELDS.map(f => {
                          const col = columnMapping[f.key]
                          const val = col ? (row[col] || '') : ''
                          return (
                            <td key={f.key} className={!val && f.required ? 'map-preview-missing' : ''}>
                              {val || <span className="map-preview-empty">—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="map-actions">
            <button onClick={() => setStep('upload')} className="map-back-btn">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleShowPreview}
              disabled={loading || (columnsAnalysis?.unmapped_required?.length ?? 0) > 0}
              className="map-preview-btn"
              title={
                (columnsAnalysis?.unmapped_required?.length ?? 0) > 0
                  ? `Map required fields first: ${columnsAnalysis?.unmapped_required?.map(k => STUDENT_FIELDS.find(f => f.key === k)?.label).join(', ')}`
                  : 'Continue to preview'
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 import-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <ListChecks className="w-4 h-4" /> Show Preview
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: PREVIEW ── */}
      {step === 'preview' && previewData && (
        <>
          {/* Summary bar */}
          <div className="preview-summary-grid">
            <div className="preview-stat-card">
              <div className="preview-stat-label">Total Rows</div>
              <div className="preview-stat-value">{previewData.summary.total}</div>
            </div>
            <div className="preview-stat-card preview-stat-insert">
              <div className="preview-stat-label">Will Insert</div>
              <div className="preview-stat-value preview-stat-green">
                {effectiveCounts.inserts + effectiveCounts.importsAsNew}
              </div>
            </div>
            <div className="preview-stat-card preview-stat-update">
              <div className="preview-stat-label">Will Update</div>
              <div className="preview-stat-value preview-stat-yellow">{effectiveCounts.updates}</div>
            </div>
            <div className="preview-stat-card preview-stat-dup">
              <div className="preview-stat-label">Duplicates</div>
              <div className="preview-stat-value preview-stat-muted">
                {previewData.summary.duplicates}
                {previewData.summary.duplicates > 0 && effectiveCounts.kept > 0 && (
                  <span className="preview-stat-sub"> ({effectiveCounts.kept} kept)</span>
                )}
              </div>
            </div>
            <div className="preview-stat-card preview-stat-err">
              <div className="preview-stat-label">Errors</div>
              <div className={`preview-stat-value ${previewData.summary.errorsCount > 0 ? 'preview-stat-red' : 'preview-stat-green'}`}>
                {previewData.summary.errorsCount}
              </div>
            </div>
          </div>

          {/* Validation errors */}
          {previewData.errors.length > 0 && (
            <div className="preview-errors-card">
              <div className="preview-errors-header">
                <AlertCircle className="w-4 h-4" />
                <span className="preview-errors-title">Validation Errors</span>
              </div>
              <div className="preview-errors-list">
                {previewData.errors.slice(0, 10).map((err, i) => (
                  <div key={i} className="preview-error-item">
                    <span className="preview-error-row">Row {err.row}</span>
                    <span className="preview-error-msg">{err.message}</span>
                  </div>
                ))}
                {previewData.errors.length > 10 && (
                  <div className="preview-errors-more">...and {previewData.errors.length - 10} more errors</div>
                )}
              </div>
            </div>
          )}

          {/* Insert rows */}
          {previewData.toInsert.length > 0 && (
            <div className="preview-section">
              <div className="preview-section-header">
                <Check className="w-4 h-4 preview-section-icon preview-section-icon-green" />
                <span className="preview-section-title">New Students ({previewData.toInsert.length})</span>
              </div>
              <div className="preview-table-card">
                <div className="preview-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>DOB</th>
                        <th>Permit</th>
                        <th>Parent Email</th>
                        <th>Classroom Hrs</th>
                        <th>Driving Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.toInsert.slice(0, 20).map((row, i) => (
                        <tr key={i}>
                          <td className="preview-row-num">{i + 1}</td>
                          <td className="preview-name">{row.student_name || '—'}</td>
                          <td className="preview-mono">{row.dob || '—'}</td>
                          <td className="preview-mono">{row.permit_number || '—'}</td>
                          <td>{row.parent_email || '—'}</td>
                          <td className="preview-mono">{row.classroom_hours || '—'}</td>
                          <td className="preview-mono">{row.driving_hours || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.toInsert.length > 20 && (
                  <div className="preview-table-footer">Showing 20 of {previewData.toInsert.length} rows</div>
                )}
              </div>
            </div>
          )}

          {/* ── Duplicates detected (with per-row resolution) ── */}
          {previewData.duplicates.length > 0 && (
            <div className="preview-section">
              <div className="preview-section-header preview-section-header-amber">
                <AlertCircle className="w-4 h-4 preview-section-icon preview-section-icon-yellow" />
                <span className="preview-section-title">
                  Duplicates detected ({previewData.duplicates.length})
                </span>
                <span className="preview-section-subtitle">
                  Choose how to resolve each match. Existing students will be left untouched unless you say otherwise.
                </span>
              </div>

              <div className="dup-bulk-bar">
                <div className="dup-bulk-label">Bulk action:</div>
                <button
                  type="button"
                  className="dup-bulk-btn"
                  onClick={() => {
                    const next: Record<string, DuplicateResolution> = {}
                    for (const d of previewData.duplicates) next[d.id] = 'keep_existing'
                    setDuplicateResolutions(next)
                  }}
                >
                  Keep all existing
                </button>
                <button
                  type="button"
                  className="dup-bulk-btn"
                  onClick={() => {
                    const next: Record<string, DuplicateResolution> = {}
                    for (const d of previewData.duplicates) next[d.id] = 'update_existing'
                    setDuplicateResolutions(next)
                  }}
                >
                  Update all with new
                </button>
                <button
                  type="button"
                  className="dup-bulk-btn"
                  onClick={() => {
                    const next: Record<string, DuplicateResolution> = {}
                    for (const d of previewData.duplicates) next[d.id] = 'import_as_new'
                    setDuplicateResolutions(next)
                  }}
                >
                  Import all as new
                </button>
              </div>

              <div className="dup-list">
                {previewData.duplicates.map((dup) => {
                  const res = getResolution(dup)
                  const reasonLabel = dup.matchReason === 'email'
                    ? 'Same parent email'
                    : dup.matchReason === 'name_phone'
                      ? 'Same name + phone'
                      : 'Same date of birth'
                  const isIntraCsv = dup.existing.id.startsWith('intra::')
                  return (
                    <div key={dup.id} className={`dup-card dup-card-${res}`}>
                      <div className="dup-card-meta">
                        <div className="dup-match-reason">
                          <span className={`dup-match-pill dup-match-pill-${dup.confidence}`}>
                            {dup.confidence === 'high' ? 'High confidence' : 'Medium confidence'}
                          </span>
                          <span className="dup-match-label">{reasonLabel}</span>
                          {isIntraCsv && (
                            <span className="dup-match-intra">Within this CSV</span>
                          )}
                        </div>
                      </div>

                      <div className="dup-compare">
                        {/* Existing student column */}
                        <div className="dup-compare-col dup-compare-existing">
                          <div className="dup-compare-header">
                            <UserCheck className="w-4 h-4" />
                            <span>Existing student</span>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Name</div>
                            <div className="dup-field-value">{dup.existing.name || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">DOB</div>
                            <div className="dup-field-value dup-mono">{dup.existing.dob || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Parent email</div>
                            <div className="dup-field-value">{dup.existing.email || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Phone</div>
                            <div className="dup-field-value dup-mono">{dup.existing.phone || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Permit</div>
                            <div className="dup-field-value dup-mono">{dup.existing.permit_number || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Classroom hrs</div>
                            <div className="dup-field-value dup-mono">{dup.existing.classroom_hours ?? '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Driving hrs</div>
                            <div className="dup-field-value dup-mono">{dup.existing.driving_hours ?? '—'}</div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="dup-compare-arrow" aria-hidden>
                          ↔
                        </div>

                        {/* Incoming row column */}
                        <div className="dup-compare-col dup-compare-incoming">
                          <div className="dup-compare-header">
                            <FileText className="w-4 h-4" />
                            <span>New data (from CSV)</span>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Name</div>
                            <div className="dup-field-value">{dup.incoming.student_name || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">DOB</div>
                            <div className="dup-field-value dup-mono">{dup.incoming.dob || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Parent email</div>
                            <div className="dup-field-value">{dup.incoming.parent_email || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Phone</div>
                            <div className="dup-field-value dup-mono">{dup.incoming.phone || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Permit</div>
                            <div className="dup-field-value dup-mono">{dup.incoming.permit_number || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Classroom hrs</div>
                            <div className="dup-field-value dup-mono">{dup.incoming.classroom_hours || '—'}</div>
                          </div>
                          <div className="dup-field">
                            <div className="dup-field-label">Driving hrs</div>
                            <div className="dup-field-value dup-mono">{dup.incoming.driving_hours || '—'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="dup-actions" role="group" aria-label="Resolve duplicate">
                        <button
                          type="button"
                          className={`dup-action-btn dup-action-keep ${res === 'keep_existing' ? 'is-active' : ''}`}
                          onClick={() => setResolution(dup.id, 'keep_existing')}
                          aria-pressed={res === 'keep_existing'}
                        >
                          <UserCheck className="w-4 h-4" />
                          <div className="dup-action-text">
                            <div className="dup-action-title">Keep existing</div>
                            <div className="dup-action-sub">Skip this CSV row</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`dup-action-btn dup-action-update ${res === 'update_existing' ? 'is-active' : ''}`}
                          onClick={() => setResolution(dup.id, 'update_existing')}
                          aria-pressed={res === 'update_existing'}
                        >
                          <RefreshCw className="w-4 h-4" />
                          <div className="dup-action-text">
                            <div className="dup-action-title">Update with new</div>
                            <div className="dup-action-sub">Overwrite existing fields</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`dup-action-btn dup-action-new ${res === 'import_as_new' ? 'is-active' : ''}`}
                          onClick={() => setResolution(dup.id, 'import_as_new')}
                          aria-pressed={res === 'import_as_new'}
                        >
                          <UserPlus className="w-4 h-4" />
                          <div className="dup-action-text">
                            <div className="dup-action-title">Import as new</div>
                            <div className="dup-action-sub">Create a separate record</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="preview-actions">
            <button onClick={() => setStep('map')} className="preview-back-btn">
              <ChevronLeft className="w-4 h-4" /> Back to Mapping
            </button>
            <button
              onClick={handleImport}
              disabled={effectiveCounts.total === 0}
              className="preview-confirm-btn"
            >
              <ArrowRight className="w-4 h-4" />
              Import {effectiveCounts.total} Student{effectiveCounts.total === 1 ? '' : 's'}
              {previewData.summary.duplicates > 0 && (
                <span className="preview-confirm-meta">
                  ({effectiveCounts.kept} skipped as duplicate)
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── IMPORTING ── */}
      {step === 'importing' && (
        <div className="importing-card">
          <Loader2 className="importing-icon" />
          <ProgressBar current={progress.current} total={progress.total} />
          <p className="importing-subtitle">Processing student records... Please wait.</p>
        </div>
      )}

      {/* ── DONE ── */}
      {step === 'done' && result && (
        <div className={`done-card ${result.failed === 0 ? 'done-success' : 'done-warning'}`}>
          <div className="done-icon-wrap">
            {result.failed === 0 ? (
              <Check className="done-icon done-icon-green" />
            ) : (
              <AlertCircle className="done-icon done-icon-yellow" />
            )}
          </div>
          <h2 className="done-title">
            {result.failed === 0 ? 'Import Complete' : 'Import Completed with Warnings'}
          </h2>
          <p className="done-subtitle">Processed {result.total} rows</p>

          <div className="done-stats-grid">
            <div className="done-stat-card">
              <div className="done-stat-label">Imported</div>
              <div className="done-stat-value done-stat-green">{result.imported}</div>
            </div>
            <div className="done-stat-card">
              <div className="done-stat-label">Skipped</div>
              <div className="done-stat-value done-stat-muted">{previewData?.duplicates.length ?? 0}</div>
            </div>
            <div className="done-stat-card">
              <div className="done-stat-label">Failed</div>
              <div className={`done-stat-value ${result.failed > 0 ? 'done-stat-red' : 'done-stat-green'}`}>{result.failed}</div>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="done-errors-card">
              <div className="done-errors-title">Import Errors</div>
              <div className="done-errors-list">
                {result.errors.slice(0, 10).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
                {result.errors.length > 10 && (
                  <div className="done-errors-more">...and {result.errors.length - 10} more errors</div>
                )}
              </div>
            </div>
          )}

          {/* ── Cleanup tasks checklist ── */}
          <div className="cleanup-card">
            <div className="cleanup-header">
              <ClipboardList className="w-4 h-4 cleanup-header-icon" />
              <span className="cleanup-title">Post-import cleanup tasks</span>
              <span className="cleanup-count">
                {cleanupTasks.length === 0
                  ? 'All optional fields complete'
                  : `${checkedTasks.size}/${cleanupTasks.length} done`}
              </span>
            </div>
            {cleanupTasks.length === 0 ? (
              <div className="cleanup-empty">
                <Check className="w-4 h-4 cleanup-empty-icon" />
                <span>Every imported student has all optional fields filled in. Nice work.</span>
              </div>
            ) : (
              <ul className="cleanup-list">
                {cleanupTasks.map(task => {
                  const checked = checkedTasks.has(task.id)
                  return (
                    <li key={task.id} className={`cleanup-item ${checked ? 'cleanup-item-done' : ''}`}>
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className="cleanup-checkbox"
                        aria-label={checked ? `Mark ${task.message} as not done` : `Mark ${task.message} as done`}
                        aria-pressed={checked}
                      >
                        {checked
                          ? <CheckSquare className="w-4 h-4 cleanup-checkbox-icon-on" />
                          : <Square className="w-4 h-4 cleanup-checkbox-icon-off" />}
                      </button>
                      <span className="cleanup-msg">{task.message}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="done-actions">
            <button
              type="button"
              onClick={handleExportReport}
              disabled={exportRows.length === 0}
              className="done-export-btn"
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button onClick={reset} className="done-reset-btn">
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="error-banner">
          <AlertCircle className="w-4 h-4" />
          <span className="error-banner-text">{error}</span>
          <button onClick={() => setError('')} className="error-banner-close">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
