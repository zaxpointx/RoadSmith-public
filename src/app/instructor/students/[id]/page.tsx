'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, CalendarClock, Check, Clock, FileText, Loader2, Mail, User, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

type StudentStatus = 'pending' | 'active' | 'completed' | 'rejected'

type InstructorContext = {
  schoolId: string | null
  instructorId: string | null
  accessToken: string | null
}

type StudentDetail = {
  id: string
  full_name?: string | null
  legal_name?: string | null
  permit_number?: string | null
  dob?: string | null
  date_of_birth?: string | null
  parent_email?: string | null
  driving_hours?: number | null
  classroom_hours?: number | null
  enrollment_date?: string | null
  created_at?: string | null
  enrollment_status?: string | null
  status?: string | null
  primary_instructor_id?: string | null
  instructor_id?: string | null
}

type RosterStudent = {
  id: string
  legal_name?: string | null
  status?: string | null
}

type InstructorSession = {
  id: string
  session_date?: string | null
  session_time?: string | null
  status?: string | null
  student_name?: string | null
  student_email?: string | null
  location?: string | null
  session_type?: {
    name?: string | null
    duration_minutes?: number | null
  } | null
}

const HOURS_GOAL = 50

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

function normalizeStatus(status: string | null | undefined): StudentStatus {
  if (status === 'active' || status === 'completed' || status === 'rejected') return status
  return 'pending'
}

