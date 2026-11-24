'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface InboxItemView {
  id: string; kind: 'approval' | 'escalation' | 'alert'; priority: 'normal' | 'urgent'; title: string; detail: string
  hasAction: boolean; conversationId: string | null; age: string
}

export function InboxItem({ item }: { item: InboxItemView }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState('')
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  async function decide(decision: 'approve' | 'decline' | 'resolve') {
    setBusy(true)
    setResult(null)
    const res = await fetch(`/api/os/inbox/${item.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, reply: reply || undefined }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setResult({ ok: false, text: data.error ?? 'That did not work.' }); return }
    setResult({ ok: true, text: data.result ?? (decision === 'decline' ? 'Declined.' : 'Marked handled.') })
    setTimeout(() => router.refresh(), 900)
  }
  const diamond = item.priority === 'urgent' ? 'rs-diamond rs-diamond--urgent' : item.kind === 'alert' ? 'rs-diamond rs-diamond--alert' : 'rs-diamond'
  const canReply = Boolean(item.conversationId) && item.kind !== 'approval'
  return (
    <article className="rs-item">
      <span className={diamond} aria-hidden="true" />
      <div>
        <h3>{item.title}</h3>
        {item.detail ? <p className="rs-item-detail">{item.detail}</p> : null}
        <p className="rs-item-meta">
          {item.priority === 'urgent' ? <span className="rs-tag rs-tag--stop">Urgent</span> : null}{' '}
          {item.kind === 'approval' ? 'Waiting for your approval' : item.kind === 'escalation' ? 'Passed to you by the assistant' : 'Heads-up'} · {item.age}
          {item.conversationId ? <> · <Link href={`/app/conversations?c=${item.conversationId}`}>Open conversation</Link></> : null}
        </p>
        {canReply ? (
          <div style={{ marginTop: 10 }}>
            <label className="rs-visually-hidden" htmlFor={`reply-${item.id}`}>Reply to the customer</label>
            <textarea id={`reply-${item.id}`} className="rs-textarea" placeholder="Reply by text (optional) — sent from the school's number" value={reply} onChange={(e) => setReply(e.target.value)} />
          </div>
        ) : null}
        <div className="rs-item-actions">
          {item.hasAction ? (
            <>
              <button className="rs-btn rs-btn--go" disabled={busy} onClick={() => decide('approve')}>Approve</button>
              <button className="rs-btn" disabled={busy} onClick={() => decide('decline')}>Decline</button>
            </>
          ) : (
            <button className="rs-btn rs-btn--go" disabled={busy} onClick={() => decide('resolve')}>{reply ? 'Send reply and mark handled' : 'Mark handled'}</button>
          )}
        </div>
        {result ? <p className={result.ok ? 'rs-result' : 'rs-result rs-result--err'} role="status">{result.text}</p> : null}
      </div>
    </article>
  )
}
