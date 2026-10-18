'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp, CheckCircle, Phone, Mail, FileText, User } from 'lucide-react'

type Booking = {
  id: string
  session_date: string
  session_time: string
  status: string
  student_name: string
  student_email: string
  session_type: { name: string; duration_minutes: number; color: string | null } | null
  location: string | null
  notes: string | null
  student_phone: string | null
}

type ScheduleData = {
  instructor_id: string
  instructor_name: string
  school_id: string
  upcoming: Booking[]
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  const date = new Date(dateStr)
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function isThisWeek(dateStr: string): boolean {
  const today = new Date()
  const date = new Date(dateStr)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 7)
  return date >= today && date <= endOfWeek
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

function StatusPill({ status }: { status: string }) {
  const base = 'status-pill'
  if (status === 'completed') return <span className={`${base} status-active`}><span className="status-dot" style={{ background: '#4ADE80' }} />Completed</span>
  if (status === 'confirmed') return <span className={`${base} status-pending`}><span className="status-dot" style={{ background: '#F97316' }} />Confirmed</span>
  return <span className={`${base}`} style={{ background: 'rgba(107,114,128,0.15)', color: '#9CA3AF' }}><span className="status-dot" style={{ background: '#9CA3AF' }} />{status}</span>
}

function SessionCard({ booking, onComplete }: { booking: Booking; onComplete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function handleComplete() {
    setCompleting(true)
    try {
      const res = await fetch(`/api/instructor/bookings/${booking.id}`, { method: 'PATCH' })
      if (res.ok) {
        onComplete(booking.id)
      }
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="session-card">
      <button
        className="session-card-header"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className="session-card-left">
          <div className="session-card-avatar">
            <User className="session-card-avatar-icon" />
          </div>
          <div className="session-card-info">
            <span className="session-card-name">{booking.student_name}</span>
            <span className="session-card-meta">
              <Clock className="session-card-icon" />
              {formatTime(booking.session_time)}
              {booking.session_type && (
                <>
                  <span className="session-card-dot">·</span>
                  {booking.session_type.name}
                </>
              )}
            </span>
          </div>
        </div>
        <div className="session-card-right">
          <StatusPill status={booking.status} />
          {expanded ? (
            <ChevronUp className="session-card-chevron" />
          ) : (
            <ChevronDown className="session-card-chevron" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="session-card-details">
          <div className="session-card-detail-grid">
            <div className="session-card-detail-item">
              <MapPin className="session-card-detail-icon" />
              <div>
                <span className="session-card-detail-label">Location</span>
                <span className="session-card-detail-value">{booking.location || 'Not specified'}</span>
              </div>
            </div>
            <div className="session-card-detail-item">
              <Calendar className="session-card-detail-icon" />
              <div>
                <span className="session-card-detail-label">Date</span>
                <span className="session-card-detail-value">{formatDate(booking.session_date)}</span>
              </div>
            </div>
            {booking.student_email && (
              <div className="session-card-detail-item">
                <Mail className="session-card-detail-icon" />
                <div>
                  <span className="session-card-detail-label">Student Email</span>
                  <span className="session-card-detail-value">{booking.student_email}</span>
                </div>
              </div>
            )}
            {booking.student_phone && (
              <div className="session-card-detail-item">
                <Phone className="session-card-detail-icon" />
                <div>
                  <span className="session-card-detail-label">Phone</span>
                  <span className="session-card-detail-value">{booking.student_phone}</span>
                </div>
              </div>
            )}
            <div className="session-card-detail-item">
              <FileText className="session-card-detail-icon" />
              <div>
                <span className="session-card-detail-label">Permit / Notes</span>
                <span className="session-card-detail-value">{booking.notes || 'No notes on file'}</span>
              </div>
            </div>
          </div>

          {booking.status !== 'completed' && (
            <button
              className="session-complete-button"
              onClick={handleComplete}
              disabled={completing}
            >
              <CheckCircle className="session-complete-button-icon" />
              {completing ? 'Marking complete...' : 'Mark complete'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function InstructorSessionsPage() {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/instructor/schedule')
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setError(json.error ?? 'Failed to load sessions')
          setLoading(false)
          return
        }
        const json: ScheduleData = await res.json()
        setData(json)
      } catch {
        setError('Failed to connect. Please try again.')
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleComplete(bookingId: string) {
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        upcoming: prev.upcoming.map(b =>
          b.id === bookingId ? { ...b, status: 'completed' } : b
        ),
      }
    })
  }

  if (loading) {
    return (
      <div className="instructor-sessions-page">
        <div className="instructor-sessions-loading">
          <p>Loading your sessions...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="instructor-sessions-page">
        <div className="instructor-sessions-error">
          <p>{error || 'No data available'}</p>
        </div>
      </div>
    )
  }

  const todaySessions = data.upcoming.filter(b => isToday(b.session_date))
  const weekSessions = data.upcoming.filter(b => !isToday(b.session_date) && isThisWeek(b.session_date))
  const upcomingSessions = data.upcoming.filter(b => !isToday(b.session_date) && !isThisWeek(b.session_date))

  return (
    <div className="instructor-sessions-page">
      <header className="instructor-sessions-header">
        <div>
          <p className="instructor-sessions-eyebrow">Session Roster</p>
          <h1 className="instructor-sessions-title">{data.instructor_name}</h1>
        </div>
        <div className="instructor-sessions-count">
          <span className="instructor-sessions-count-number">{data.upcoming.length}</span>
          <span className="instructor-sessions-count-label">upcoming</span>
        </div>
      </header>

      {todaySessions.length > 0 && (
        <section className="instructor-sessions-section">
          <div className="instructor-sessions-section-head">
            <h2 className="instructor-sessions-section-title">Today</h2>
            <span className="instructor-sessions-section-badge">{todaySessions.length}</span>
          </div>
          <div className="instructor-sessions-list">
            {todaySessions.map(b => (
              <SessionCard key={b.id} booking={b} onComplete={handleComplete} />
            ))}
          </div>
        </section>
      )}

      {weekSessions.length > 0 && (
        <section className="instructor-sessions-section">
          <div className="instructor-sessions-section-head">
            <h2 className="instructor-sessions-section-title">This Week</h2>
            <span className="instructor-sessions-section-badge">{weekSessions.length}</span>
          </div>
          <div className="instructor-sessions-list">
            {weekSessions.map(b => (
              <SessionCard key={b.id} booking={b} onComplete={handleComplete} />
            ))}
          </div>
        </section>
      )}

      {upcomingSessions.length > 0 && (
        <section className="instructor-sessions-section">
          <div className="instructor-sessions-section-head">
            <h2 className="instructor-sessions-section-title">Upcoming</h2>
            <span className="instructor-sessions-section-badge">{upcomingSessions.length}</span>
          </div>
          <div className="instructor-sessions-list">
            {upcomingSessions.map(b => (
              <SessionCard key={b.id} booking={b} onComplete={handleComplete} />
            ))}
          </div>
        </section>
      )}

      {data.upcoming.length === 0 && (
        <div className="instructor-sessions-empty">
          <Calendar className="instructor-sessions-empty-icon" />
          <p>No upcoming sessions found.</p>
        </div>
      )}
    </div>
  )
}
