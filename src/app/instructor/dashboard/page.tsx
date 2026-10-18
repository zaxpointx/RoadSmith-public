'use client'

import { useState, useEffect } from 'react'
import { Clock, Users, CheckCircle, AlertCircle, RefreshCw, Mail } from 'lucide-react'

type Student = {
  id: string
  legal_name: string
  dob: string | null
  parent_email: string | null
  driving_hours: number
  classroom_hours: number
  certificate_issued_at: string | null
  enrollment_date: string | null
  created_at: string
  instructor_id: string | null
}

type Session = {
  id: string
  start_date?: string
  session_date?: string
  session_time?: string
  student_name?: string
  session_type: { name: string } | null
  instructor: { name: string } | null
  status: string
}

const HOURS_GOAL = 50

function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min((current / goal) * 100, 100)
  const isComplete = current >= goal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: isComplete ? '#4ADE80' : '#ffffff' }}>
          {current}h
        </span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>/ {goal}h</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: isComplete ? 'linear-gradient(90deg, #4ADE80, #22C55E)' : 'linear-gradient(90deg, rgba(74,222,128,0.6), #4ADE80)',
          borderRadius: '999px',
          transition: 'width 0.4s ease',
        }} />
      </div>
      {isComplete && (
        <span style={{ fontSize: '11px', color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle className="w-3 h-3" /> Certified eligible
        </span>
      )}
    </div>
  )
}

