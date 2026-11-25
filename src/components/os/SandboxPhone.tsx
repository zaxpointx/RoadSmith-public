'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Persona { phone: string; name: string; role: string; detail: string }
interface Msg { id: string; direction: 'in' | 'out'; author: string; body: string; at: string; tools?: { tool: string; ok: boolean }[] }
interface State { now: string; nowLabel: string; timezone: string; pendingJobs: number; nextJob: string | null; outbox: { to: string; name: string | null; body: string; status: string; reason: string; at: string }[] }

const SCHOOLS = [{ phone: '+16155550100', name: 'Larkspur Driving School' }, { phone: '+16175550100', name: 'Harbor Point Driving (second school)' }]

const IDEAS: Record<string, string[]> = {
  lead: ['Hi! How much are lessons?', 'I want to book a driving lesson for my daughter', 'Do you have drivers ed classes?', 'Do you pick up from school?'],
  parent: ["When is Emma's next lesson?", 'Can we move it to Saturday morning?', 'What do we owe?', 'Book Emma a 90 minute lesson next week'],
  student: ['What lessons do I have?', 'cancel my lesson tomorrow', 'I need a lesson Friday afternoon', 'Can I talk to a person?'],
  instructor: ['schedule tomorrow', "who's next", 'running 15 min late', 'done 60 min - great lane changes', 'block friday 9-11am dentist'],
  owner: ['how are we doing?', 'inbox', 'plan drives', 'how is Emma Carter', "tell Emma Carter's family we're closed Thursday for Thanksgiving"],
  admin: ['how are we doing?', 'inbox'],
}

function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleString('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p.replace(/[.,;:!?]+$/, '')} target="_blank" rel="noreferrer">{p}</a> : <span key={i}>{p}</span>))
}

