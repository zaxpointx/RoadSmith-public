import Link from 'next/link'
import { requireSession, relTime } from '@/lib/os/center'
import { many, one } from '@/lib/os/db'
import { now } from '@/lib/os/clock'
import { fmtTime, fmtDay } from '@/lib/os/time'
import { displayPhone } from '@/lib/os/util'
import { ConversationControls, Composer } from '@/components/os/ConversationControls'

const AUDIENCE: Record<string, string> = { customer: 'Family', instructor: 'Instructor', owner: 'Owner' }
const TOOL_LABEL: Record<string, string> = {
  my_account: 'looked up account', register_student: 'registered student', update_student: 'updated student', add_guardian: 'added guardian', list_courses: 'checked classes',
  find_lesson_times: 'found open times', book_lesson: 'held lesson', enroll_in_course: 'held seat', reschedule_lesson: 'moved lesson', cancel_lesson: 'cancelled lesson',
  get_payment_link: 'sent payment link', escalate_to_owner: 'passed to you', schedule: 'read schedule', next_lesson: 'next lesson', complete_lesson: 'marked done',
  mark_no_show: 'no-show', running_late: 'told families', block_time: 'blocked time', student_info: 'student lookup', business_summary: 'business summary',
  list_decisions: 'listed decisions', decide: 'decided', plan_drives: 'drafted drives', message_family: 'texted family',
}

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ c?: string; who?: string }> }) {
  const s = await requireSession()
  const sp = await searchParams
  const t = now()
  const tz = s.school.timezone
  const filter = sp.who === 'staff' ? `and c.audience <> 'customer'` : sp.who === 'families' ? `and c.audience = 'customer'` : ''
  const list = await many<{ id: string; phone: string; audience: string; mode: string; last_message_at: Date; name: string | null; body: string | null; open_items: number }>(s.db,
    `select c.id, c.phone, c.audience, c.mode, c.last_message_at, coalesce(nullif(ct.name, ''), st.name) as name,
       (select body from rs.messages m where m.conversation_id = c.id order by created_at desc limit 1) as body,
       (select count(*)::int from rs.inbox i where i.conversation_id = c.id and i.status = 'open') as open_items
     from rs.conversations c left join rs.contacts ct on ct.id = c.contact_id left join rs.staff st on st.id = c.staff_id
     where c.school_id = $1 ${filter} order by c.last_message_at desc limit 100`, [s.school.id])
  const activeId = sp.c && list.some((l) => l.id === sp.c) ? sp.c : list[0]?.id
  const active = activeId ? list.find((l) => l.id === activeId)! : null
  const msgs = active ? await many<{ id: string; direction: string; author: string; body: string; created_at: Date; meta: { tools?: { tool: string; ok: boolean }[]; engine?: string } }>(s.db,
    `select id, direction, author, body, created_at, meta from rs.messages where conversation_id = $1 and school_id = $2 order by created_at, id`, [active.id, s.school.id]) : []
  const students = active ? await many<{ first_name: string; last_name: string }>(s.db,
    `select s.first_name, s.last_name from rs.students s join rs.conversations c on c.contact_id in (s.guardian_contact_id, s.student_contact_id) where c.id = $1`, [active.id]) : []
  const count = (await one<{ n: number }>(s.db, `select count(*)::int as n from rs.conversations where school_id = $1`, [s.school.id]))!.n

  return (
    <>
      <header className="rs-page-head">
        <div><h1>Conversations</h1><p>Every text with families and staff. The assistant answers; you can step in any time.</p></div>
        <nav style={{ display: 'flex', gap: 6 }} aria-label="Filter">
          <Link className="rs-btn rs-btn--sm" aria-current={!sp.who ? 'page' : undefined} href="/app/conversations">All ({count})</Link>
          <Link className="rs-btn rs-btn--sm" href="/app/conversations?who=families">Families</Link>
          <Link className="rs-btn rs-btn--sm" href="/app/conversations?who=staff">Staff</Link>
        </nav>
      </header>
      {!list.length ? <div className="rs-panel rs-empty">No conversations yet. When a family texts {displayPhone(s.school.agent_phone)}, it shows up here.</div> : (
        <div className="rs-convo">
          <div className="rs-convo-list">
            {list.map((c) => (
              <Link key={c.id} href={`/app/conversations?c=${c.id}${sp.who ? `&who=${sp.who}` : ''}`} aria-current={c.id === activeId ? 'true' : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{c.name || displayPhone(c.phone)}</strong>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{relTime(new Date(c.last_message_at), t)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, margin: '2px 0 4px' }}>
                  <span className="rs-tag">{AUDIENCE[c.audience]}</span>
                  {c.mode === 'human' ? <span className="rs-tag rs-tag--route">You</span> : null}
                  {c.open_items ? <span className="rs-tag rs-tag--amber">Needs you</span> : null}
                </div>
                <span className="rs-snippet">{c.body}</span>
              </Link>
            ))}
          </div>
          {active ? (
            <section className="rs-convo-pane" aria-label={`Conversation with ${active.name || active.phone}`}>
              <div className="rs-convo-head">
                <div>
                  <strong>{active.name || 'New contact'}</strong> <span style={{ color: 'var(--muted)' }}>{displayPhone(active.phone)}</span>
                  {students.length ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>Students: {students.map((x) => `${x.first_name} ${x.last_name}`).join(', ')}</div> : null}
                </div>
                <ConversationControls id={active.id} mode={active.mode as 'agent' | 'human'} />
              </div>
              <div className="rs-msgs">
                {msgs.map((m, i) => {
                  const day = fmtDay(new Date(m.created_at), tz)
                  const prevDay = i ? fmtDay(new Date(msgs[i - 1].created_at), tz) : ''
                  const cls = m.direction === 'in' ? 'rs-msg rs-msg--in' : m.author === 'staff' ? 'rs-msg rs-msg--out rs-msg--staff' : m.author === 'system' ? 'rs-msg rs-msg--out rs-msg--system' : 'rs-msg rs-msg--out'
                  const tools = m.meta?.tools ?? []
                  return (
                    <div key={m.id} style={{ display: 'contents' }}>
                      {day !== prevDay ? <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', margin: '6px 0' }}>{day}</div> : null}
                      <div className={cls}>{m.body}</div>
                      <div className={m.direction === 'out' ? 'rs-msg-meta rs-msg-meta--out' : 'rs-msg-meta'}>
                        {fmtTime(new Date(m.created_at), tz)} · {m.direction === 'in' ? 'received' : m.author === 'staff' ? 'sent by staff' : m.author === 'system' ? 'automatic' : 'assistant'}
                        {tools.length ? <> · <span className="rs-tools">{tools.map((tl, j) => <span key={j} data-ok={tl.ok}>{TOOL_LABEL[tl.tool] ?? tl.tool}</span>)}</span></> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
              <Composer id={active.id} mode={active.mode as 'agent' | 'human'} />
            </section>
          ) : null}
        </div>
      )}
    </>
  )
}
