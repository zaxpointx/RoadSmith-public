import Link from 'next/link'
import { requireSession } from '@/lib/os/center'
import { many } from '@/lib/os/db'
import { now } from '@/lib/os/clock'
import { asDateStr, fmtMoney, fmtWhen, localDate, minutesLabel } from '@/lib/os/time'
import { ageOn, displayPhone } from '@/lib/os/util'

type Row = { id: string; first_name: string; last_name: string; dob: Date | string | null; permit_number: string | null; address: string | null; location_quality: string; driving_minutes: number; notes: string
  guardian: string | null; guardian_phone: string | null; own_phone: string | null; next_lesson: Date | null; courses: string | null; owed: number; created_at: Date }

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; s?: string; filter?: string }> }) {
  const s = await requireSession()
  const sp = await searchParams
  const tz = s.school.timezone
  const today = localDate(now(), tz)
  const q = (sp.q ?? '').trim().toLowerCase().slice(0, 60)
  const rows = await many<Row>(s.db, `select st.*, g.name as guardian, g.phone as guardian_phone, sc.phone as own_phone,
      (select min(starts_at) from rs.lessons l where l.student_id = st.id and l.status in ('held','booked') and l.starts_at > $2) as next_lesson,
      (select string_agg(c.title, ', ') from rs.enrollments e join rs.courses c on c.id = e.course_id where e.student_id = st.id and e.status = 'confirmed') as courses,
      coalesce((select sum(greatest(sv.price_cents - coalesce((select sum(p.amount_cents) from rs.payments p where p.enrollment_id = e.id and p.status = 'paid'),0),0))
        from rs.enrollments e join rs.courses c on c.id = e.course_id join rs.services sv on sv.id = c.service_id where e.student_id = st.id and e.status = 'confirmed'),0)::int as owed
    from rs.students st left join rs.contacts g on g.id = st.guardian_contact_id left join rs.contacts sc on sc.id = st.student_contact_id
    where st.school_id = $1 and ($3 = '' or lower(st.first_name || ' ' || st.last_name) like '%' || $3 || '%')
    order by st.last_name, st.first_name limit 300`, [s.school.id, now(), q])
  const age = (r: Row) => (r.dob ? ageOn(asDateStr(r.dob), today) : null)
  const missing = (r: Row) => [!r.dob && 'birth date', !r.permit_number && 'permit', !r.address && 'address', (age(r) ?? 99) < 18 && !r.guardian && 'guardian'].filter(Boolean) as string[]
  const shown = sp.filter === 'missing' ? rows.filter((r) => missing(r).length) : sp.filter === 'owing' ? rows.filter((r) => r.owed > 0) : rows
  const selected = sp.s ? rows.find((r) => r.id === sp.s) : undefined
  const history = selected ? await many<{ starts_at: Date; status: string; instructor: string; instructor_notes: string; completed_minutes: number | null }>(s.db,
    `select l.starts_at, l.status, st.name as instructor, l.instructor_notes, l.completed_minutes from rs.lessons l join rs.staff st on st.id = l.instructor_id where l.student_id = $1 and l.school_id = $2 order by l.starts_at desc limit 20`, [selected.id, s.school.id]) : []
  return (
    <>
      <header className="rs-page-head">
        <div><h1>Students</h1><p>{rows.length} students. Families keep these details up to date by text; the assistant asks for anything missing before booking.</p></div>
        <form style={{ display: 'flex', gap: 8 }} role="search">
          <label className="rs-visually-hidden" htmlFor="q">Search students</label>
          <input id="q" name="q" className="rs-input rs-search" defaultValue={sp.q} placeholder="Search by name" />
          <button className="rs-btn">Search</button>
        </form>
      </header>
      <nav style={{ display: 'flex', gap: 6, marginBottom: 14 }} aria-label="Filter students">
        <Link className="rs-btn rs-btn--sm" href="/app/students">Everyone</Link>
        <Link className="rs-btn rs-btn--sm" href="/app/students?filter=missing">Missing details ({rows.filter((r) => missing(r).length).length})</Link>
        <Link className="rs-btn rs-btn--sm" href="/app/students?filter=owing">Owes a balance ({rows.filter((r) => r.owed > 0).length})</Link>
      </nav>
      <div className={selected ? 'rs-grid-2' : ''}>
        <div className="rs-panel rs-table-wrap">
          <table className="rs-table">
            <thead><tr><th>Student</th><th>Behind the wheel</th><th>Next lesson</th><th>Balance</th><th>Missing</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} data-active={r.id === selected?.id}>
                  <td><Link href={`/app/students?s=${r.id}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}${sp.filter ? `&filter=${sp.filter}` : ''}`}><strong>{r.first_name} {r.last_name}</strong></Link><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{age(r) != null ? `${age(r)} · ` : ''}{r.courses ?? 'Private lessons'}</div></td>
                  <td>{minutesLabel(r.driving_minutes)}</td>
                  <td>{r.next_lesson ? fmtWhen(new Date(r.next_lesson), tz) : <span style={{ color: 'var(--faint)' }}>—</span>}</td>
                  <td>{r.owed ? fmtMoney(r.owed, s.school.currency) : <span style={{ color: 'var(--faint)' }}>—</span>}</td>
                  <td>{missing(r).map((m) => <span key={m} className="rs-tag rs-tag--amber" style={{ marginRight: 4 }}>{m}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length ? <p className="rs-empty">No students match.</p> : null}
        </div>
        {selected ? (
          <aside className="rs-panel" aria-label={`${selected.first_name} ${selected.last_name}`}>
            <div className="rs-panel-head"><div><h2>{selected.first_name} {selected.last_name}</h2><p>{age(selected) != null ? `Age ${age(selected)}` : 'Birth date not on file'} · {minutesLabel(selected.driving_minutes)} behind the wheel</p></div><Link href="/app/students" className="rs-btn rs-btn--sm">Close</Link></div>
            <div className="rs-panel-body" style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              <div><strong>Pickup</strong><br />{selected.address ?? '—'} {selected.location_quality === 'unknown' && selected.address ? <span className="rs-tag rs-tag--amber">Not mapped</span> : null}</div>
              <div><strong>Permit</strong><br />{selected.permit_number ? 'On file' : 'Not on file'}</div>
              <div><strong>Family</strong><br />{selected.guardian ? `${selected.guardian} · ${displayPhone(selected.guardian_phone!)}` : 'No guardian on file'}{selected.own_phone ? <><br />Student: {displayPhone(selected.own_phone)}</> : null}</div>
              {selected.notes ? <div><strong>Notes</strong><br />{selected.notes}</div> : null}
              <div><strong>Lessons</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {history.map((h, i) => <li key={i}>{fmtWhen(new Date(h.starts_at), tz)} with {h.instructor.split(' ')[0]} — {h.status.replace('_', '-')}{h.completed_minutes ? ` (${h.completed_minutes} min)` : ''}{h.instructor_notes ? `: ${h.instructor_notes}` : ''}</li>)}
                  {!history.length ? <li>No lessons yet.</li> : null}
                </ul>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </>
  )
}
