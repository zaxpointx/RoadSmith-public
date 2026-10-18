'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Email = {
  id: string
  recipient: string
  subject: string
  preview: string
  sentAt: string
}

type Props = {
  className?: string
}

export default function SentEmailsPanel({ className }: Props) {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/demo/emails')
        if (!res.ok) return
        const data = await res.json()
        setEmails(data.emails ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const visible = expanded ? emails : emails.slice(0, 3)

  return (
    <section className={`dash-card ${className ?? ''}`}>
      <div
        className="dash-section-head"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div>
          <p className="dash-eyebrow">Outbound</p>
          <h2 className="dash-section-title">Sent emails</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{emails.length}</span>
          {expanded
            ? <ChevronUp style={{ width: 14, height: 14, color: 'var(--admin-text-muted)' }} />
            : <ChevronDown style={{ width: 14, height: 14, color: 'var(--admin-text-muted)' }} />
          }
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Loading emails...</p>
      ) : emails.length === 0 ? (
        <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No emails sent yet.</p>
      ) : (
        visible.map((email) => (
          <div key={email.id} className="dash-email-card">
            <div className="dash-email-header">
              <span className="dash-email-recipient">{email.recipient}</span>
              <span className="dash-email-time">{email.sentAt}</span>
            </div>
            <div className="dash-email-subject">{email.subject}</div>
            <div className="dash-email-preview">{email.preview}</div>
          </div>
        ))
      )}
    </section>
  )
}
