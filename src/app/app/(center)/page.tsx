import Link from 'next/link'
import { requireSession, relTime } from '@/lib/os/center'
import { snapshot, scheduleBetween } from '@/lib/os/insights'
import { openInbox } from '@/lib/os/inbox'
import { many } from '@/lib/os/db'
import { now } from '@/lib/os/clock'
import { fmtDateStr, fmtMoney, fmtTime, localDate } from '@/lib/os/time'
import { InboxItem } from '@/components/os/InboxItem'
import { DrivePlanButton } from '@/components/os/DrivePlanButton'

const REASONS: Record<string, string> = {
  lesson_reminder: 'lesson reminders', course_reminder: 'class reminders', balance_reminder: 'balance requests', booking_confirmed: 'booking confirmations',
  enrollment_confirmed: 'seat confirmations', hold_expired: 'released-hold notices', payment_failed: 'payment retry links', progress: 'progress updates to parents',
  daily_brief: 'instructor morning briefs', owner_brief: 'owner briefs', lesson_booked: 'new-lesson notices to instructors', lesson_moved: 'change notices',
  lesson_cancelled: 'cancellation notices', running_late: 'running-late heads-ups', drive_plan: 'drive-time schedules', refund: 'refund notices',
}

function describe(action: string, d: Record<string, string>): string | null {
  switch (action) {
    case 'lesson.held': return `Held ${d.when} for ${d.student} and sent a payment link`
    case 'lesson.booked': return `Booked ${d.student}, ${d.when}`
    case 'payment.paid': return `Payment received: ${d.amount} — ${d.description}`
    case 'payment.failed': return `Payment declined (${d.reason}); sent a retry link`
    case 'lesson.moved': return `Moved a lesson from ${d.from} to ${d.to}`
    case 'lesson.cancelled': return `Cancelled the lesson on ${d.when}`
    case 'lesson.hold_expired': return 'Released an unpaid lesson hold'
    case 'enrollment.hold_expired': return 'Released an unpaid seat hold'
    case 'enrollment.reserved': return `Held a seat in ${d.course} for ${d.student}`
    case 'enrollment.confirmed': return `Confirmed ${d.student} in ${d.course}`
    case 'course.full_offered_next': return `Class full — offered ${d.student} the next one`
    case 'student.registered': return `Registered a new student: ${d.name}`
    case 'contact.new_lead': return 'New inquiry from a new number'
    case 'lesson.completed': return `${d.student} finished a ${d.minutes}-minute lesson`
    case 'drive_plan.applied': return 'Booked a cohort drive plan and texted each family'
    case 'contact.opted_out': return 'A contact replied STOP — no more texts to them'
    default: return null
  }
}

