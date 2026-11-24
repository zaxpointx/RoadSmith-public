'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DrivePlanButton({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  async function draft() {
    setBusy(true)
    const res = await fetch('/api/os/drives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg(data.error ?? 'Could not draft a plan.'); return }
    setMsg(data.placed ? `Drafted ${data.placed} drive times — review them under Needs you.` : 'No times could be placed in the next two weeks.')
    router.refresh()
  }
  return (
    <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button className="rs-btn rs-btn--go" onClick={draft} disabled={busy}>{busy ? 'Drafting…' : 'Draft drive times'}</button>
      {msg ? <span role="status" style={{ fontSize: 13.5 }}>{msg}</span> : null}
    </span>
  )
}
