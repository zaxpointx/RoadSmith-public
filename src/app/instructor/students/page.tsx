'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, CheckCircle, Clock, Mail, Phone, RefreshCw, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type StudentStatus = 'pending' | 'active' | 'rejected'

type Student = {
  id: string
  legal_name: string
  parent_email: string | null
  emergency_contact_phone: string | null
  enrollment_date: string | null
  created_at: string
  status?: StudentStatus | string | null
}

type InstructorContext = {
  schoolId: string | null
  instructorId: string | null
  accessToken: string | null
}

const FILTERS: { value: StudentStatus; label: string; icon: typeof Clock }[] = [
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'active', label: 'Active', icon: CheckCircle },
  { value: 'rejected', label: 'Rejected', icon: X },
]

const STATUS_META: Record<StudentStatus, { label: string; color: string; background: string; border: string }> = {
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    background: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.24)',
  },
  active: {
    label: 'Active',
    color: '#4ADE80',
    background: 'rgba(74,222,128,0.12)',
    border: 'rgba(74,222,128,0.24)',
  },
  rejected: {
    label: 'Rejected',
    color: '#EF4444',
    background: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.24)',
  },
}

function parseDemoCookie(): { schoolId: string | null; instructorId: string | null } {
  const cookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
  if (!cookie) return { schoolId: null, instructorId: null }

  try {
    const session = JSON.parse(atob(decodeURIComponent(cookie.split('=')[1])))
    return {
      schoolId: session.schoolId ?? null,
      instructorId: session.instructorId ?? null,
    }
  } catch {
    return { schoolId: null, instructorId: null }
  }
}

function normalizeStatus(status: Student['status']): StudentStatus {
  if (status === 'active' || status === 'rejected') return status
  return 'pending'
}

function getInitials(name: string): string {
  if (!name || name.startsWith('eyJ')) return 'SR'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatDate(date: string | null): string {
  if (!date) return 'Not enrolled'
  const dateValue = date.includes('T') ? new Date(date) : new Date(`${date}T12:00:00`)
  return dateValue.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const meta = STATUS_META[status]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '86px',
      padding: '5px 10px',
      borderRadius: '999px',
      border: `1px solid ${meta.border}`,
      background: meta.background,
      color: meta.color,
      fontSize: '12px',
      fontWeight: 700,
    }}>
      {meta.label}
    </span>
  )
}

function EmptyState({ filter }: { filter: StudentStatus }) {
  const copy = {
    pending: 'No students are waiting for review.',
    active: 'No active students yet.',
    rejected: 'No rejected students.',
  }[filter]

  return (
    <div style={{
      background: 'rgba(15,23,42,0.7)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '64px 24px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
      backdropFilter: 'blur(24px)',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '14px',
        margin: '0 auto 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(74,222,128,0.12)',
        border: '1px solid rgba(74,222,128,0.2)',
      }}>
        <Users className="w-5 h-5" style={{ color: '#4ADE80' }} />
      </div>
      <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '14px', fontWeight: 600 }}>{copy}</p>
    </div>
  )
}

