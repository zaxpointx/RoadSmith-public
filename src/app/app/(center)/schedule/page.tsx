import Link from 'next/link'
import { requireSession } from '@/lib/os/center'
import { scheduleBetween } from '@/lib/os/insights'
import { listCourses, courseLabel } from '@/lib/os/bookings'
import { many } from '@/lib/os/db'
import { now } from '@/lib/os/clock'
import { addDays, asDateStr, fmtDateStr, fmtTime, localDate } from '@/lib/os/time'
import { LessonActions } from '@/components/os/LessonActions'
import { DrivePlanButton } from '@/components/os/DrivePlanButton'

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const s = await requireSession()
  const sp = await searchParams
  const tz = s.school.timezone
  const t = now()
  const today = localDate(t, tz)
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : today
  const to = addDays(from, 6)
  const [entries, staff, courses] = await Promise.all([
    scheduleBetween(s.ctx, from, to),
    many<{ id: string; name: string; color: string }>(s.db, `select id, name, color from rs.staff where school_id = $1 and active and role = 'instructor' order by name`, [s.school.id]),
    listCourses(s.ctx),
  ])
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const closed = new Set(s.school.playbook.closed_dates)
  return (
    <>
      <header className="rs-page-head">
        <div><h1>Schedule</h1><p>{fmtDateStr(from)} – {fmtDateStr(to)}. Built by the assistant from real availability and drive time; every booking is checked again before it&apos;s written.</p></div>
        <nav style={{ display: 'flex', gap: 6 }} aria-label="Week">
          <Link className="rs-btn rs-btn--sm" href={`/app/schedule?from=${addDays(from, -7)}`}>Previous week</Link>
          <Link className="rs-btn rs-btn--sm" href="/app/schedule">This week</Link>
          <Link className="rs-btn rs-btn--sm" href={`/app/schedule?from=${addDays(from, 7)}`}>Next week</Link>
        </nav>
      </header>
      <div className="rs-panel rs-table-wrap" style={{ marginBottom: 20 }}>
        <table className="rs-table">
          <thead><tr><th scope="col" style={{ width: 120 }}>Day</th>{staff.map((st) => <th key={st.id} scope="col"><span className="rs-swatch" style={{ background: st.color, display: 'inline-block', marginRight: 6 }} />{st.name}</th>)}</tr></thead>
          <tbody>
            {days.map((d) => (
              <tr key={d} data-active={d === today}>
                <th scope="row" style={{ background: 'transparent', fontSize: 14, color: 'var(--ink)', verticalAlign: 'top' }}>{fmtDateStr(d)}{closed.has(d) ? <div className="rs-tag rs-tag--amber" style={{ marginTop: 4 }}>Closed</div> : null}</th>
                {staff.map((st) => {
                  const mine = entries.filter((e) => e.instructorId === st.id && (e.kind === 'class' || localDate(e.start, tz) === d) && localDate(e.start, tz) === d)
                  return (
                    <td key={st.id}>
                      {mine.length ? mine.map((e) => (
                        <details key={e.id} style={{ marginBottom: 8 }}>
                          <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                            <strong>{fmtTime(e.start, tz)}</strong> {e.kind === 'class' ? e.title : e.student}
                            {e.status === 'held' ? <> <span className="rs-tag rs-tag--amber">Awaiting payment</span></> : e.status === 'completed' ? <> <span className="rs-tag rs-tag--go">Done</span></> : e.status === 'no_show' ? <> <span className="rs-tag rs-tag--stop">No-show</span></> : null}
                          </summary>
                          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0 0' }}>
                            {fmtTime(e.start, tz)}–{fmtTime(e.end, tz)} · {e.kind === 'class' ? e.pickup : `Pickup: ${e.pickup ?? 'school'}`}
                            {e.locationQuality === 'unknown' && e.kind === 'lesson' ? ' (address not mapped — extra travel time padded)' : ''}
                            {e.notes ? <div>Notes: {e.notes}</div> : null}
                            {e.phone ? <div>Family: {e.phone}</div> : null}
                          </div>
                          {e.kind === 'lesson' ? <LessonActions id={e.id} status={e.status} started={e.start <= t} /> : null}
                        </details>
                      )) : <span style={{ color: 'var(--faint)' }}>—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="rs-panel" aria-labelledby="courses">
        <div className="rs-panel-head"><div><h2 id="courses">Classes</h2><p>Seats, and which finished cohorts still need behind-the-wheel times.</p></div></div>
        <div className="rs-table-wrap">
          <table className="rs-table">
            <thead><tr><th>Class</th><th>Seats</th><th>Status</th><th /></tr></thead>
            <tbody>
              {courses.map((c) => {
                const finished = asDateStr(c.ends_on) < today
                return (
                  <tr key={c.id}>
                    <td><strong>{c.title}</strong><div style={{ fontSize: 13, color: 'var(--muted)' }}>{courseLabel(c)}</div></td>
                    <td>{c.seats_taken}/{c.capacity}<div className="rs-seats" style={{ width: 120 }}><span data-full={c.seats_left === 0} style={{ width: `${Math.min(100, (c.seats_taken / c.capacity) * 100)}%` }} /></div></td>
                    <td>{finished ? <span className="rs-tag">Finished</span> : c.seats_left === 0 ? <span className="rs-tag rs-tag--amber">Full — assistant offers the next class</span> : <span className="rs-tag rs-tag--go">Open</span>}</td>
                    <td>{finished && c.service_code === 'DRVED' ? <DrivePlanButton courseId={c.id} /> : null}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
