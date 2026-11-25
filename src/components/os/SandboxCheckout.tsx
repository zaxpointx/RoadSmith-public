'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SandboxCheckout({ token, amount }: { token: string; amount: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function pay(outcome: 'paid' | 'declined') {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/os/pay/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }) })
    setBusy(false)
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? 'Payment could not be processed.')
    router.refresh()
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <button className="rs-btn rs-btn--go" style={{ minHeight: 48, fontSize: 16 }} disabled={busy} onClick={() => pay('paid')}>Pay {amount} with a test card</button>
      <button className="rs-btn" disabled={busy} onClick={() => pay('declined')}>Simulate a declined card</button>
      {error ? <p className="rs-result rs-result--err" role="alert">{error}</p> : null}
    </div>
  )
}
