'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LessonActions({ id, status, started }: { id: string; status: string; started: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  async function act(action: 'complete' | 'no_show' | 'cancel') {
    if (action === 'cancel' && !confirm('Cancel this lesson and text the family?')) return
    setBusy(true)
    const res = await fetch(`/api/os/lessons/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    setMsg(res.ok ? { ok: true, text: data.message } : { ok: false, text: data.error ?? 'That did not work.' })
    if (res.ok) router.refresh()
  }
  if (!['booked', 'held'].includes(status)) return null
  return (
    <div className="rs-item-actions" style={{ marginTop: 6 }}>
      {status === 'booked' && started ? <button className="rs-btn rs-btn--sm" disabled={busy} onClick={() => act('complete')}>Mark done</button> : null}
      {status === 'booked' && started ? <button className="rs-btn rs-btn--sm" disabled={busy} onClick={() => act('no_show')}>No-show</button> : null}
      <button className="rs-btn rs-btn--sm rs-btn--stop" disabled={busy} onClick={() => act('cancel')}>Cancel lesson</button>
      {msg ? <span className={msg.ok ? 'rs-result' : 'rs-result rs-result--err'} role="status">{msg.text}</span> : null}
    </div>
  )
}