export function SandboxPhone() {
  const [school, setSchool] = useState(SCHOOLS[0].phone)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [phone, setPhone] = useState('+16155550199')
  const [custom, setCustom] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [state, setState] = useState<State | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [engine, setEngine] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const load = useCallback(async (withPersonas = false) => {
    const res = await fetch(`/api/os/sandbox/thread?to=${encodeURIComponent(school)}&phone=${encodeURIComponent(phone)}${withPersonas ? '&personas=1' : ''}`, { cache: 'no-store' })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Sandbox unavailable.'); return }
    const data = await res.json()
    setMsgs(data.thread?.messages ?? [])
    setState(data.state)
    if (data.personas) setPersonas(data.personas)
  }, [school, phone])

  useEffect(() => {
    const t = setTimeout(() => { void load(true) }, 0)
    return () => clearTimeout(t)
  }, [load])
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load() }, 4000)
    return () => clearInterval(t)
  }, [load])
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }) }, [msgs.length])

  async function send(body: string) {
    if (!body.trim() || busy) return
    setBusy(true)
    setError(null)
    setMsgs((m) => [...m, { id: `tmp${Date.now()}`, direction: 'in', author: 'contact', body, at: new Date().toISOString() }])
    setText('')
    const res = await fetch('/api/os/sandbox/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: school, from: phone, body }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setError(data.error ?? 'Message not delivered.')
    else setEngine(data.engine)
    await load(true)
    setBusy(false)
  }

  async function clock(payload: { minutes?: number; jump?: 'next7am' }) {
    setBusy(true)
    await fetch('/api/os/sandbox/clock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, to: school }) })
    await load(true)
    setBusy(false)
  }

  async function reset() {
    if (!confirm('Reset the sandbox? All conversations and bookings return to the starting data.')) return
    setBusy(true)
    await fetch('/api/os/sandbox/reset', { method: 'POST' })
    await load(true)
    setBusy(false)
  }

  const current = personas.find((p) => p.phone === phone)
  const role = current?.role ?? 'lead'
  const tz = state?.timezone ?? 'America/Chicago'

  return (
    <div className="rs-sbx">
      <aside className="rs-sbx-col" aria-label="Who is texting">
        <label className="rs-label" htmlFor="school">School being texted</label>
        <select id="school" className="rs-select" value={school} onChange={(e) => { setSchool(e.target.value); setPhone(e.target.value === SCHOOLS[0].phone ? '+16155550199' : '+16175550199') }}>
          {SCHOOLS.map((s) => <option key={s.phone} value={s.phone}>{s.name}</option>)}
        </select>
        <h2 className="rs-sbx-h">Text as</h2>
        <ul className="rs-personas">
          {personas.map((p) => (
            <li key={p.phone}>
              <button type="button" aria-pressed={p.phone === phone} onClick={() => setPhone(p.phone)}>
                <strong>{p.name}</strong><span>{p.detail}</span>
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); if (custom.trim()) setPhone(custom.trim()) }} style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <label className="rs-visually-hidden" htmlFor="custom">Any phone number</label>
          <input id="custom" className="rs-input" placeholder="Any number, e.g. 615 555 0177" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button className="rs-btn">Use</button>
        </form>
      </aside>

      <section className="rs-phone-wrap" aria-label="Phone">
        <div className="rs-phone">
          <div className="rs-phone-top">
            <strong>{SCHOOLS.find((s) => s.phone === school)?.name}</strong>
            <span>Texting from {current?.name ?? phone}</span>
          </div>
          <div className="rs-phone-msgs" ref={scroller} aria-live="polite">
            {!msgs.length ? <p className="rs-phone-empty">No messages yet. Say hi — or try one of the suggestions below.</p> : null}
            {msgs.map((m) => (
              <div key={m.id} className={m.direction === 'in' ? 'rs-bub rs-bub--me' : 'rs-bub rs-bub--them'}>
                <div>{linkify(m.body)}</div>
                <time>{fmtTime(m.at, tz)}{m.direction === 'out' && m.author !== 'agent' ? ` · ${m.author === 'staff' ? 'staff' : 'automatic'}` : ''}</time>
              </div>
            ))}
            {busy ? <div className="rs-bub rs-bub--them rs-typing" aria-label="Replying">•••</div> : null}
          </div>
          <div className="rs-ideas">
            {(IDEAS[role] ?? IDEAS.lead).map((i) => <button key={i} type="button" onClick={() => send(i)} disabled={busy}>{i}</button>)}
          </div>
          <form className="rs-phone-compose" onSubmit={(e) => { e.preventDefault(); send(text) }}>
            <label className="rs-visually-hidden" htmlFor="sms">Text message</label>
            <input id="sms" value={text} onChange={(e) => setText(e.target.value)} placeholder="Text message" autoComplete="off" />
            <button disabled={busy || !text.trim()} aria-label="Send">Send</button>
          </form>
        </div>
        {error ? <p className="rs-result rs-result--err" role="alert">{error}</p> : null}
        {engine ? <p className="rs-help" style={{ textAlign: 'center' }}>Replied by {engine === 'claude' ? 'Claude' : 'the built-in interpreter (no AI key configured)'}</p> : null}
      </section>

      <aside className="rs-sbx-col" aria-label="Sandbox controls">
        <h2 className="rs-sbx-h" style={{ marginTop: 0 }}>Sandbox time</h2>
        <p style={{ fontSize: 20, fontWeight: 800 }}>{state?.nowLabel ?? '…'}</p>
        <p className="rs-help">{state?.pendingJobs ?? 0} scheduled jobs{state?.nextJob ? `; next ${state.nextJob}` : ''}. Moving time forward runs reminders, releases unpaid holds and sends 7am briefs.</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0 4px' }}>
          <button className="rs-btn rs-btn--sm" disabled={busy} onClick={() => clock({ minutes: 60 })}>+1 hour</button>
          <button className="rs-btn rs-btn--sm" disabled={busy} onClick={() => clock({ minutes: 180 })}>+3 hours</button>
          <button className="rs-btn rs-btn--sm" disabled={busy} onClick={() => clock({ jump: 'next7am' })}>Tomorrow 7am</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <Link className="rs-btn rs-btn--go rs-btn--sm" href="/app">Open the Control Center</Link>
          <button className="rs-btn rs-btn--sm rs-btn--stop" disabled={busy} onClick={reset}>Reset sandbox</button>
        </div>
        <h2 className="rs-sbx-h">Texts the school sent</h2>
        <p className="rs-help">Every outgoing text, to anyone. In the sandbox these stay on this machine.</p>
        <ul className="rs-outbox">
          {(state?.outbox ?? []).slice(0, 25).map((o, i) => (
            <li key={i}>
              <div className="rs-outbox-head"><button type="button" onClick={() => setPhone(o.to)}>{o.name || o.to}</button><time>{fmtTime(o.at, tz)}</time></div>
              <p>{o.body}</p>
              {o.status === 'suppressed' ? <span className="rs-tag rs-tag--stop">Not sent — opted out</span> : o.reason ? <span className="rs-tag">{o.reason.replace(/_/g, ' ')}</span> : null}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
