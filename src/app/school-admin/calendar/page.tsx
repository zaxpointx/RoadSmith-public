'use client'

import { useCallback, useEffect, useState } from 'react'
import WeeklyScheduleGrid from '@/components/admin/WeeklyScheduleGrid'
import { CalendarSession } from '@/components/admin/SessionBlock'

type Instructor = {
  id: string
  name: string
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setDate(next.getDate() - next.getDay())
  return next.toISOString().slice(0, 10)
}

function shiftWeek(weekStart: string, amount: number) {
  const date = new Date(`${weekStart}T12:00:00`)
  date.setDate(date.getDate() + amount * 7)
  return date.toISOString().slice(0, 10)
}

export default function SchoolAdminCalendarPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
  const [sessions, setSessions] = useState<CalendarSession[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (start = weekStart) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/school-admin/calendar?start=${encodeURIComponent(start)}`)
      if (!res.ok) throw new Error('Calendar failed')
      const data = await res.json()
      setSessions(data.sessions ?? [])
      setInstructors(data.instructors ?? [])
      setWeekStart(data.weekStart ?? start)
    } catch {
      setError('Could not load the schedule board.')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    queueMicrotask(() => { void load(weekStart) })
  }, [load, weekStart])

  async function completeSession(session: CalendarSession) {
    const res = await fetch(`/api/school-admin/sessions/${session.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_status: 'completed' }),
    })
    if (res.ok) load(weekStart)
  }

  return (
    <div className="command-page">
      <header className="command-page-head">
        <div>
          <p className="command-eyebrow">Calendar</p>
          <h1 className="command-page-title">Weekly schedule</h1>
          <p className="command-page-subtitle">Instructor lanes, session capacity, and completion logging for the operating week.</p>
        </div>
      </header>

      {error && <section className="command-card"><p className="readiness-chip readiness-blocked">{error}</p></section>}
      {loading ? (
        <section className="command-card"><p className="command-muted">Loading schedule...</p></section>
      ) : (
        <WeeklyScheduleGrid
          weekStart={weekStart}
          instructors={instructors}
          sessions={sessions}
          onPreviousWeek={() => {
            const next = shiftWeek(weekStart, -1)
            setWeekStart(next)
            load(next)
          }}
          onNextWeek={() => {
            const next = shiftWeek(weekStart, 1)
            setWeekStart(next)
            load(next)
          }}
          onComplete={completeSession}
        />
      )}
    </div>
  )
}