function statusLabel(status: StudentStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusClass(status: StudentStatus): string {
  if (status === 'active') return styles.statusActive
  if (status === 'completed') return styles.statusCompleted
  if (status === 'rejected') return styles.statusRejected
  return styles.statusPending
}

function formatDate(date: string | null | undefined): string {
  if (!date) return 'Not provided'
  const dateValue = date.includes('T') ? new Date(date) : new Date(`${date}T12:00:00`)
  if (Number.isNaN(dateValue.getTime())) return 'Not provided'
  return dateValue.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  const [hour = '0', minute = '0'] = time.split(':')
  const date = new Date()
  date.setHours(Number(hour), Number(minute), 0, 0)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function calculateAge(dob: string | null | undefined): string {
  if (!dob) return 'Not provided'
  const birthDate = new Date(`${dob}T12:00:00`)
  if (Number.isNaN(birthDate.getTime())) return 'Not provided'

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1
  return `${age}`
}

function safeValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Not provided'
  return String(value)
}

function normalizedText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function buildHeaders(context: InstructorContext, json = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (context.schoolId) headers['x-school-id'] = context.schoolId
  if (context.instructorId) headers['x-instructor-id'] = context.instructorId
  if (context.accessToken) headers.Authorization = `Bearer ${context.accessToken}`
  return headers
}

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

export default function InstructorStudentDetailPage() {
  const params = useParams<{ id: string }>()
  const studentId = Array.isArray(params.id) ? params.id[0] : params.id
  const [context, setContext] = useState<InstructorContext>({ schoolId: null, instructorId: null, accessToken: null })
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<StudentStatus | null>(null)
  const [hoursForm, setHoursForm] = useState('2')
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [savingHours, setSavingHours] = useState(false)

  const displayName = student?.full_name || student?.legal_name || 'Student Record'
  const status = normalizeStatus(student?.enrollment_status ?? student?.status)
  const loggedHours = Number(student?.driving_hours ?? 0)
  const progressValue = Math.min(Math.max(loggedHours, 0), HOURS_GOAL)
  const detailQuery = useMemo(() => {
    const next = new URLSearchParams()
    if (context.instructorId) next.set('instructor_id', context.instructorId)
    if (context.schoolId) next.set('school_id', context.schoolId)
    const query = next.toString()
    return query ? `?${query}` : ''
  }, [context.instructorId, context.schoolId])

  async function loadStudent() {
    setLoading(true)
    setError('')

    try {
      const nextContext = await resolveContext()
      setContext(nextContext)
      const headers = buildHeaders(nextContext)

      const rosterRes = await fetch('/api/instructor/students', { headers })
      if (!rosterRes.ok) {
        setError(rosterRes.status === 401 ? 'Instructor session not found. Please sign in again.' : 'Failed to verify instructor roster.')
        return
      }

      const roster = await rosterRes.json() as RosterStudent[]
      const rosterStudent = Array.isArray(roster) ? roster.find(item => item.id === studentId) : null
      if (!rosterStudent) {
        setError('This student is not assigned to the current instructor.')
        return
      }

      const studentRes = await fetch(`/api/students/${studentId}`, { headers })
      if (!studentRes.ok) {
        setError(studentRes.status === 404 ? 'Student not found.' : 'Failed to load student detail.')
        return
      }

      const nextStudent = await studentRes.json() as StudentDetail
      setStudent({
        ...nextStudent,
        status: nextStudent.status ?? rosterStudent.status ?? 'pending',
        enrollment_status: nextStudent.enrollment_status ?? nextStudent.status ?? rosterStudent.status ?? 'pending',
      })

      if (nextContext.instructorId) {
        const scheduleRes = await fetch('/api/instructor/schedule', { headers })
        if (scheduleRes.ok) {
          const schedule = await scheduleRes.json()
          const upcoming = Array.isArray(schedule.upcoming) ? schedule.upcoming as InstructorSession[] : []
          const studentName = normalizedText(nextStudent.full_name || nextStudent.legal_name || rosterStudent.legal_name)
          const parentEmail = normalizedText(nextStudent.parent_email)
          setSessions(upcoming.filter(session => {
            const bookingName = normalizedText(session.student_name)
            const bookingEmail = normalizedText(session.student_email)
            return (!!studentName && bookingName === studentName) || (!!parentEmail && bookingEmail === parentEmail)
          }))
        }
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load student detail.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) queueMicrotask(() => { void loadStudent() })
  }, [studentId])

  async function updateStudentStatus(nextStatus: StudentStatus) {
    if (!student) return
    setUpdating(nextStatus)
    setError('')

    const previous = student
    setStudent({ ...student, status: nextStatus, enrollment_status: nextStatus })

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: buildHeaders(context, true),
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) throw new Error('Status update failed')
    } catch (err) {
      console.error(err)
      setStudent(previous)
      setError('Could not update that student. Please try again.')
    } finally {
      setUpdating(null)
    }
  }

  async function logHours() {
    if (!student || !context.schoolId) return
    const hoursToAdd = Number.parseFloat(hoursForm)
    if (!Number.isFinite(hoursToAdd) || hoursToAdd <= 0) return

    setSavingHours(true)
    setError('')

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: buildHeaders(context, true),
        body: JSON.stringify({ driving_hours_to_add: hoursToAdd }),
      })

      if (!res.ok) throw new Error('Hours update failed')

      const refreshed = await fetch(`/api/students/${student.id}`, { headers: buildHeaders(context) })
      if (refreshed.ok) setStudent(await refreshed.json() as StudentDetail)
      setShowHoursModal(false)
      setHoursForm('2')
    } catch (err) {
      console.error(err)
      setError('Could not log hours. Please try again.')
    } finally {
      setSavingHours(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={`${styles.shell} ${styles.main}`}>
          <div className={styles.stateCard}>
            <Loader2 className={`${styles.accentIcon} ${styles.spinner} mx-auto mb-3 h-5 w-5`} />
            Loading student detail...
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={`${styles.shell} ${styles.topbarInner}`}>
          <Link href={`/instructor/students${detailQuery}`} className={styles.backLink}>
            <ArrowLeft className="h-4 w-4" />
            Students
          </Link>

          <div>
            <p className={styles.eyebrow}>Instructor Portal</p>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{displayName}</h1>
              {student && <span className={`${styles.statusBadge} ${statusClass(status)}`}>{statusLabel(status)}</span>}
            </div>
            <p className={styles.subtitle}>Student detail and training progress</p>
          </div>
        </div>
      </header>

      <main className={`${styles.shell} ${styles.main}`}>
        {error && (
          <div className={styles.alert}>
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!student ? (
          <div className={styles.stateCard}>No student record available.</div>
        ) : (
          <div className={styles.grid}>
            <div className={styles.sectionStack}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <User className={`${styles.accentIcon} h-4 w-4`} />
                    Student Record
                  </h2>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <span className={styles.label}>Full name</span>
                    <span className={styles.value}>{safeValue(student.full_name || student.legal_name)}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Legal name</span>
                    <span className={styles.value}>{safeValue(student.legal_name)}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Permit number</span>
                    <span className={styles.value}>{safeValue(student.permit_number)}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Enrollment date</span>
                    <span className={styles.value}>{formatDate(student.enrollment_date ?? student.created_at)}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Enrollment status</span>
                    <span className={styles.value}>{statusLabel(status)}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Age</span>
                    <span className={styles.value}>{calculateAge(student.dob ?? student.date_of_birth)}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Parent email</span>
                    <span className={styles.value}>{safeValue(student.parent_email)}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Primary instructor ID</span>
                    <span className={styles.value}>{safeValue(student.primary_instructor_id ?? student.instructor_id)}</span>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <CalendarClock className={`${styles.accentIcon} h-4 w-4`} />
                    Pending Sessions
                  </h2>
                </div>

                {sessions.length === 0 ? (
                  <p className={styles.muted}>No upcoming bookings found for this student.</p>
                ) : (
                  <div className={styles.sessionList}>
                    {sessions.map(session => (
                      <div key={session.id} className={styles.sessionRow}>
                        <div>
                          <div className={styles.sessionName}>{session.session_type?.name ?? 'Driving Session'}</div>
                          <div className={styles.sessionMeta}>
                            {formatDate(session.session_date)}
                            {session.session_time ? ` at ${formatTime(session.session_time)}` : ''}
                            {session.location ? ` • ${session.location}` : ''}
                          </div>
                        </div>
                        <span className={styles.sessionStatus}>{session.status ?? 'confirmed'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className={styles.sectionStack}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <Clock className={`${styles.accentIcon} h-4 w-4`} />
                    Hours Progress
                  </h2>
                </div>

                <div className={styles.progressStats}>
                  <span className={styles.hours}>{loggedHours}h</span>
                  <span className={styles.goal}>Target {HOURS_GOAL}h</span>
                </div>
                <progress className={styles.progress} value={progressValue} max={HOURS_GOAL}>
                  {progressValue} of {HOURS_GOAL}
                </progress>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <FileText className={`${styles.accentIcon} h-4 w-4`} />
                    Actions
                  </h2>
                </div>

                <div className={styles.actions}>
                  {status === 'pending' && (
                    <>
                      <button
                        className={styles.button}
                        onClick={() => updateStudentStatus('active')}
                        disabled={updating !== null}
                      >
                        <Check className="h-4 w-4" />
                        {updating === 'active' ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        className={styles.dangerButton}
                        onClick={() => updateStudentStatus('rejected')}
                        disabled={updating !== null}
                      >
                        <X className="h-4 w-4" />
                        {updating === 'rejected' ? 'Rejecting...' : 'Reject'}
                      </button>
                    </>
                  )}
                  <button className={styles.ghostButton} onClick={() => setShowHoursModal(true)}>
                    <Clock className="h-4 w-4" />
                    Log Hours
                  </button>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <Mail className={`${styles.accentIcon} h-4 w-4`} />
                    Contact
                  </h2>
                </div>
                <p className={styles.value}>{safeValue(student.parent_email)}</p>
              </section>
            </aside>
          </div>
        )}
      </main>

      {showHoursModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Log Driving Hours</h2>
            <p className={styles.muted}>Recording hours for {displayName}</p>

            <label className={`${styles.label} mt-5`} htmlFor="hours-to-add">Hours to add</label>
            <input
              id="hours-to-add"
              className={styles.input}
              type="number"
              min="0.5"
              max="8"
              step="0.5"
              value={hoursForm}
              onChange={event => setHoursForm(event.target.value)}
            />

            <div className={styles.modalActions}>
              <button className={styles.ghostButton} onClick={() => setShowHoursModal(false)} disabled={savingHours}>
                Cancel
              </button>
              <button className={styles.button} onClick={logHours} disabled={savingHours}>
                {savingHours ? 'Saving...' : 'Save Hours'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
