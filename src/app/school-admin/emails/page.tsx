'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  CircleDashed,
  AlertCircle,
  Clock,
  Inbox,
  Search,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

type EmailType =
  | 'booking-confirmation'
  | 'reminder-48h'
  | 'reminder-4h'
  | 'welcome'
  | 'session-completed'
  | 'payment-receipt'
  | 'balance-due'
  | 'certificate-issued'
  | 'instructor-notify'

type EmailStatus = 'sent' | 'stub' | 'failed' | 'queued'

type AuditEmail = {
  id: string
  template: EmailType
  templateLabel: string
  recipient: string
  recipientEmail: string
  subject: string
  preview: string
  sentAt: string
  status: EmailStatus
  channel: 'email' | 'sms' | 'both'
  relatedEntity: { type: 'booking' | 'student' | 'instructor' | 'school'; id: string | null; label: string }
  notes?: string
}

type Counts = {
  total: number
  sent: number
  stub: number
  failed: number
  queued: number
}

type ApiResponse = {
  school: { id: string; demo: boolean }
  emails: AuditEmail[]
  counts: Counts
  byTemplate: Record<string, number>
  providerConfigured: boolean
  auditMode: 'stub' | 'live'
  hasLogTable: boolean
  note: string
}

const TEMPLATE_TONE: Record<EmailType, string> = {
  'booking-confirmation': '#38BDF8',
  'reminder-48h': '#A78BFA',
  'reminder-4h': '#A78BFA',
  welcome: '#4ADE80',
  'session-completed': '#4ADE80',
  'payment-receipt': '#FBBF24',
  'balance-due': '#F97316',
  'certificate-issued': '#22D3EE',
  'instructor-notify': '#F472B6',
}