export default async function TodayPage() {
  const s = await requireSession()
  const tz = s.school.timezone
  const t = now()
  const today = localDate(t, tz)
  const [snap, inbox, entries, staff, activity, sent] = await Promise.all([
    snapshot(s.ctx),
    openInbox(s.ctx),
    scheduleBetween(s.ctx, today, today),
    many<{ id: string; name: string; color: string }>(s.db, `select id, name, color from rs.staff where school_id = $1 and active and role = 'instructor' order by name`, [s.school.id]),
    many<{ action: string; detail: Record<string, string>; created_at: Date; actor_type: string }>(s.db,
      `select action, detail, created_at, actor_type from rs.audit_log where school_id = $1 and actor_type in ('agent','system','provider') and created_at > $2 order by created_at desc limit 40`,
      [s.school.id, new Date(+t - 2 * 86400000)]),
    many<{ reason: string; n: number }>(s.db, `select reason, count(*)::int as n from rs.outbox where school_id = $1 and created_at > $2 and status in ('sent','sandboxed') and reason <> '' group by reason order by n desc`, [s.school.id, new Date(+t - 86400000)]),
  ])
  const m = (c: number) => fmtMoney(c, s.school.currency)
  const handled = activity.map((a) => ({ text: describe(a.action, a.detail ?? {}), at: new Date(a.created_at) })).filter((a) => a.text)
  const textsSent = sent.reduce((x, r) => x + r.n, 0)
  const first = s.staff.name.split(' ')[0]
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(t))
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <header className="rs-page-head">
        <div>
          <h1>{greet}, {first}</h1>
          <p>{fmtDateStr(today)} · {inbox.length ? `${inbox.length} thing${inbox.length === 1 ? '' : 's'} need${inbox.length === 1 ? 's' : ''} you` : 'Nothing needs you right now'}</p>
        </div>
      </header>

      <dl className="rs-figures">
        <div className="rs-figure"><dt>Collected this month</dt><dd>{m(snap.collectedMonthCents)}</dd><small>{m(snap.collectedYesterdayCents)} yesterday</small></div>
        <div className="rs-figure"><dt>Lessons next 7 days</dt><dd>{snap.lessonsNext7}</dd><small>{snap.lessonsToday} today{snap.heldAwaitingPayment ? ` · ${snap.heldAwaitingPayment} awaiting payment` : ''}</small></div>
        <div className="rs-figure"><dt>Course balances due</dt><dd>{m(snap.outstandingBalanceCents)}</dd><small>Reminders scheduled</small></div>
        <div className="rs-figure"><dt>Texts handled, last 24h</dt><dd>{snap.conversations24h}</dd><small>{snap.agentHandled24h} without you</small></div>
      </dl>

      <div className="rs-grid-2">
        <div className="rs-stack">
          <section className="rs-panel" aria-labelledby="needs">
            <div className="rs-panel-head"><div><h2 id="needs">Needs you</h2><p>Approvals and questions the assistant won&apos;t decide on its own.</p></div></div>
            {inbox.length ? inbox.map((i) => (
              <InboxItem key={i.id} item={{ id: i.id, kind: i.kind, priority: i.priority, title: i.title, detail: i.detail, hasAction: Boolean(i.action), conversationId: i.conversation_id, age: relTime(new Date(i.created_at), t) }} />
            )) : <p className="rs-empty">All clear. New approvals and escalations will appear here, and urgent ones are also texted to you.</p>}
          </section>

          {snap.needsDrives.length ? (
            <section className="rs-panel" aria-labelledby="drives">
              <div className="rs-panel-head"><div><h2 id="drives">Students waiting for drive times</h2><p>Roadsmith drafts the whole cohort&apos;s behind-the-wheel schedule, grouped to keep driving between pickups short. You approve before anyone is booked.</p></div></div>
              <div className="rs-panel-body">
                {snap.needsDrives.map((n) => (
                  <div key={n.courseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span><strong>{n.course}</strong> — {n.students} student{n.students === 1 ? '' : 's'}</span>
                    <DrivePlanButton courseId={n.courseId} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rs-panel" aria-labelledby="handled">
            <div className="rs-panel-head"><div><h2 id="handled">Handled for you</h2><p>{textsSent ? `${textsSent} texts sent in the last day: ${sent.slice(0, 4).map((r) => `${r.n} ${REASONS[r.reason] ?? r.reason.replace(/_/g, ' ')}`).join(', ')}.` : 'What the assistant and automations did, most recent first.'}</p></div><Link href="/app/activity" className="rs-btn rs-btn--sm">Full activity</Link></div>
            {handled.length ? (
              <ul className="rs-feed">
                {handled.slice(0, 12).map((h, i) => <li key={i}><time>{fmtTime(h.at, tz)}</time><span>{h.text}</span></li>)}
              </ul>
            ) : <p className="rs-empty">Nothing yet in the last two days. Text the school from the sandbox phone to see the assistant work.</p>}
          </section>
        </div>

        <div className="rs-stack">
          <section className="rs-panel" aria-labelledby="road">
            <div className="rs-panel-head"><div><h2 id="road">On the road today</h2><p>Each instructor&apos;s stops, in order. Times already include drive time between pickups.</p></div><Link href="/app/schedule" className="rs-btn rs-btn--sm">Week</Link></div>
            <div className="rs-lanes">
              {staff.map((st) => {
                const mine = entries.filter((e) => e.instructorId === st.id && e.status !== 'cancelled')
                return (
                  <div className="rs-lane" key={st.id} style={{ ['--lane' as string]: st.color }}>
                    <div className="rs-lane-head"><span className="rs-swatch" style={{ background: st.color }} />{st.name}<span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 13 }}>{mine.length ? `${mine.length} stop${mine.length === 1 ? '' : 's'}` : 'No lessons today'}</span></div>
                    {mine.length ? (
                      <ol className="rs-stops">
                        {mine.map((e) => (
                          <li key={e.id} className={e.kind === 'class' ? 'rs-stop rs-stop--class' : 'rs-stop'}>
                            <time>{fmtTime(e.start, tz)}</time>
                            <span>{e.kind === 'class' ? e.title : e.student}<span className="rs-where">{e.pickup}</span></span>
                            {e.status === 'held' ? <span className="rs-tag rs-tag--amber">Awaiting payment</span> : e.status === 'completed' ? <span className="rs-tag rs-tag--go">Done</span> : e.status === 'no_show' ? <span className="rs-tag rs-tag--stop">No-show</span> : <span />}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rs-panel" aria-labelledby="classes">
            <div className="rs-panel-head"><div><h2 id="classes">Upcoming classes</h2><p>Seats count unpaid holds until they expire.</p></div></div>
            <div className="rs-panel-body">
              {snap.courses.map((c) => (
                <div key={c.id} style={{ padding: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{c.title}</strong><span>{c.seats_taken}/{c.capacity}</span></div>
                  <div className="rs-seats" aria-hidden="true"><span data-full={c.seats_taken >= c.capacity} style={{ width: `${Math.min(100, (c.seats_taken / c.capacity) * 100)}%` }} /></div>
                </div>
              ))}
              {!snap.courses.length ? <p className="rs-empty">No upcoming classes.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
