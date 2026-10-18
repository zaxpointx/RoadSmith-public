import { CheckCircle2, Clock, MapPin, Users } from 'lucide-react'

export type CalendarSession = {
  id: string
  start_date: string
  start_time?: string | null
  end_date?: string | null
  status?: string | null
  location?: string | null
  max_seats?: number | null
  seats_booked?: number | null
  instructor?: { id?: string; name?: string | null } | null
  session_type?: { id?: string; name?: string | null; duration_minutes?: number | null; color?: string | null } | null
}

function formatTime(session: CalendarSession) {
  if (session.start_time) return session.start_time.slice(0, 5)
  const date = new Date(session.start_date)
  if (Number.isNaN(date.getTime())) return 'Any time'
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function SessionBlock({ session, onComplete }: { session: CalendarSession; onComplete?: (session: CalendarSession) => void }) {
  const status = session.status ?? 'scheduled'
  const booked = session.seats_booked ?? 0
  const seats = session.max_seats ?? 1
  const isComplete = status === 'completed'

  return (
    <article className={`session-block session-block-${isComplete ? 'completed' : status}`}>
      <div className="session-block-top">
        <strong>{session.session_type?.name ?? 'Driving lesson'}</strong>
        <span>{formatTime(session)}</span>
      </div>
      <p>{session.instructor?.name ?? 'Unassigned instructor'}</p>
      <div className="session-block-meta">
        <span><Users className="session-block-icon" />{booked}/{seats}</span>
        {session.location && <span><MapPin className="session-block-icon" />{session.location}</span>}
      </div>
      {onComplete && !isComplete && (
        <button className="session-complete-button" type="button" onClick={() => onComplete(session)}>
          <CheckCircle2 className="session-block-icon" />
          Complete
        </button>
      )}
      {isComplete && (
        <span className="session-complete-label">
          <Clock className="session-block-icon" />
          Logged
        </span>
      )}
    </article>
  )
}