function formatRelative(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMs = nowMs - then
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function formatExact(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusPill(status: EmailStatus) {
  if (status === 'sent') {
    return (
      <span className="status-pill status-active">
        <span className="status-dot" /> Sent
      </span>
    )
  }
  if (status === 'stub') {
    return (
      <span className="status-pill status-pending">
        <span className="status-dot" /> Stub
      </span>
    )
  }
  if (status === 'queued') {
    return (
      <span className="status-pill status-pending" style={{ background: 'rgba(103,232,249,0.12)', color: '#67E8F9' }}>
        <span className="status-dot" /> Queued
      </span>
    )
  }
  return (
    <span className="status-pill status-cancelled">
      <span className="status-dot" /> Failed
    </span>
  )
}

function typeBadge(type: EmailType) {
  const color = TEMPLATE_TONE[type] ?? '#9CA3AF'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: `${color}1A`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {type}
    </span>
  )
}

export default function EmailsAuditPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EmailStatus | 'all'>('all')
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/school-admin/emails')
      if (!res.ok) throw new Error(`Failed to load email audit (${res.status})`)
      const json: ApiResponse = await res.json()
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load email audit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => { void load() })
  }, [])

  // Tick "now" every minute so relative timestamps stay fresh
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    if (!data) return [] as AuditEmail[]
    const q = search.trim().toLowerCase()
    return data.emails.filter((email) => {
      if (statusFilter !== 'all' && email.status !== statusFilter) return false
      if (!q) return true
      return (
        email.recipient.toLowerCase().includes(q) ||
        email.recipientEmail.toLowerCase().includes(q) ||
        email.subject.toLowerCase().includes(q) ||
        email.templateLabel.toLowerCase().includes(q) ||
        email.template.toLowerCase().includes(q)
      )
    })
  }, [data, search, statusFilter])

  const topTemplates = useMemo(() => {
    if (!data) return [] as { type: string; count: number }[]
    return Object.entries(data.byTemplate)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [data])

  return (
    <div className="command-page">
      <header className="command-page-head">
        <div>
          <p className="command-eyebrow">Audit · Outbound</p>
          <h1 className="command-page-title">Email audit &amp; demo inbox</h1>
          <p className="command-page-subtitle">
            Every template the system can send, who it would reach, and when the last one fired.
            ROA-24 audit covers booking confirmations, reminders, certificates, and operator notifications.
          </p>
        </div>
        <div className="command-action-row">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="command-button command-button-ghost"
            style={{ cursor: loading ? 'wait' : 'pointer' }}
          >
            <RefreshCw style={{ width: 14, height: 14, ...(loading ? { animation: 'spin 0.8s linear infinite' } : {}) }} />
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <Link href="/school-admin/settings" className="command-button command-button-ghost">
            Notification settings <ExternalLink style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </header>

      {error && (
        <section className="command-card">
          <p className="readiness-chip readiness-blocked">{error}</p>
        </section>
      )}

      {/* Audit-mode banner */}
      {data && (
        <section
          className="command-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 18px',
            borderColor: data.auditMode === 'live' ? 'rgba(74,222,128,0.35)' : 'rgba(251,191,36,0.35)',
            background: data.auditMode === 'live' ? 'rgba(74,222,128,0.06)' : 'rgba(251,191,36,0.06)',
          }}
        >
          <div
            className="command-icon-box"
            style={{
              background: data.auditMode === 'live' ? '#4ADE80' : '#FBBF24',
              color: '#0a0a0f',
              flexShrink: 0,
            }}
          >
            {data.auditMode === 'live' ? <CheckCircle2 style={{ width: 20, height: 20 }} /> : <CircleDashed style={{ width: 20, height: 20 }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--command-text)' }}>
              {data.auditMode === 'live' ? 'Live mode · Resend connected' : 'Audit / stub mode · Resend key not set'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--command-muted)', marginTop: 4 }}>
              {data.note}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--command-muted)' }}>
            <span>Provider:&nbsp;</span>
            <span style={{ color: data.providerConfigured ? '#4ADE80' : '#FBBF24', fontWeight: 700 }}>
              {data.providerConfigured ? 'Resend' : 'Console stub'}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>Log table:&nbsp;</span>
            <span style={{ color: data.hasLogTable ? '#4ADE80' : '#9CA3AF', fontWeight: 700 }}>
              {data.hasLogTable ? 'present' : 'not yet'}
            </span>
          </div>
        </section>
      )}

      {/* Summary metrics */}
      <section
        className="command-grid"
        style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
      >
        {[
          {
            label: 'Total audited',
            value: data?.counts.total ?? 0,
            note: 'Templates + recent sends',
            icon: Inbox,
            tone: 'green',
          },
          {
            label: 'Sent (live)',
            value: data?.counts.sent ?? 0,
            note: data?.providerConfigured ? 'Delivered via Resend' : 'Would send when key is live',
            icon: CheckCircle2,
            tone: 'teal',
          },
          {
            label: 'Stub / logged only',
            value: data?.counts.stub ?? 0,
            note: 'Console stub mode (no Resend)',
            icon: CircleDashed,
            tone: 'amber',
          },
          {
            label: 'Queued / future',
            value: data?.counts.queued ?? 0,
            note: 'Templates not yet wired to Resend',
            icon: Clock,
            tone: 'blue',
          },
        ].map(({ label, value, note, icon: Icon, tone }) => (
          <div key={label} className={`command-card command-tone-${tone}`}>
            <div className="command-metric-head">
              <div>
                <p className="command-eyebrow">{label}</p>
                <span className="command-metric-value">{loading ? '…' : value}</span>
              </div>
              <div className="command-icon-box">
                <Icon style={{ width: 18, height: 18 }} />
              </div>
            </div>
            <div className="command-metric-foot">
              <span>{note}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Audit log */}
      <section className="command-card">
        <div className="command-section-head" style={{ marginBottom: 14 }}>
          <div>
            <p className="command-eyebrow">Outbound log</p>
            <h2>Recent emails &amp; template inventory</h2>
          </div>
          <div className="command-action-row">
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--command-border)',
                borderRadius: 10,
                padding: '6px 10px',
                minWidth: 220,
              }}
            >
              <Search style={{ width: 14, height: 14, color: 'var(--command-muted)', marginRight: 6 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter recipient, subject, template…"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--command-text)',
                  fontSize: 13,
                  width: '100%',
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EmailStatus | 'all')}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--command-border)',
                borderRadius: 10,
                padding: '6px 10px',
                color: 'var(--command-text)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <option value="all">All statuses</option>
              <option value="sent">Sent</option>
              <option value="stub">Stub</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {loading && !data ? (
          <p style={{ color: 'var(--command-muted)', fontSize: 13 }}>Loading email audit…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--command-muted)', fontSize: 13 }}>
            No emails match this filter.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="command-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Related</th>
                  <th>Sent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((email) => (
                  <tr key={email.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{typeBadge(email.template)}</td>
                    <td>
                      <div style={{ color: 'var(--command-text)', fontWeight: 600 }}>
                        {email.recipient}
                      </div>
                      <div style={{ color: 'var(--command-muted)', fontSize: 12, marginTop: 2 }}>
                        {email.recipientEmail}
                      </div>
                    </td>
                    <td style={{ maxWidth: 360 }}>
                      <div style={{ color: 'var(--command-text)', fontWeight: 600 }}>{email.subject}</div>
                      <div
                        style={{
                          color: 'var(--command-muted)',
                          fontSize: 12,
                          marginTop: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {email.preview}
                      </div>
                      {email.notes && (
                        <div style={{ color: 'var(--command-muted)', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                          {email.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--command-muted)' }}>
                      <div style={{ fontSize: 12 }}>{email.relatedEntity.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{email.relatedEntity.type}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--command-muted)' }}>
                      <div style={{ fontSize: 12, color: 'var(--command-text)' }}>
                        {formatRelative(email.sentAt, nowMs)}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{formatExact(email.sentAt)}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{statusPill(email.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Template inventory breakdown */}
      {topTemplates.length > 0 && (
        <section className="command-card">
          <div className="command-section-head" style={{ marginBottom: 14 }}>
            <div>
              <p className="command-eyebrow">Inventory</p>
              <h2>Templates by volume</h2>
            </div>
            <span style={{ color: 'var(--command-muted)', fontSize: 12 }}>
              {topTemplates.length} template{topTemplates.length === 1 ? '' : 's'} on the audit
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topTemplates.map(({ type, count }) => {
              const max = topTemplates[0]?.count ?? 1
              const pct = Math.round((count / Math.max(max, 1)) * 100)
              const color = TEMPLATE_TONE[type as EmailType] ?? '#9CA3AF'
              return (
                <div
                  key={type}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 1fr 60px',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--command-text)', fontWeight: 600 }}>
                    {type}
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.04)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${color}, ${color}88)`,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--command-muted)',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {count}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Failures, if any */}
      {data && data.counts.failed > 0 && (
        <section className="command-card" style={{ borderColor: 'rgba(239,68,68,0.35)' }}>
          <div className="command-section-head">
            <div>
              <p className="command-eyebrow" style={{ color: '#F87171' }}>
                Failures
              </p>
              <h2 style={{ color: '#FCA5A5' }}>{data.counts.failed} failed send{data.counts.failed === 1 ? '' : 's'}</h2>
            </div>
            <AlertCircle style={{ width: 20, height: 20, color: '#F87171' }} />
          </div>
          <p style={{ color: 'var(--command-muted)', fontSize: 13, marginTop: 8 }}>
            Failed emails would surface here with retry actions. None detected in this audit window.
          </p>
        </section>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
