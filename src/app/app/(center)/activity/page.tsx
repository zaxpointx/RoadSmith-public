import Link from 'next/link'
import { requireSession } from '@/lib/os/center'
import { many } from '@/lib/os/db'
import { fmtWhen } from '@/lib/os/time'

const ACTOR: Record<string, string> = { agent: 'Assistant', staff: 'Staff', system: 'Automation', provider: 'Payment provider', contact: 'Contact' }

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ by?: string }> }) {
  const s = await requireSession()
  const sp = await searchParams
  const by = ['agent', 'staff', 'system', 'provider', 'contact'].includes(sp.by ?? '') ? sp.by! : null
  const rows = await many<{ id: number; actor_type: string; actor_label: string; action: string; target_type: string | null; detail: Record<string, unknown>; created_at: Date }>(s.db,
    `select id::int, actor_type, actor_label, action, target_type, detail, created_at from rs.audit_log where school_id = $1 and ($2::text is null or actor_type = $2) order by created_at desc, id desc limit 250`, [s.school.id, by])
  const runs = await many<{ engine: string; n: number; errors: number; avg_ms: number }>(s.db,
    `select engine, count(*)::int as n, count(error)::int as errors, coalesce(avg(latency_ms),0)::int as avg_ms from rs.agent_runs where school_id = $1 group by engine`, [s.school.id])
  return (
    <>
      <header className="rs-page-head">
        <div><h1>Activity</h1><p>The audit trail: every change, who or what made it, and the details. Nothing is edited after the fact.</p></div>
        <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} aria-label="Filter by actor">
          <Link className="rs-btn rs-btn--sm" href="/app/activity">Everything</Link>
          {Object.entries(ACTOR).map(([k, v]) => <Link key={k} className="rs-btn rs-btn--sm" href={`/app/activity?by=${k}`}>{v}</Link>)}
        </nav>
      </header>
      {runs.length ? <p style={{ marginBottom: 14, color: 'var(--muted)' }}>Assistant replies: {runs.map((r) => `${r.n} by ${r.engine === 'claude' ? 'Claude' : 'the built-in interpreter'} (avg ${(r.avg_ms / 1000).toFixed(1)}s${r.errors ? `, ${r.errors} errors` : ''})`).join('; ')}.</p> : null}
      <div className="rs-panel rs-table-wrap">
        <table className="rs-table">
          <thead><tr><th style={{ width: 190 }}>When</th><th style={{ width: 220 }}>Who</th><th>What</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtWhen(new Date(r.created_at), s.school.timezone)}</td>
                <td><span className="rs-tag">{ACTOR[r.actor_type]}</span><div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{r.actor_label}</div></td>
                <td><code style={{ fontSize: 13 }}>{r.action}</code></td>
                <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>{Object.entries(r.detail ?? {}).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length)).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="rs-empty">No activity yet.</p> : null}
      </div>
    </>
  )
}
