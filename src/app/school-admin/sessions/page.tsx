'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, Users, Play, Pause, X, Settings, UserCheck, ListChecks } from 'lucide-react'
import SessionRosterModal from '@/components/admin/SessionRosterModal'

type Session = {
  id: string
  start_date: string
  end_date: string
  max_seats: number
  seats_booked: number
  instructor_id: string | null
  session_type_id: string | null
  status: 'scheduled' | 'canceled' | 'completed'
  location: string | null
  instructor: { id: string; name: string } | null
  session_type: { id: string; name: string; duration_minutes: number; color: string } | null
}

type FilterTab = 'all' | 'scheduled' | 'completed' | 'canceled'
type SessionTypeOption = { id: string; name: string; description?: string; duration_minutes?: number; price_cents?: number; deposit_cents?: number; color?: string }
type StudentOption = { id: string; legal_name: string; parent_email?: string | null; emergency_contact_phone?: string | null; driving_hours?: number; classroom_hours?: number }

// NAV_ITEMS removed — layout provides the sidebar

const GLASS_BG = 'var(--glass-bg)'
const GLASS_BORDER = 'var(--glass-border)'
const GLASS_BLUR = 'var(--glass-blur)'
const TEXT_SECONDARY = 'var(--admin-text-secondary)'
const ACCENT_GREEN = 'var(--admin-accent)'
const CARD_SHADOW = 'var(--glass-shadow)'

function borderColor(status: string): string {
  if (status === 'completed') return ACCENT_GREEN
  if (status === 'canceled') return 'var(--accent-secondary)'
  return 'var(--status-blue)'
}

