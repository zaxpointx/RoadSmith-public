'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ConversationControls({ id, mode }: { id: string; mode: 'agent' | 'human' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function toggle() {
    setBusy(true)
    await fetch(`/api/os/conversations/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: mode === 'agent' ? 'takeover' : 'handback' }) })
    setBusy(false)
    router.refresh()
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {mode === 'human' ? <span className="rs-tag rs-tag--route">You&apos;re handling this — the assistant is paused</span> : <span className="rs-tag rs-tag--go">Assistant is handling this</span>}
      <button className="rs-btn rs-btn--sm" onClick={toggle} disabled={busy}>{mode === 'agent' ? 'Take over' : 'Hand back to the assistant'}</button>
    </div>
  )
}

export function Composer({ id, mode }: { id: string; mode: 'agent' | 'human' }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/os/conversations/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', text }) })
    setBusy(false)
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Not sent.'); return }
    setText('')
    router.refresh()
  }
  return (
    <form className="rs-compose" onSubmit={send}>
      <label className="rs-visually-hidden" htmlFor="compose">Message</label>
      <input id="compose" className="rs-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'human' ? 'Text as the school…' : 'Send a one-off text as the school (the assistant keeps handling replies)'} />
      <button className="rs-btn rs-btn--go" disabled={busy || !text.trim()}>Send</button>
      {error ? <span className="rs-result rs-result--err" role="alert">{error}</span> : null}
    </form>
  )
}
