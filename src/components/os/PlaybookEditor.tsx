'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Playbook } from '@/lib/os/playbook'

const AUTONOMY: { key: keyof Playbook['autonomy']; label: string; help: string }[] = [
  { key: 'book_lessons', label: 'Book driving lessons', help: 'Into times the scheduler confirms are open, with drive time between pickups.' },
  { key: 'enroll_courses', label: 'Enroll students in classes', help: 'Seats are held until the deposit is paid.' },
  { key: 'reschedule', label: 'Move a lesson with enough notice', help: 'Outside your cancellation window.' },
  { key: 'cancel', label: 'Cancel a lesson with enough notice', help: 'Outside your cancellation window. Refunds follow the rule below.' },
  { key: 'late_changes', label: 'Late changes and cancellations', help: 'Inside your cancellation window, where a late fee may apply.' },
  { key: 'refunds', label: 'Refunds', help: 'Money going back out.' },
  { key: 'drive_plans', label: 'Book a whole cohort\'s drive times', help: 'After a classroom week ends.' },
]
const LEVELS: { v: 'auto' | 'approve' | 'never'; label: string }[] = [
  { v: 'auto', label: 'Handle it' }, { v: 'approve', label: 'Ask me first' }, { v: 'never', label: 'Send to me' },
]

export function PlaybookEditor({ initial }: { initial: Playbook }) {
  const router = useRouter()
  const [pb, setPb] = useState<Playbook>(initial)
  const [closed, setClosed] = useState(initial.closed_dates.join(', '))
  const [state, setState] = useState<{ busy: boolean; msg: string | null; ok: boolean }>({ busy: false, msg: null, ok: true })
  const set = <K extends keyof Playbook>(k: K, v: Playbook[K]) => setPb((p) => ({ ...p, [k]: v }))
  const pol = <K extends keyof Playbook['policies']>(k: K, v: Playbook['policies'][K]) => setPb((p) => ({ ...p, policies: { ...p.policies, [k]: v } }))
  const msg = <K extends keyof Playbook['messaging']>(k: K, v: Playbook['messaging'][K]) => setPb((p) => ({ ...p, messaging: { ...p.messaging, [k]: v } }))

  async function save() {
    setState({ busy: true, msg: null, ok: true })
    const closedDates = closed.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean)
    const body = { ...pb, closed_dates: closedDates, faqs: pb.faqs.filter((f) => f.q.trim() && f.a.trim()) }
    const res = await fetch('/api/os/playbook', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playbook: body }) })
    const data = await res.json().catch(() => ({}))
    setState({ busy: false, ok: res.ok, msg: res.ok ? 'Saved. The assistant uses this from the next message.' : data.error ?? 'Not saved.' })
    if (res.ok) router.refresh()
  }

  const num = (v: string) => (v === '' ? 0 : Number(v))
  return (
    <div className="rs-stack">
      <section className="rs-panel" aria-labelledby="pb-basics">
        <div className="rs-panel-head"><div><h2 id="pb-basics">Your school, in your words</h2><p>The assistant answers from this — and only this — when families ask general questions.</p></div></div>
        <div className="rs-panel-body rs-form-grid">
          <div style={{ gridColumn: '1 / -1' }}><label className="rs-label" htmlFor="about">About the school</label><textarea id="about" className="rs-textarea" value={pb.about} onChange={(e) => set('about', e.target.value)} /></div>
          <div><label className="rs-label" htmlFor="hours">Office hours</label><input id="hours" className="rs-input" value={pb.office_hours} onChange={(e) => set('office_hours', e.target.value)} /></div>
          <div><label className="rs-label" htmlFor="voice">How you want to sound</label><input id="voice" className="rs-input" value={pb.owner_note} onChange={(e) => set('owner_note', e.target.value)} /></div>
        </div>
      </section>

      <section className="rs-panel" aria-labelledby="pb-faq">
        <div className="rs-panel-head"><div><h2 id="pb-faq">Answers to common questions</h2><p>{pb.faqs.length} answers. Anything not covered here goes to you instead of being guessed.</p></div>
          <button className="rs-btn rs-btn--sm" onClick={() => set('faqs', [...pb.faqs, { q: '', a: '' }])}>Add an answer</button></div>
        <div className="rs-panel-body" style={{ display: 'grid', gap: 14 }}>
          {pb.faqs.map((f, i) => (
            <div key={i} style={{ display: 'grid', gap: 6, paddingTop: i ? 14 : 0, borderTop: i ? '1px solid var(--line-2)' : 0 }}>
              <label className="rs-visually-hidden" htmlFor={`fq${i}`}>Question {i + 1}</label>
              <input id={`fq${i}`} className="rs-input" style={{ fontWeight: 700 }} value={f.q} placeholder="Question families ask" onChange={(e) => set('faqs', pb.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
              <label className="rs-visually-hidden" htmlFor={`fa${i}`}>Answer {i + 1}</label>
              <textarea id={`fa${i}`} className="rs-textarea" style={{ minHeight: 60 }} value={f.a} placeholder="Your answer" onChange={(e) => set('faqs', pb.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              <div><button className="rs-btn rs-btn--sm rs-btn--stop" onClick={() => set('faqs', pb.faqs.filter((_, j) => j !== i))}>Remove</button></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rs-panel" aria-labelledby="pb-auto">
        <div className="rs-panel-head"><div><h2 id="pb-auto">What the assistant may do on its own</h2><p>&ldquo;Ask me first&rdquo; puts a ready-to-run approval in your inbox. &ldquo;Send to me&rdquo; hands the whole request to you.</p></div></div>
        <div className="rs-panel-body">
          {AUTONOMY.map((a) => (
            <div className="rs-auto" key={a.key}>
              <div><strong>{a.label}</strong><p className="rs-help" style={{ marginTop: 0 }}>{a.help}</p></div>
              <div className="rs-seg" role="group" aria-label={a.label}>
                {LEVELS.map((l) => (
                  <button key={l.v} type="button" aria-pressed={pb.autonomy[a.key] === l.v} onClick={() => setPb((p) => ({ ...p, autonomy: { ...p.autonomy, [a.key]: l.v } }))}>{l.label}</button>
                ))}
              </div>
            </div>
          ))}
          <p className="rs-help" style={{ marginTop: 10 }}>Always sent to you, whatever these say: medical and safety questions, accidents, complaints, discounts, legal or paperwork questions, and anything the assistant isn&apos;t sure about.</p>
        </div>
      </section>

      <section className="rs-panel" aria-labelledby="pb-rules">
        <div className="rs-panel-head"><div><h2 id="pb-rules">Booking rules</h2><p>Enforced by the scheduler, not just described to the assistant.</p></div></div>
        <div className="rs-panel-body rs-form-grid">
          <div><label className="rs-label" htmlFor="cw">Free changes up to (hours before)</label><input id="cw" type="number" min={0} max={168} className="rs-input" value={pb.policies.cancellation_hours} onChange={(e) => pol('cancellation_hours', num(e.target.value))} /></div>
          <div><label className="rs-label" htmlFor="fee">Late change fee ($)</label><input id="fee" type="number" min={0} className="rs-input" value={pb.policies.late_cancel_fee_cents / 100} onChange={(e) => pol('late_cancel_fee_cents', Math.round(num(e.target.value) * 100))} /></div>
          <div><label className="rs-label" htmlFor="hold">Hold unpaid bookings for (minutes)</label><input id="hold" type="number" min={10} max={1440} className="rs-input" value={pb.policies.hold_minutes} onChange={(e) => pol('hold_minutes', num(e.target.value))} /></div>
          <div><label className="rs-label" htmlFor="notice">Minimum notice (hours)</label><input id="notice" type="number" min={0} max={168} className="rs-input" value={pb.policies.min_notice_hours} onChange={(e) => pol('min_notice_hours', num(e.target.value))} /></div>
          <div><label className="rs-label" htmlFor="window">Book up to (days ahead)</label><input id="window" type="number" min={1} max={120} className="rs-input" value={pb.policies.booking_window_days} onChange={(e) => pol('booking_window_days', num(e.target.value))} /></div>
          <div><label className="rs-label" htmlFor="perweek">Max lessons per student per week</label><input id="perweek" type="number" min={1} max={14} className="rs-input" value={pb.policies.max_lessons_per_week} onChange={(e) => pol('max_lessons_per_week', num(e.target.value))} /></div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={pb.policies.permit_required_for_lessons} onChange={(e) => pol('permit_required_for_lessons', e.target.checked)} /> Require a learner&apos;s permit before driving lessons</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={pb.policies.minor_needs_guardian} onChange={(e) => pol('minor_needs_guardian', e.target.checked)} /> Require a parent or guardian for students under 18</label>
          <div style={{ gridColumn: '1 / -1' }}><label className="rs-label" htmlFor="closed">Closed dates</label><input id="closed" className="rs-input" value={closed} onChange={(e) => setClosed(e.target.value)} /><p className="rs-help">YYYY-MM-DD, separated by commas. No lessons or drive plans are offered on these days.</p></div>
        </div>
      </section>

      <section className="rs-panel" aria-labelledby="pb-text">
        <div className="rs-panel-head"><div><h2 id="pb-text">Texting</h2><p>Automatic messages wait until quiet hours end. Replies to someone who just texted go out right away.</p></div></div>
        <div className="rs-panel-body rs-form-grid">
          <div><label className="rs-label" htmlFor="qs">Quiet hours start</label><input id="qs" type="time" className="rs-input" value={pb.messaging.quiet_start} onChange={(e) => msg('quiet_start', e.target.value)} /></div>
          <div><label className="rs-label" htmlFor="qe">Quiet hours end</label><input id="qe" type="time" className="rs-input" value={pb.messaging.quiet_end} onChange={(e) => msg('quiet_end', e.target.value)} /></div>
          <div><label className="rs-label" htmlFor="rh">Lesson reminder (hours before)</label><input id="rh" type="number" min={1} max={72} className="rs-input" value={pb.messaging.reminder_hours_before} onChange={(e) => msg('reminder_hours_before', num(e.target.value))} /></div>
          <div><label className="rs-label" htmlFor="ib">Instructor morning schedule at</label><input id="ib" type="time" className="rs-input" value={pb.messaging.instructor_brief_time} onChange={(e) => msg('instructor_brief_time', e.target.value)} /></div>
          <div><label className="rs-label" htmlFor="ob">Your morning brief at</label><input id="ob" type="time" className="rs-input" value={pb.messaging.owner_brief_time} onChange={(e) => msg('owner_brief_time', e.target.value)} /></div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={pb.messaging.send_progress_to_parents} onChange={(e) => msg('send_progress_to_parents', e.target.checked)} /> Text families a progress note after each lesson</label>
        </div>
      </section>

      <div className="rs-savebar">
        {state.msg ? <span className={state.ok ? 'rs-result' : 'rs-result rs-result--err'} role="status" style={{ marginTop: 0 }}>{state.msg}</span> : null}
        <button className="rs-btn rs-btn--go" onClick={save} disabled={state.busy}>{state.busy ? 'Saving…' : 'Save playbook'}</button>
      </div>
    </div>
  )
}
