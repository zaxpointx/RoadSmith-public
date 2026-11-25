'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function EnterSandbox({ label = 'Enter the Control Center', next = '/app' }: { label?: string; next?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function go() {
    setBusy(true)
    const res = await fetch('/api/os/session', { method: 'POST' })
    if (!res.ok) { setBusy(false); setError((await res.json().catch(() => ({}))).error ?? 'Could not sign in.'); return }
    router.push(next)
    router.refresh()
  }
  return (
    <>
      <button className="rs-btn rs-btn--go" onClick={go} disabled={busy}>{busy ? 'Opening…' : label}</button>
      {error ? <p className="rs-result rs-result--err" role="alert">{error}</p> : null}
    </>
  )
}
