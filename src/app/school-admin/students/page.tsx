'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Pencil, Shield, Mail, Phone, Users, X, UserCheck, ChevronDown } from 'lucide-react'

type Student = {
  id: string
  legal_name: string
  permit_number?: string | null
  dob?: string
  parent_email: string | null
  classroom_hours: number
  driving_hours: number
  certificate_issued_at: string | null
  enrollment_date?: string
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  created_at: string
  school_id?: string
  instructor_id?: string | null
}

type Instructor = {
  id: string
  name: string
  email?: string | null
  active?: boolean
}

function getStudentStatus(s: Student): string {
  if (s.certificate_issued_at) return 'certified'
  if (s.classroom_hours > 0 || s.driving_hours > 0) return 'in_progress'
  return 'pending'
}

function getStatusLabel(status: string): string {
  if (status === 'certified') return 'Certified'
  if (status === 'in_progress') return 'In Progress'
  return 'Pending'
}

function avatarGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg, var(--status-blue), var(--status-purple))',
    'linear-gradient(135deg, var(--admin-accent), var(--status-blue))',
    'linear-gradient(135deg, var(--status-purple), var(--accent-secondary))',
    'linear-gradient(135deg, var(--accent-secondary), var(--warning))',
    'linear-gradient(135deg, var(--status-blue), var(--admin-accent))',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

function getInitials(name: string): string {
  const display = name.startsWith('eyJ') ? 'SR' : name
  const parts = display.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return display.slice(0, 2).toUpperCase()
}

// NAV_ITEMS removed — layout provides the sidebar

const GLASS_BG = 'var(--glass-bg)'
const GLASS_BORDER = 'var(--glass-border)'
const GLASS_BLUR = 'var(--glass-blur)'
const TEXT_SECONDARY = 'var(--admin-text-secondary)'
const CARD_SHADOW = 'var(--glass-shadow)'

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '999px',
      fontSize: '12px', fontWeight: '600',
      background: status === 'certified' ? 'color-mix(in srgb, var(--status-blue), transparent 85%)' : status === 'in_progress' ? 'color-mix(in srgb, var(--admin-accent), transparent 85%)' : 'color-mix(in srgb, var(--accent-secondary), transparent 85%)',
      color: status === 'certified' ? 'var(--status-blue)' : status === 'in_progress' ? 'var(--admin-accent)' : 'var(--accent-secondary)',
    }}>
      {getStatusLabel(status)}
    </span>
  )
}

