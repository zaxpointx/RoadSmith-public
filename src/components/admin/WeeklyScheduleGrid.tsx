'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import SessionBlock, { CalendarSession } from './SessionBlock'

type Instructor = {
  id: string
  name: string
}

type WeeklyScheduleGridProps = {
  weekStart: string
  instructors: Instructor[]
  sessions: CalendarSession[]
  onPreviousWeek: () => void
  onNextWeek: () => void
  onComplete?: (session: CalendarSession) => void
}

function getWeekDays(weekStart: string) {
  const start = new Date(`${weekStart}T12:00:00`)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function WeeklyScheduleGrid({
  weekStart,
  instructors,
  sessions,
  onPreviousWeek,
  onNextWeek,
  onComplete,
}: WeeklyScheduleGridProps) {
  const days = getWeekDays(weekStart)
  const instructorRows = instructors.length ? instructors : [{ id: 'unassigned', name: 'Unassigned' }]
  const todayIso = isoDate(new Date())

  return (
    <section className="command-card schedule-card">
      <div className="schedule-toolbar">
        <div>
          <p className="command-eyebrow">Schedule board</p>
          <h2>{days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h2>
        </div>
        <div className="schedule-actions">
          <button className="command-icon-button" type="button" onClick={onPreviousWeek} aria-label="Previous week">
            <ChevronLeft className="command-icon" />
          </button>
          <button className="command-icon-button" type="button" onClick={onNextWeek} aria-label="Next week">
            <ChevronRight className="command-icon" />
          </button>
        </div>
      </div>

      <div className="weekly-grid">
        <div className="weekly-grid-corner">Instructor</div>
        {days.map((day) => {
          const isToday = isoDate(day) === todayIso
          return (
            <div
              className={`weekly-grid-day${isToday ? ' today' : ''}`}
              key={day.toISOString()}
            >
              <span>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <b>{day.getDate()}</b>
            </div>
          )
        })}
        {instructorRows.map((instructor) => (
          <div className="weekly-grid-row" key={instructor.id}>
            <div className="weekly-grid-instructor">{instructor.name}</div>
            {days.map((day) => {
              const dayKey = isoDate(day)
              const daySessions = sessions.filter((session) => {
                const sessionDay = String(session.start_date).slice(0, 10)
                const instructorId = session.instructor?.id ?? 'unassigned'
                return sessionDay === dayKey && instructorId === instructor.id
              })
              return (
                <div className="weekly-grid-cell" key={`${instructor.id}-${dayKey}`}>
                  {daySessions.length ? (
                    daySessions.map((session) => (
                      <SessionBlock key={session.id} session={session} onComplete={onComplete} />
                    ))
                  ) : (
                    <span className="weekly-grid-empty">Open</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