function NewSessionModal({ onClose, onAdd, schoolId, sessionTypeOptions, setSessionTypeOptions }: { onClose: () => void; onAdd: (s: Session) => void; schoolId?: string | null; sessionTypeOptions: {id: string; name: string}[]; setSessionTypeOptions: React.Dispatch<React.SetStateAction<{id: string; name: string}[]>> }) {
  const [form, setForm] = useState({
    session_type_id: '',
    instructor_id: '',
    start_date: '',
    start_time: '',
    max_seats: 2,
    price_cents: 7500,
    location: '',
  })
  const [instructorOptions, setInstructorOptions] = useState<{id: string; name: string}[]>([])

  // Fetch session types and instructors on mount — use page-level sessionTypeOptions; refresh from API once
  useEffect(() => {
    async function fetchOptions() {
      try {
        let sid: string | null = null
        const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
        if (demoCookie) { try { sid = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId } catch {} }
        if (!sid) sid = (window as Window & { __schoolId?: string }).__schoolId ?? null
        if (!sid) return
        const encodedSid = encodeURIComponent(sid)
        const [stRes, instRes] = await Promise.all([
          fetch('/api/session-types?school_id=' + encodedSid),
          fetch('/api/instructors?school_id=' + encodedSid),
        ])
        const stData = await stRes.json()
        const instData = await instRes.json()
        if (Array.isArray(stData)) {
          setSessionTypeOptions(stData)
          if (stData.length > 0 && !form.session_type_id) setForm(f => ({ ...f, session_type_id: stData[0].id }))
        }
        if (Array.isArray(instData)) {
          setInstructorOptions(instData)
          if (instData.length > 0 && !form.instructor_id) setForm(f => ({ ...f, instructor_id: instData[0].id }))
        }
      } catch { /* silently fail */ }
    }
    fetchOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
    const isDemo = !!demoCookie
    const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (!isDemo && schoolId) requestHeaders['x-school-id'] = schoolId
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          start_date: form.start_date,
          end_date: form.start_date,
          session_time: form.start_time,
          instructor_id: form.instructor_id,
          session_type_id: form.session_type_id,
          location: form.location,
          max_seats: form.max_seats,
          price_cents: form.price_cents,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create session'); setLoading(false); return }
      onAdd({
        ...data,
        instructor: instructorOptions.find(i => i.id === form.instructor_id) || null,
        session_type: sessionTypeOptions.find(st => st.id === form.session_type_id) || null,
        status: 'scheduled',
        seats_booked: 0,
      })
      onClose()
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--bg-base), transparent 60%)', border: '1px solid var(--glass-border)', color: 'var(--admin-text)',
    outline: 'none', borderRadius: '12px', width: '100%', padding: '12px 16px', fontSize: '14px',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'color-mix(in srgb, var(--bg-base), transparent 30%)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
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
            background: 'var(--border)', border: '1px solid color-mix(in srgb, var(--text-primary), transparent 90%)',
            color: 'var(--admin-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X className="w-4 h-4" />
        </button>

        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '24px' }}>New Session</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>Session Type</label>
            <select
              value={form.session_type_id}
              onChange={e => setForm(f => ({ ...f, session_type_id: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {sessionTypeOptions.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>Instructor</label>
            <select
              value={form.instructor_id}
              onChange={e => setForm(f => ({ ...f, instructor_id: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {instructorOptions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>Max Seats</label>
              <input
                type="number"
                value={form.max_seats}
                onChange={e => setForm(f => ({ ...f, max_seats: Math.max(1, parseInt(e.target.value) || 1) }))}
                min="1"
                max="10"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>Price ($)</label>
              <input
                type="number"
                value={form.price_cents / 100}
                onChange={e => setForm(f => ({ ...f, price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) }))}
                min="0"
                step="0.01"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. 123 Main St"
              style={inputStyle}
            />
          </div>
          {error && <p style={{ fontSize: '13px', color: 'var(--accent-secondary)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--admin-text)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: 'var(--admin-accent)', border: 'none', borderRadius: '12px', color: 'var(--admin-bg)', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NewSessionTypeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (st: SessionTypeOption) => void }) {
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: 60, price_cents: 7500, deposit_cents: 2500, color: '#4ADE80' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
      let schoolId: string | null = null
      if (demoCookie) { try { schoolId = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId } catch {} }
      const sid = schoolId || (window as Window & { __schoolId?: string }).__schoolId
      if (!sid) { setError('No school ID'); setLoading(false); return }
      const res = await fetch('/api/session-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-school-id': sid },
        body: JSON.stringify({ ...form, school_id: sid }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create session type'); setLoading(false); return }
      onAdd(data)
      onClose()
    } catch { setError('Something went wrong'); setLoading(false) }
  }

  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--admin-text)', outline: 'none', borderRadius: '10px', width: '100%', padding: '10px 14px', fontSize: '14px', boxSizing: 'border-box' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px', background: 'rgba(13,13,18,0.95)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: '600', color: 'var(--admin-text)' }}>New Session Type</h2>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--admin-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '5px' }}>Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 2-Hour Lesson" required style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '5px' }}>Description (optional)</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of what's included" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '5px' }}>Duration (min)</label>
              <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 60 }))} min="15" step="15" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '5px' }}>Price ($)</label>
              <input type="number" value={(form.price_cents / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) }))} min="0" step="0.01" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary)', marginBottom: '5px' }}>Deposit ($)</label>
            <input type="number" value={(form.deposit_cents / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, deposit_cents: Math.round((parseFloat(e.target.value) || 0) * 100) }))} min="0" step="0.01" style={inputStyle} />
          </div>
          {error && <p style={{ fontSize: '12px', color: '#EF4444', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--admin-text)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: 'var(--admin-accent)', border: 'none', borderRadius: '10px', color: 'var(--admin-bg)', fontSize: '13px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>{loading ? 'Creating...' : 'Create Type'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BookStudentModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const [students, setStudents] = useState<StudentOption[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/demo/students')
        if (res.ok) setStudents(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  async function handleBook() {
    if (!selectedStudent) return
    setBooking(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          session_date: session.start_date,
          session_time: '10:00',
          student_name: selectedStudent.legal_name,
          student_email: selectedStudent.parent_email || 'parent@example.com',
          student_phone: selectedStudent.emergency_contact_phone || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Booking failed'); setBooking(false); return }
      setResult(`Booked ${selectedStudent.legal_name} into ${session.session_type?.name || 'session'} on ${session.start_date}!`)
      setBooking(false)
    } catch { setError('Something went wrong'); setBooking(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', background: 'rgba(13,13,18,0.95)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '2px' }}>Book Student</h2>
            <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>{session.session_type?.name} · {session.start_date}</p>
          </div>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--admin-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X className="w-4 h-4" /></button>
        </div>
        {result ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <UserCheck className="w-6 h-6" style={{ color: 'var(--admin-accent)' }} />
            </div>
            <p style={{ color: 'var(--admin-text)', fontWeight: '600', marginBottom: '8px' }}>{result}</p>
            <button onClick={onClose} style={{ padding: '10px 24px', background: 'var(--admin-accent)', border: 'none', borderRadius: '10px', color: 'var(--admin-bg)', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            {loading ? <p style={{ color: 'var(--admin-text-secondary)', fontSize: '13px' }}>Loading students...</p> : students.length === 0 ? <p style={{ color: 'var(--admin-text-secondary)', fontSize: '13px' }}>No students found. Add students first.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                {students.map(s => (
                  <button key={s.id} onClick={() => setSelectedStudent(s)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: selectedStudent?.id === s.id ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedStudent?.id === s.id ? 'var(--admin-accent)' : 'var(--glass-border)'}`, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', color: 'var(--admin-accent)', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.legal_name?.[0]?.toUpperCase()}</div>
                    <div>
                      <p style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{s.legal_name}</p>
                      <p style={{ color: 'var(--admin-text-secondary)', fontSize: '11px' }}>{s.driving_hours || 0}h driving · {s.classroom_hours || 0}h classroom</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {error && <p style={{ fontSize: '12px', color: '#EF4444', margin: '0 0 12px' }}>{error}</p>}
            <button onClick={handleBook} disabled={!selectedStudent || booking} style={{ width: '100%', padding: '12px', background: selectedStudent ? 'var(--admin-accent)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: selectedStudent ? 'var(--admin-bg)' : 'var(--admin-text-secondary)', fontSize: '14px', fontWeight: '700', cursor: selectedStudent && !booking ? 'pointer' : 'not-allowed', opacity: booking ? 0.6 : 1 }}>{booking ? 'Booking...' : selectedStudent ? `Book ${selectedStudent.legal_name}` : 'Select a student'}</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewSession, setShowNewSession] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [showNewSessionType, setShowNewSessionType] = useState(false)
  const [selectedSessionForBooking, setSelectedSessionForBooking] = useState<Session | null>(null)
  const [selectedSessionForRoster, setSelectedSessionForRoster] = useState<Session | null>(null)
  const [sessionTypeOptions, setSessionTypeOptions] = useState<SessionTypeOption[]>([])

  useEffect(() => {
    async function load() {
      const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
      if (demoCookie) {
        try { const res = await fetch('/api/demo/sessions'); if (res.ok) { setSessions((await res.json()).sessions || []); setLoading(false); return } } catch {}
        setSessions([]); setLoading(false); return
      }
      // Use API route instead of direct supabase
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: school } = await supabase.from('schools').select('id').eq('owner_email', user.email).single()
      if (!school) { setLoading(false); return }
      const sid = school.id
      setSchoolId(sid)
      try {
        const res = await fetch('/api/sessions?school_id=' + encodeURIComponent(sid), {
          headers: { 'x-school-id': sid },
        })
        if (res.ok) { setSessions(await res.json()); setLoading(false); return }
      } catch {}
      setSessions([]); setLoading(false)
    }
    load()
  }, [])

  async function handleStatusToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'scheduled' ? 'canceled' : 'scheduled'
    // Use API route for status toggle (works for both demo and production)
    // Optimistic update first
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as Session['status'] } : s))
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (schoolId) headers['x-school-id'] = schoolId
      await fetch('/api/sessions/' + id, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {}
  }

  function handleRosterChange(sessionId: string, next: { seats_booked: number }) {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, seats_booked: next.seats_booked } : s))
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'scheduled', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'canceled', label: 'Cancelled' },
  ]
  const filteredSessions = activeFilter === 'all' ? sessions : sessions.filter(s => s.status === activeFilter)

  return (
    <>





      {/* Main */}
      <div className="admin-main">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '4px', letterSpacing: '-0.01em' }}>Sessions</h1>
            <p style={{ fontSize: '14px', color: TEXT_SECONDARY }}>{sessions.length} total</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowNewSessionType(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--admin-text)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}>
              <Settings className="w-4 h-4" />
              Session Types
            </button>
            <button onClick={() => setShowNewSession(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--admin-accent)', border: 'none', borderRadius: '12px', color: 'var(--admin-bg)', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 0 16px color-mix(in srgb, var(--admin-accent), transparent 70%)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px color-mix(in srgb, var(--admin-accent), transparent 60%)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px color-mix(in srgb, var(--admin-accent), transparent 70%)' }}>
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>
        </div>

        {/* Filter Tabs - glass */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          {filterTabs.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveFilter(key)} style={activeFilter === key ? {
              padding: '8px 16px', background: 'color-mix(in srgb, var(--admin-accent), transparent 85%)', color: 'var(--admin-accent)',
              border: '1px solid var(--admin-accent)', borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            } : {
              padding: '8px 16px', background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
              color: TEXT_SECONDARY, border: `1px solid ${GLASS_BORDER}`, borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Sessions Table */}
        {loading ? (
          <div className='sessions-table-container' style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            <div className='sessions-table-header' style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px 80px', gap: '16px', padding: '12px 24px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
              {['Date', 'Session', 'Details', 'Status', ''].map((_, i) => (<div key={i} style={{ height: '12px', borderRadius: '6px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)' }} />))}
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='sessions-table-row' style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px 80px', gap: '16px', padding: '16px 24px', alignItems: 'center', borderBottom: `1px solid ${GLASS_BORDER}` }}>
                <div><div style={{ height: '11px', width: '30px', borderRadius: '4px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)', marginBottom: '4px' }} /><div style={{ height: '28px', width: '30px', borderRadius: '6px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)', marginBottom: '4px' }} /><div style={{ height: '11px', width: '30px', borderRadius: '4px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)' }} /></div>
                <div><div style={{ height: '14px', width: '70%', borderRadius: '6px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)', marginBottom: '6px' }} /><div style={{ height: '12px', width: '50%', borderRadius: '6px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)' }} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><div style={{ height: '12px', width: '80%', borderRadius: '6px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)' }} /><div style={{ height: '12px', width: '60%', borderRadius: '6px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)' }} /></div>
                <div><div style={{ height: '24px', width: '80px', borderRadius: '999px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)' }} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'color-mix(in srgb, var(--text-primary), transparent 95%)' }} /></div>
              </div>
            ))}
          </div>
        ) : !filteredSessions.length ? (
          <section className="command-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_SECONDARY, opacity: 0.5 }} />
            <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '6px' }}>
              {activeFilter === 'all' ? 'No sessions yet' : `No ${activeFilter} sessions`}
            </p>
            <p style={{ fontSize: '13px', color: TEXT_SECONDARY, marginBottom: '16px' }}>
              {activeFilter === 'all' ? 'Schedule your first driving session' : 'Try a different filter'}
            </p>
            {activeFilter === 'all' && (
              <button
                onClick={() => setShowNewSession(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', background: 'var(--admin-accent)', border: 'none',
                  borderRadius: '999px', color: 'var(--admin-bg)', fontSize: '13px',
                  fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 0 16px color-mix(in srgb, var(--admin-accent), transparent 70%)',
                }}
              >
                <Plus className="w-4 h-4" />
                New Session
              </button>
            )}
          </section>
        ) : (
          <div className='sessions-table-container' style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            <div className='sessions-table-header' style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px 80px', gap: '16px', padding: '12px 24px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
              {['Date', 'Session', 'Details', 'Status', ''].map((h, i) => (<div key={i} style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: TEXT_SECONDARY }}>{h}</div>))}
            </div>
            {filteredSessions.map(session => {
              const date = new Date(session.start_date + 'T12:00:00')
              const leftColor = borderColor(session.status)
              return (
                <div key={session.id} className='sessions-table-row' style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px 80px', gap: '16px', padding: '16px 24px', alignItems: 'center', borderLeft: `3px solid ${leftColor}`, transition: 'background 0.15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--text-primary), transparent 97.5%)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  <div className='sessions-date-col' style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: leftColor }}>{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: '800', color: 'var(--admin-text)', lineHeight: 1.2 }}>{date.getDate()}</div>
                    <div style={{ fontSize: '11px', color: TEXT_SECONDARY }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  </div>
                  <div className='sessions-info-col'>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '2px' }}>{session.session_type?.name || 'Session'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: TEXT_SECONDARY }}>
                      {session.instructor?.name && <span>{session.instructor.name}</span>}
                      {session.location && <><span>·</span><span>{session.location}</span></>}
                    </div>
                  </div>
                  <div className='sessions-details-col' style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: TEXT_SECONDARY }}><Clock className="w-3 h-3" style={{ color: TEXT_SECONDARY }} />{session.session_type?.duration_minutes || 60} min</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: TEXT_SECONDARY }}><Users className="w-3 h-3" style={{ color: TEXT_SECONDARY }} />{session.seats_booked}/{session.max_seats} seats</div>
                  </div>
                  <div className='sessions-status-col'>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', background: session.status === 'scheduled' ? 'color-mix(in srgb, var(--admin-accent), transparent 85%)' : session.status === 'completed' ? 'color-mix(in srgb, var(--status-blue), transparent 85%)' : 'color-mix(in srgb, var(--accent-secondary), transparent 85%)', color: session.status === 'scheduled' ? 'var(--admin-accent)' : session.status === 'completed' ? 'var(--status-blue)' : 'var(--accent-secondary)' }}>{session.status}</span>
                  </div>
                  <div className='sessions-actions-col' style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <button onClick={() => setSelectedSessionForRoster(session)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '7px 10px', borderRadius: '8px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', cursor: 'pointer', color: 'var(--status-blue)', fontSize: '11px', fontWeight: '600', transition: 'background 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.2)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.1)')} title='View session roster'>
                      <ListChecks className="w-3.5 h-3.5" />
                      Roster
                    </button>
                    {session.status === 'scheduled' && (
                      <button onClick={() => setSelectedSessionForBooking(session)} style={{ padding: '7px 10px', borderRadius: '8px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', cursor: 'pointer', color: 'var(--admin-accent)', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: '600', transition: 'background 0.15s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.2)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.1)')} title='Book student into this session'>
                        Book
                      </button>
                    )}
                    <button onClick={() => handleStatusToggle(session.id, session.status)} style={{ padding: '8px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--glass-border)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')} title={session.status === 'scheduled' ? 'Cancel session' : 'Reactivate session'}>
                      {session.status === 'scheduled' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNewSession && (
        <NewSessionModal
          onClose={() => setShowNewSession(false)}
          onAdd={(s) => { setSessions(prev => [s, ...prev]); setShowNewSession(false) }}
          schoolId={schoolId}
          sessionTypeOptions={sessionTypeOptions}
          setSessionTypeOptions={setSessionTypeOptions}
        />
      )}

      {showNewSessionType && (
        <NewSessionTypeModal
          onClose={() => setShowNewSessionType(false)}
          onAdd={(st) => { setSessionTypeOptions(prev => [...prev, st]); setShowNewSessionType(false) }}
        />
      )}

      {selectedSessionForBooking && (
        <BookStudentModal
          session={selectedSessionForBooking}
          onClose={() => setSelectedSessionForBooking(null)}
        />
      )}

      {selectedSessionForRoster && (
        <SessionRosterModal
          session={selectedSessionForRoster}
          onClose={() => setSelectedSessionForRoster(null)}
          onRosterChange={(next) => handleRosterChange(selectedSessionForRoster.id, next)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .sessions-table-header { display: none !important; }
          .sessions-table-row {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            padding: 16px !important;
            border-left: none !important;
            position: relative;
          }
          .sessions-table-row > div { width: 100% !important; }
          .sessions-actions-col {
            position: absolute !important;
            top: 12px !important;
            right: 12px !important;
          }
          .sessions-date-col {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            text-align: left !important;
          }
          .sessions-date-col div:first-child { display: none; }
          .sessions-date-col div:nth-child(3) { display: none; }
          .sessions-date-col div:nth-child(2) {
            font-size: 20px !important;
            line-height: 1 !important;
          }
        }
      `}</style>
    </>
  )
}