function AddStudentModal({ onClose, onAdd, schoolId: propSchoolId }: { onClose: () => void; onAdd: (s: Partial<Student>) => void; schoolId?: string | null }) {
  const [form, setForm] = useState({ legal_name: '', dob: '', parent_email: '', emergency_contact_name: '', emergency_contact_phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
    const isDemo = !!demoCookie

    // Always use API route (bypasses RLS with service role key)
    const endpoint = isDemo ? '/api/demo/students' : '/api/students'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (!isDemo) {
      // Resolve school_id from prop, demo cookie, or auth
      let sid: string | null = propSchoolId ?? null
      if (!sid && demoCookie) {
        try { sid = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId } catch {}
      }
      if (sid) headers['x-school-id'] = sid
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          legal_name: form.legal_name,
          dob: form.dob,
          parent_email: form.parent_email || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to add student'); setLoading(false); return }
      if (data) { onAdd(data); onClose() }
    } catch {
      setError('Something went wrong')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--admin-bg), transparent 60%)', border: '1px solid var(--glass-border)', color: 'var(--admin-text)',
    outline: 'none', borderRadius: '12px', width: '100%', padding: '12px 16px', fontSize: '14px',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'color-mix(in srgb, var(--admin-bg), transparent 30%)', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: '100%', maxWidth: '480px', background: 'color-mix(in srgb, var(--admin-surface), transparent 5%)', backdropFilter: 'blur(24px)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '32px', boxShadow: 'var(--glass-shadow)' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '24px' }}>Add Student</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[{ key: 'legal_name', label: 'Full Legal Name', placeholder: 'Jordan Kim', type: 'text' }, { key: 'dob', label: 'Date of Birth', placeholder: '2010-03-15', type: 'date' }, { key: 'parent_email', label: 'Parent Email', placeholder: 'parent@email.com', type: 'email' }, { key: 'emergency_contact_name', label: 'Emergency Contact', placeholder: 'Full Name', type: 'text' }, { key: 'emergency_contact_phone', label: 'Emergency Phone', placeholder: '(615) 555-0100', type: 'tel' }].map(({ key, label, placeholder, type = 'text' }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>{label}</label>
              <input type={type} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} required style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--admin-accent)')} onBlur={e => (e.target.style.borderColor = 'var(--glass-border)')} />
            </div>
          ))}
          {error && <p style={{ fontSize: '13px', color: 'var(--accent-secondary)', margin: 0, padding: '8px 12px', background: 'color-mix(in srgb, var(--accent-secondary), transparent 90%)', borderRadius: '8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--admin-text)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--text-primary), transparent 95%)')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: 'var(--admin-accent)', border: 'none', borderRadius: '12px', color: 'var(--admin-bg)', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>{loading ? 'Adding...' : 'Add Student →'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ROA-14: booking-history row + table ─────────────────────────────
type HistoryRow = {
  id: string
  session_id: string | null
  session_date: string | null
  session_time: string | null
  session_location?: string | null
  session_type?: { name: string } | null
  instructor?: { name: string } | null

  booking_status: string
  payment_status: string | null

  checked_in: boolean
  checked_in_at: string | null
  completed: boolean
  completed_at: string | null

  deposit_amount_cents?: number
  cancelled_at?: string | null
  cancellation_reason?: string | null
  created_at: string
}

function fmtHistoryDate(d: string | null): string {
  if (!d) return '—'
  try {
    const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d)
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}

function fmtHistoryTime(t: string | null): string {
  if (!t) return ''
  // 24h HH:MM[:SS] → 12h with am/pm
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return t
  const h = parseInt(m[1], 10)
  const min = m[2]
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${min}${ampm}`
}

function fmtHistoryTimestamp(iso: string | null): string {
  if (!iso) return ''
  try {
    const dt = new Date(iso)
    if (isNaN(dt.getTime())) return ''
    return dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function bookingStatusColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'confirmed':
    case 'checked_in':
    case 'completed':
      return { bg: 'color-mix(in srgb, var(--admin-accent), transparent 85%)', fg: 'var(--admin-accent)' }
    case 'pending':
      return { bg: 'color-mix(in srgb, var(--status-blue), transparent 85%)', fg: 'var(--status-blue)' }
    case 'cancelled':
    case 'canceled':
    case 'no_show':
      return { bg: 'color-mix(in srgb, var(--accent-secondary), transparent 85%)', fg: 'var(--accent-secondary)' }
    default:
      return { bg: 'color-mix(in srgb, var(--text-primary), transparent 92%)', fg: TEXT_SECONDARY }
  }
}

function paymentStatusColor(status: string | null): { bg: string; fg: string } {
  if (!status) return { bg: 'color-mix(in srgb, var(--text-primary), transparent 94%)', fg: TEXT_SECONDARY }
  if (status === 'paid') return { bg: 'color-mix(in srgb, var(--admin-accent), transparent 85%)', fg: 'var(--admin-accent)' }
  if (status === 'pending' || status === 'processing') return { bg: 'color-mix(in srgb, var(--warning), transparent 85%)', fg: 'var(--warning)' }
  if (status === 'refunded') return { bg: 'color-mix(in srgb, var(--status-blue), transparent 85%)', fg: 'var(--status-blue)' }
  if (status === 'failed') return { bg: 'color-mix(in srgb, var(--accent-secondary), transparent 85%)', fg: 'var(--accent-secondary)' }
  return { bg: 'color-mix(in srgb, var(--text-primary), transparent 92%)', fg: TEXT_SECONDARY }
}

function HistoryStatusPill({ label, color }: { label: string; color: { bg: string; fg: string } }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '999px',
      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em',
      background: color.bg, color: color.fg, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function BookingHistoryTable({ studentId, schoolId }: { studentId: string; schoolId: string | null }) {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
    const endpoint = demoCookie
      ? `/api/demo/students/${studentId}/history`
      : `/api/students/${studentId}/history`
    fetch(endpoint, demoCookie ? {} : { headers: schoolId ? { 'x-school-id': schoolId } : {} })
      .then(async r => {
        if (!r.ok) return { history: [] }
        const body = await r.json()
        return body
      })
      .then(data => {
        const list = Array.isArray(data?.history) ? data.history : []
        setRows(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [studentId, schoolId])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 0' }}>
        {[...Array(2)].map((_, i) => (
          <div key={i} style={{ height: '64px', borderRadius: '10px', background: 'color-mix(in srgb, var(--text-primary), transparent 97%)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: TEXT_SECONDARY, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking History</h3>
        <div style={{
          padding: '20px', textAlign: 'center', borderRadius: '12px',
          border: '1px dashed var(--glass-border)', color: TEXT_SECONDARY, fontSize: '13px',
        }}>
          No bookings yet — once this student is booked into a session, the
          history will appear here.
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '600', color: TEXT_SECONDARY, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Booking History · {rows.length}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(b => {
          const sessionTypeName = (b.session_type as { name?: string } | null)?.name ?? 'Lesson'
          const instructorName = (b.instructor as { name?: string } | null)?.name ?? null
          const dateStr = fmtHistoryDate(b.session_date)
          const timeStr = fmtHistoryTime(b.session_time)
          const bookingColor = bookingStatusColor(b.booking_status)
          const payColor = paymentStatusColor(b.payment_status)
          const checkedInLabel = b.checked_in_at ? fmtHistoryTimestamp(b.checked_in_at) : '—'
          const completedLabel = b.completed_at ? fmtHistoryTimestamp(b.completed_at) : (b.completed ? 'Yes' : '—')

          return (
            <div key={b.id} style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'color-mix(in srgb, var(--admin-bg), transparent 70%)',
              border: '1px solid var(--glass-border)',
            }}>
              {/* Top row: session title + booking status pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text)' }}>{sessionTypeName}</div>
                  <div style={{ fontSize: '11px', color: TEXT_SECONDARY }}>
                    {dateStr}{timeStr ? ` · ${timeStr}` : ''}{instructorName ? ` · ${instructorName}` : ''}
                  </div>
                </div>
                <HistoryStatusPill label={b.booking_status} color={bookingColor} />
              </div>

              {/* ROA-14 required fields: payment · check-in · completion */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px',
                paddingTop: '8px', borderTop: '1px solid color-mix(in srgb, var(--text-primary), transparent 94%)',
              }}>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: TEXT_SECONDARY, marginBottom: '4px' }}>Payment</div>
                  <HistoryStatusPill label={b.payment_status ?? 'unpaid'} color={payColor} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: TEXT_SECONDARY, marginBottom: '4px' }}>Check-in</div>
                  <div style={{ fontSize: '11px', color: b.checked_in_at ? 'var(--admin-text)' : TEXT_SECONDARY, fontWeight: '600' }}>
                    {checkedInLabel}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: TEXT_SECONDARY, marginBottom: '4px' }}>Completed</div>
                  <div style={{ fontSize: '11px', color: b.completed ? 'var(--admin-accent)' : TEXT_SECONDARY, fontWeight: '600' }}>
                    {completedLabel}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StudentDetailModal({ student, onClose, schoolId }: { student: Student; onClose: () => void; schoolId: string | null }) {
  const displayName = student.legal_name.startsWith('eyJ') ? 'Student Record' : student.legal_name
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'color-mix(in srgb, var(--admin-bg), transparent 30%)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
          background: 'color-mix(in srgb, var(--text-primary), transparent 95%)', backdropFilter: 'blur(24px)',
          border: '1px solid color-mix(in srgb, var(--text-primary), transparent 90%)', borderRadius: '24px',
          padding: '32px', position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--admin-border)', border: '1px solid color-mix(in srgb, var(--text-primary), transparent 90%)',
            color: 'var(--admin-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Student avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: avatarGradient(student.legal_name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: '700', color: 'var(--admin-text)',
          }}>
            {getInitials(displayName)}
          </div>
          <div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '2px' }}>
              {displayName}
            </h2>
            <p style={{ fontSize: '13px', color: TEXT_SECONDARY }}>{student.parent_email || 'No email on file'}</p>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Email', value: student.parent_email || '—' },
            { label: 'Phone', value: student.emergency_contact_phone || '—' },
            { label: 'Permit #', value: student.permit_number || 'PENDING' },
            { label: 'DOB', value: student.dob ? new Date(student.dob + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
            { label: 'Enrolled', value: student.enrollment_date ? new Date(student.enrollment_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
            { label: 'Emergency Contact', value: student.emergency_contact_name || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'color-mix(in srgb, var(--admin-bg), transparent 70%)', borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: TEXT_SECONDARY, marginBottom: '4px' }}>{label}</p>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: TEXT_SECONDARY }}>Classroom Hours</span>
              <span style={{ fontSize: '12px', color: 'var(--admin-text)', fontWeight: '600' }}>{student.classroom_hours}h / 6h</span>
            </div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'var(--glass-border)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (student.classroom_hours / 6) * 100)}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, var(--status-blue), var(--status-purple))' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: TEXT_SECONDARY }}>Driving Hours</span>
              <span style={{ fontSize: '12px', color: 'var(--admin-text)', fontWeight: '600' }}>{student.driving_hours}h / 6h</span>
            </div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'var(--glass-border)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (student.driving_hours / 6) * 100)}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, var(--admin-accent), var(--status-blue))' }} />
            </div>
          </div>
        </div>

        {/* Booking History */}
        <BookingHistoryTable studentId={student.id} schoolId={schoolId} />
      </div>
    </div>
  )
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [instructorFilter, setInstructorFilter] = useState<string>('') // '' = all

  useEffect(() => {
    async function load() {
      const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
      let sid: string | null = null
      if (demoCookie) {
        try {
          const res = await fetch('/api/demo/students')
          if (res.ok) { setStudents(await res.json()) }
        } catch {}
        // Also load instructors for demo
        try {
          const demoCookie2 = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
          if (demoCookie2) {
            const payload = JSON.parse(atob(decodeURIComponent(demoCookie2.split('=')[1])))
            sid = payload?.schoolId
          }
          if (!sid) { setLoading(false); return }
          const instrRes = await fetch('/api/instructors?school_id=' + encodeURIComponent(sid))
          if (instrRes.ok) {
            const instrList = await instrRes.json()
            setInstructors(instrList.filter((i: Instructor) => i.active !== false))
          }
        } catch {}
        setLoading(false); return
      }
      // Non-demo: resolve school_id, then use API route
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: school } = await supabase.from('schools').select('id').eq('owner_email', user.email).single()
      if (!school) { setLoading(false); return }
      sid = school.id as string
      if (!sid) { setLoading(false); return }
      setSchoolId(sid)
      // Use API route to bypass RLS
      try {
        const res = await fetch('/api/students?school_id=' + encodeURIComponent(sid), {
          headers: { 'x-school-id': sid as string },
        })
        if (res.ok) { setStudents(await res.json()) }
      } catch {}
      // Load instructors
      try {
        const instrRes = await fetch('/api/instructors', {
          headers: { 'x-school-id': sid as string },
        })
        if (instrRes.ok) {
          const instrList = await instrRes.json()
          setInstructors(instrList.filter((i: Instructor) => i.active !== false))
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [router])

  // Fetch full student detail when selected
  useEffect(() => {
    if (!selectedStudent) return
    const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
    if (demoCookie || !selectedStudent?.legal_name) return // demo already has full data
    // Check if detail modal fields are present; if not, lazy-load from API
    if (selectedStudent.dob && selectedStudent.permit_number) return
    queueMicrotask(() => undefined)
    fetch('/api/students/' + selectedStudent.id, {
      headers: schoolId ? { 'x-school-id': schoolId } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setSelectedStudent(data)
      })
      .catch(() => undefined)
  }, [selectedStudent?.id ?? null, schoolId])

  const filtered = students.filter(s => {
    const matchName = s.legal_name.toLowerCase().includes(search.toLowerCase()) || (s.parent_email || '').toLowerCase().includes(search.toLowerCase())
    const matchInstructor = instructorFilter === '' || s.instructor_id === instructorFilter
    return matchName && matchInstructor
  })

  return (
    <>






      {/* Main Content */}
      <div className="admin-main">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '4px', letterSpacing: '-0.01em' }}>Students</h1>
            <p style={{ fontSize: '14px', color: TEXT_SECONDARY }}>{students.length} total</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
            background: 'var(--admin-accent)', border: 'none', borderRadius: '12px', color: 'var(--admin-bg)',
            fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            boxShadow: '0 0 16px color-mix(in srgb, var(--admin-accent), transparent 70%)', transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px color-mix(in srgb, var(--admin-accent), transparent 60%)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px color-mix(in srgb, var(--admin-accent), transparent 70%)' }}>
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>

        {/* Search + Filter row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {/* Search bar - glass */}
          <div style={{
            flex: 1,
            position: 'relative',
            background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
            border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px',
            boxShadow: CARD_SHADOW,
          }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: TEXT_SECONDARY, pointerEvents: 'none', zIndex: 1 }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{
              width: '100%', padding: '14px 16px 14px 44px', background: 'transparent', border: 'none',
              borderRadius: '16px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none',
            }}
            onFocus={e => (e.target.parentElement!.style.borderColor = 'color-mix(in srgb, var(--admin-accent), transparent 70%)')}
            onBlur={e => (e.target.parentElement!.style.borderColor = GLASS_BORDER)}
            />
          </div>

          {/* Instructor filter */}
          <div style={{
            position: 'relative',
            background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
            border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px',
            boxShadow: CARD_SHADOW,
          }}>
            <UserCheck style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: TEXT_SECONDARY, pointerEvents: 'none', zIndex: 1 }} />
            <select
              value={instructorFilter}
              onChange={e => setInstructorFilter(e.target.value)}
              style={{
                padding: '14px 16px 14px 40px', background: 'transparent', border: 'none',
                borderRadius: '16px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none',
                cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                minWidth: '160px',
              }}
              onFocus={e => (e.target.parentElement!.style.borderColor = 'color-mix(in srgb, var(--admin-accent), transparent 70%)')}
              onBlur={e => (e.target.parentElement!.style.borderColor = GLASS_BORDER)}
            >
              <option value="">All Instructors</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className='students-table' style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 160px 60px', gap: '16px', padding: '12px 24px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
              {['Name', 'Contact', 'TCA Progress', 'Status', 'Instructor', ''].map((_, i) => (
                <div key={i} style={{ height: '12px', borderRadius: '6px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 160px 60px', gap: '16px', padding: '16px 24px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: '14px', width: '60%', borderRadius: '6px', marginBottom: '6px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '40%', borderRadius: '6px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px' }}>
                  <div className="skeleton" style={{ height: '12px', width: '80%', borderRadius: '6px' }} />
                  <div className="skeleton" style={{ height: '12px', width: '60%', borderRadius: '6px' }} />
                </div>
                <div style={{ paddingTop: '8px' }}><div className="skeleton" style={{ height: '6px', width: '100%', borderRadius: '999px' }} /></div>
                <div style={{ paddingTop: '8px' }}><div className="skeleton" style={{ height: '24px', width: '80px', borderRadius: '999px' }} /></div>
                <div style={{ paddingTop: '8px' }}><div className="skeleton" style={{ height: '28px', width: '100%', borderRadius: '8px' }} /></div>
                <div style={{ paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}><div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px' }} /></div>
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <section className="command-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_SECONDARY, opacity: 0.5 }} />
            <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '6px' }}>
              {search ? 'No students match your search' : 'No students yet'}
            </p>
            <p style={{ fontSize: '13px', color: TEXT_SECONDARY, marginBottom: '16px' }}>
              {search ? 'Try a different search term' : 'Get started by adding your first student'}
            </p>
            {!search && (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', background: 'var(--admin-accent)', border: 'none',
                  borderRadius: '999px', color: 'var(--admin-bg)', fontSize: '13px',
                  fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 0 16px color-mix(in srgb, var(--admin-accent), transparent 70%)',
                }}
              >
                <Plus className="w-4 h-4" />
                Add Student
              </button>
            )}
          </section>
        ) : (
          <div className='students-table-container' style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            {/* Desktop header */}
            <div className='students-table-header' style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 160px 60px', gap: '16px', padding: '12px 24px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
              {['Name', 'Contact', 'TCA Progress', 'Status', 'Instructor', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: TEXT_SECONDARY }}>{h}</div>
              ))}
            </div>
            {filtered.map(student => {
              const status = getStudentStatus(student)
              const displayName = student.legal_name.startsWith('eyJ') ? 'Student Record' : student.legal_name
              const initials = getInitials(displayName)
              const gradient = avatarGradient(displayName)
              const totalHours = student.classroom_hours + student.driving_hours
              const tcaPct = Math.min(100, Math.round((totalHours / 60) * 100))
              const assignedInstructor = instructors.find(i => i.id === student.instructor_id)
              return (
                <div key={student.id} className='students-table-row' style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 160px 60px', gap: '16px', padding: '16px 24px', alignItems: 'center', borderBottom: `1px solid ${GLASS_BORDER}`, transition: 'background 0.15s', cursor: 'pointer' }}
                onClick={() => setSelectedStudent(student)}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--text-primary), transparent 97.5%)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--admin-text)', flexShrink: 0 }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                      <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', color: TEXT_SECONDARY }}>
                        <Shield className="w-3 h-3" style={{ color: student.classroom_hours >= 6 && student.driving_hours >= 6 ? 'var(--admin-accent)' : TEXT_SECONDARY }} />
                        {student.classroom_hours}h class · {student.driving_hours}h drive
                      </div>
                    </div>
                  </div>
                  <div className='students-table-contact' style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {student.parent_email && <div style={{ fontSize: '12px', color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: '6px' }}><Mail className="w-3 h-3" style={{ color: TEXT_SECONDARY, flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.parent_email}</span></div>}
                    {student.emergency_contact_phone && <div style={{ fontSize: '12px', color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: '6px' }}><Phone className="w-3 h-3" style={{ color: TEXT_SECONDARY, flexShrink: 0 }} />{student.emergency_contact_phone}</div>}
                  </div>
                  <div className='students-table-progress' style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ height: '6px', borderRadius: '999px', background: 'var(--glass-border)', flex: 1, minWidth: '60px', overflow: 'hidden' }}>
                      <div style={{ width: `${tcaPct}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, var(--status-blue), var(--status-purple))' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: TEXT_SECONDARY, flexShrink: 0 }}>{tcaPct}%</span>
                  </div>
                  <div className='students-table-status'><StatusBadge status={status} /></div>
                  {/* Instructor assignment dropdown */}
                  <div onClick={e => e.stopPropagation()} style={{ position: 'relative', display: 'inline-block' }}>
                    <select
                      value={student.instructor_id || ''}
                      onChange={async (e) => {
                        const newInstructorId = e.target.value || null
                        // Optimistically update UI
                        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, instructor_id: newInstructorId } : s))
                        try {
                          await fetch(`/api/students/${student.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'x-school-id': schoolId || '' },
                            body: JSON.stringify({ instructor_id: newInstructorId }),
                          })
                        } catch {
                          // Revert on failure
                          setStudents(prev => prev.map(s => s.id === student.id ? { ...s, instructor_id: student.instructor_id } : s))
                        }
                      }}
                      style={{
                        width: '100%', padding: '6px 28px 6px 10px', background: 'color-mix(in srgb, var(--admin-surface), transparent 60%)',
                        border: `1px solid ${GLASS_BORDER}`, borderRadius: '8px', color: assignedInstructor ? 'var(--admin-text)' : TEXT_SECONDARY,
                        fontSize: '12px', fontWeight: '500', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                      }}
                    >
                      <option value="">Assign...</option>
                      {instructors.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: TEXT_SECONDARY, pointerEvents: 'none' }} />
                  </div>
                  <div className='students-table-actions' style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Link href={`/school-admin/students/${student.id}`} style={{ padding: '8px', borderRadius: '8px', transition: 'background 0.15s, box-shadow 0.15s', color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'color-mix(in srgb, var(--admin-accent), transparent 85%)'; el.style.boxShadow = '0 0 12px color-mix(in srgb, var(--admin-accent), transparent 65%)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.boxShadow = 'none' }}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && <AddStudentModal onClose={() => setShowModal(false)} onAdd={s => setStudents(prev => [s as Student, ...prev])} schoolId={schoolId} />}

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          schoolId={schoolId}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @media (max-width: 768px) {
          .students-table-header { display: none !important; }
          .students-table-row {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            padding: 16px !important;
            position: relative;
          }
          .students-table-row > div { width: 100% !important; }
          .students-table-contact { margin-top: 0 !important; }
          .students-table-actions {
            position: absolute !important;
            top: 16px !important;
            right: 16px !important;
          }
        }
      `}</style>
    </>
  )
}