export default function InstructorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [filter, setFilter] = useState<StudentStatus>('pending')
  const [context, setContext] = useState<InstructorContext>({ schoolId: null, instructorId: null, accessToken: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<StudentStatus | null>(null)

  async function resolveContext(): Promise<InstructorContext> {
    const demo = parseDemoCookie()
    const params = new URLSearchParams(window.location.search)
    const urlSchoolId = params.get('school_id')
    const urlInstructorId = params.get('instructor_id')

    let accessToken: string | null = null
    if (!demo.schoolId && !urlSchoolId) {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      accessToken = data.session?.access_token ?? null
    }

    return {
      schoolId: urlSchoolId ?? demo.schoolId,
      instructorId: urlInstructorId ?? demo.instructorId,
      accessToken,
    }
  }

  async function loadStudents() {
    setLoading(true)
    setError('')

    try {
      const nextContext = await resolveContext()
      setContext(nextContext)

      const headers: Record<string, string> = {}
      if (nextContext.schoolId) headers['x-school-id'] = nextContext.schoolId
      if (nextContext.instructorId) headers['x-instructor-id'] = nextContext.instructorId

      const res = await fetch('/api/instructor/students', { headers })
      if (!res.ok) {
        setError(res.status === 401 ? 'Instructor session not found. Please sign in again.' : 'Failed to load students.')
        setStudents([])
        return
      }

      const data = await res.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError('Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => { void loadStudents() })
  }, [])

  const counts = useMemo(() => {
    return students.reduce<Record<StudentStatus, number>>((acc, student) => {
      acc[normalizeStatus(student.status)] += 1
      return acc
    }, { pending: 0, active: 0, rejected: 0 })
  }, [students])

  const filteredStudents = useMemo(
    () => students.filter(student => normalizeStatus(student.status) === filter),
    [students, filter]
  )

  async function updateStudentStatus(studentId: string, status: StudentStatus) {
    setUpdatingIds(prev => new Set(prev).add(studentId))
    setError('')

    const previous = students
    setStudents(current => current.map(student => student.id === studentId ? { ...student, status } : student))

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (context.schoolId) headers['x-school-id'] = context.schoolId
      if (context.instructorId) headers['x-instructor-id'] = context.instructorId
      if (context.accessToken) headers.Authorization = `Bearer ${context.accessToken}`

      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      })

      if (!res.ok) throw new Error('Status update failed')
    } catch (err) {
      console.error(err)
      setStudents(previous)
      setError('Could not update that student. Please try again.')
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(studentId)
        return next
      })
    }
  }

  async function updateAllVisible(status: StudentStatus) {
    if (!filteredStudents.length) return
    setBulkAction(status)
    for (const student of filteredStudents) {
      await updateStudentStatus(student.id, status)
    }
    setBulkAction(null)
  }

  const hasVisiblePending = filteredStudents.some(student => normalizeStatus(student.status) === 'pending')
  const actionDisabled = loading || bulkAction !== null || updatingIds.size > 0 || !filteredStudents.length
  const detailQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (context.instructorId) params.set('instructor_id', context.instructorId)
    if (context.schoolId) params.set('school_id', context.schoolId)
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [context.instructorId, context.schoolId])

  return (
    <div className="min-h-screen" style={{
      background: '#0F172A',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.12) 0%, transparent 52%)',
      color: '#ffffff',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#4ADE80', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Instructor Portal</div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: 800, letterSpacing: '0', margin: 0 }}>Student Management</h1>
          </div>
          <button
            onClick={loadStudents}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.82)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '28px 24px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            padding: '4px',
            gap: '4px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.045)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            {FILTERS.map(item => {
              const Icon = item.icon
              const active = filter === item.value
              return (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    minHeight: '38px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: active ? '#4ADE80' : 'transparent',
                    color: active ? '#0F172A' : 'rgba(255,255,255,0.68)',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  <span style={{
                    minWidth: '24px',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: active ? 'rgba(15,23,42,0.14)' : 'rgba(255,255,255,0.08)',
                    textAlign: 'center',
                  }}>
                    {counts[item.value]}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => updateAllVisible('active')}
              disabled={actionDisabled || !hasVisiblePending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '38px',
                padding: '9px 14px',
                borderRadius: '10px',
                border: 'none',
                background: '#4ADE80',
                color: '#0F172A',
                opacity: actionDisabled || !hasVisiblePending ? 0.45 : 1,
                cursor: actionDisabled || !hasVisiblePending ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 800,
              }}
            >
              <Check className="w-4 h-4" />
              {bulkAction === 'active' ? 'Accepting...' : 'Accept all'}
            </button>
            <button
              onClick={() => updateAllVisible('rejected')}
              disabled={actionDisabled || !hasVisiblePending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '38px',
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(239,68,68,0.28)',
                background: 'rgba(239,68,68,0.12)',
                color: '#FCA5A5',
                opacity: actionDisabled || !hasVisiblePending ? 0.45 : 1,
                cursor: actionDisabled || !hasVisiblePending ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 800,
              }}
            >
              <X className="w-4 h-4" />
              {bulkAction === 'rejected' ? 'Rejecting...' : 'Reject all'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(239,68,68,0.24)',
            background: 'rgba(239,68,68,0.1)',
            color: '#FCA5A5',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(15,23,42,0.68)',
            padding: '48px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.56)',
          }}>
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: '#4ADE80', margin: '0 auto 12px' }} />
            Loading students...
          </div>
        ) : !filteredStudents.length ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="instructor-students-table" style={{
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(15,23,42,0.7)',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
          }}>
            <div className="instructor-students-header" style={{
              display: 'grid',
              gridTemplateColumns: '1.35fr 1.1fr 0.85fr 0.85fr 0.7fr 170px',
              gap: '16px',
              padding: '13px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              {['Name', 'Email', 'Phone', 'Enrollment', 'Status', 'Actions'].map(label => (
                <div key={label} style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
              ))}
            </div>

            {filteredStudents.map(student => {
              const status = normalizeStatus(student.status)
              const pending = status === 'pending'
              const isUpdating = updatingIds.has(student.id)
              const displayName = student.legal_name.startsWith('eyJ') ? 'Student Record' : student.legal_name

              return (
                <div
                  key={student.id}
                  className="instructor-students-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.35fr 1.1fr 0.85fr 0.85fr 0.7fr 170px',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(74,222,128,0.95), rgba(45,212,191,0.85))',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 900,
                    }}>
                      {getInitials(displayName)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Link
                        href={`/instructor/students/${student.id}${detailQuery}`}
                        style={{ color: '#ffffff', fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', textDecoration: 'none' }}
                      >
                        {displayName}
                      </Link>
                      <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '12px', marginTop: '2px' }}>ID {student.id.slice(0, 8)}</div>
                    </div>
                  </div>
                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.68)', fontSize: '13px' }}>
                    <Mail className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.36)', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.parent_email ?? 'No email'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.68)', fontSize: '13px' }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.36)', flexShrink: 0 }} />
                    <span>{student.emergency_contact_phone ?? 'No phone'}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: '13px' }}>{formatDate(student.enrollment_date ?? student.created_at)}</div>
                  <StatusBadge status={status} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => updateStudentStatus(student.id, 'active')}
                      disabled={!pending || isUpdating}
                      title="Accept student"
                      style={{
                        width: '76px',
                        minHeight: '34px',
                        borderRadius: '9px',
                        border: 'none',
                        background: '#4ADE80',
                        color: '#0F172A',
                        opacity: !pending || isUpdating ? 0.45 : 1,
                        cursor: !pending || isUpdating ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 900,
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => updateStudentStatus(student.id, 'rejected')}
                      disabled={!pending || isUpdating}
                      title="Reject student"
                      style={{
                        width: '76px',
                        minHeight: '34px',
                        borderRadius: '9px',
                        border: '1px solid rgba(239,68,68,0.28)',
                        background: 'rgba(239,68,68,0.12)',
                        color: '#FCA5A5',
                        opacity: !pending || isUpdating ? 0.45 : 1,
                        cursor: !pending || isUpdating ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 900,
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 920px) {
          .instructor-students-header { display: none !important; }
          .instructor-students-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .instructor-students-row > div {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