function getInitials(name: string): string {
  if (!name || name.startsWith('eyJ')) return '??'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function avatarColor(name: string): string {
  const colors = ['#4ADE80', '#22C55E', '#2dd4bf', '#38bdf8', '#a78bfa', '#F59E0B']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function readJsonArray<T>(res: Response): Promise<T[]> {
  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

export default function InstructorDashboardPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [completingSession, setCompletingSession] = useState<string | null>(null)
  const [hoursForm, setHoursForm] = useState<{ studentId: string; studentName: string; hours: string } | null>(null)
  const [savingHours, setSavingHours] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // Resolve school + instructor from middleware headers or demo cookie
        let sid: string | null = null
        let iid: string | null = null

        const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
        if (demoCookie) {
          try {
            const session = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1])))
            sid = session.schoolId
            iid = session.instructorId ?? null
          } catch {}
        }

        // Try to read from URL params (instructor magic link flow)
        // URL params take priority over cookie for instructor scoping
        const params = new URLSearchParams(window.location.search)
        const urlSid = params.get('school_id')
        const urlIid = params.get('instructor_id')
        if (urlSid) sid = urlSid
        if (urlIid) iid = urlIid

        if (!sid) {
          setError('Could not identify school. Please access via the magic link you received.')
          setLoading(false)
          return
        }

        setSchoolId(sid)
        setInstructorId(iid)

        // Fetch the instructor's assigned students via the scoped endpoint
        // (middleware sets x-instructor-id header in demo mode)
        const studentsRes = await fetch('/api/instructor/students', {
          headers: {
            'x-instructor-id': iid ?? '',
            'x-school-id': sid ?? '',
          },
        })
        if (studentsRes.ok) {
          const studentsData = await readJsonArray<Student>(studentsRes)
          setStudents(studentsData)
        } else if (studentsRes.status === 401) {
          setError('Instructor session not found. Please access via the magic link you received.')
          setLoading(false)
          return
        }

        // Fetch upcoming/recent sessions for this instructor
        if (iid) {
          const sessionsRes = await fetch('/api/instructor/schedule', {
            headers: {
              'x-instructor-id': iid,
              'x-school-id': sid,
            },
          })
          if (sessionsRes.ok) {
            const sessionsData = await sessionsRes.json()
            setSessions((sessionsData.upcoming ?? []).slice(0, 5))
          }
        } else {
          // Show all school sessions if no instructor ID
          const sessionsRes = await fetch(`/api/sessions?school_id=${encodeURIComponent(sid)}`)
          if (sessionsRes.ok) {
            const allSessions = await sessionsRes.json()
            setSessions((Array.isArray(allSessions) ? allSessions : []).slice(0, 5))
          }
        }
      } catch (err) {
        setError('Failed to load dashboard data.')
        console.error(err)
      }
      setLoading(false)
    }

    load()
  }, [])

  async function handleLogHours(studentId: string, studentName: string, hoursToAdd: number) {
    if (hoursToAdd <= 0) return
    setSavingHours(true)

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-school-id': schoolId! },
        body: JSON.stringify({ driving_hours_to_add: hoursToAdd }),
      })

      if (!res.ok) throw new Error('Failed to update hours')

      // Refresh students (use instructor-scoped endpoint)
      const studentsRes = await fetch('/api/instructor/students', {
        headers: {
          'x-instructor-id': instructorId ?? '',
          'x-school-id': schoolId ?? '',
        },
      })
      if (studentsRes.ok) setStudents(await readJsonArray<Student>(studentsRes))
      setHoursForm(null)
    } catch (err) {
      console.error(err)
    }

    setSavingHours(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base, #090a05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#4ADE80' }} />
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-base, #090a05)' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '20px' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '12px' }}>Access Issue</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>{error}</p>
        </div>
      </div>
    )
  }

  const pendingStudents = students.filter(s => !s.certificate_issued_at && s.driving_hours === 0)
  const inProgressStudents = students.filter(s => !s.certificate_issued_at && s.driving_hours > 0)
  const certifiedStudents = students.filter(s => !!s.certificate_issued_at)

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-base, #090a05)', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.05) 0%, transparent 55%)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ADE80', marginBottom: '4px' }}>Instructor Dashboard</div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', fontWeight: '700', color: '#ffffff' }}>Your Students</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              <Users className="w-4 h-4" />
              <span>{students.length} total</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          <div style={{ background: 'rgba(17,17,17,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500' }}>Pending Activation</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#F59E0B' }}>{pendingStudents.length}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>New enrollments</div>
          </div>
          <div style={{ background: 'rgba(17,17,17,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500' }}>In Training</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffffff' }}>{inProgressStudents.length}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Logging hours</div>
          </div>
          <div style={{ background: 'rgba(17,17,17,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500' }}>Certified</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#4ADE80' }}>{certifiedStudents.length}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>50h completed</div>
          </div>
        </div>

        {sessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock className="w-4 h-4" style={{ color: '#4ADE80' }} />
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>Recent Sessions</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sessions.map(session => {
                const dateValue = session.session_date ?? session.start_date ?? null
                return (
                  <div key={session.id} style={{ background: 'rgba(17,17,17,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>{session.session_type?.name ?? 'Driving Session'}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>{session.student_name ? `${session.student_name} • ` : ''}{dateValue ? formatDate(dateValue) : 'Scheduled'}{session.session_time ? ` at ${session.session_time.slice(0, 5)}` : ''}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#4ADE80', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{session.status}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* In Training Students — this is the main value section */}
        {inProgressStudents.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock className="w-4 h-4" style={{ color: '#4ADE80' }} />
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>Students Logging Hours</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inProgressStudents.map(student => {
                const needsHours = student.driving_hours < HOURS_GOAL
                return (
                  <div
                    key={student.id}
                    style={{ background: 'rgba(17,17,17,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: `linear-gradient(135deg, ${avatarColor(student.legal_name)}, ${avatarColor(student.legal_name)}88)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '700', color: '#ffffff',
                        }}>
                          {getInitials(student.legal_name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff' }}>{student.legal_name}</div>
                          {student.parent_email && (
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Mail className="w-3 h-3" /> {student.parent_email}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Log hours button */}
                      <button
                        onClick={() => setHoursForm({ studentId: student.id, studentName: student.legal_name, hours: '2' })}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '10px', color: '#4ADE80', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.2)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.12)' }}
                      >
                        <Clock className="w-3.5 h-3.5" /> Log Hours
                      </button>
                    </div>

                    <ProgressBar current={student.driving_hours} goal={HOURS_GOAL} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pending students */}
        {pendingStudents.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>Pending Review</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingStudents.map(student => (
                <div
                  key={student.id}
                  style={{ background: 'rgba(17,17,17,0.7)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '16px', padding: '20px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '700', color: '#ffffff',
                      }}>
                        {getInitials(student.legal_name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff' }}>{student.legal_name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          Enrolled {formatDate(student.enrollment_date || student.created_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle className="w-3.5 h-3.5" /> Awaiting hours
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certified */}
        {certifiedStudents.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CheckCircle className="w-4 h-4" style={{ color: '#4ADE80' }} />
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>50-Hour Certified</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {certifiedStudents.map(student => (
                <div
                  key={student.id}
                  style={{ background: 'rgba(17,17,17,0.7)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '16px', padding: '20px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckCircle className="w-5 h-5" style={{ color: '#ffffff' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff' }}>{student.legal_name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          Certified {formatDate(student.certificate_issued_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4ADE80', fontWeight: '600' }}>
                      {student.driving_hours}h logged
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {students.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', marginBottom: '20px' }}>
              <Users className="w-6 h-6" style={{ color: '#4ADE80' }} />
            </div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>No students yet</h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '300px', margin: '0 auto' }}>
              Your enrolled students will appear here once the school owner adds them to your roster.
            </p>
          </div>
        )}
      </div>

      {/* Hours logging modal */}
      {hoursForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '400px', background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>Log Driving Hours</h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>Recording hours for {hoursForm.studentName}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Hours to Add</label>
                <input
                  type="number"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={hoursForm.hours}
                  onChange={e => setHoursForm({ ...hoursForm, hours: e.target.value })}
                  style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#ffffff', fontSize: '18px', fontWeight: '600', outline: 'none', textAlign: 'center' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setHoursForm(null)}
                  style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleLogHours(hoursForm.studentId, hoursForm.studentName, parseFloat(hoursForm.hours))}
                  disabled={savingHours}
                  style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #4ADE80, #22C55E)', border: 'none', borderRadius: '12px', color: '#ffffff', fontSize: '14px', fontWeight: '700', cursor: savingHours ? 'not-allowed' : 'pointer', opacity: savingHours ? 0.6 : 1 }}
                >
                  {savingHours ? 'Saving...' : 'Save Hours'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
