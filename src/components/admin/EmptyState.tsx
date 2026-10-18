import type { ReactNode } from 'react'
import Link from 'next/link'
import { Inbox, ArrowRight, type LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  cta?: { label: string; href: string; external?: boolean }
  secondary?: { label: string; href: string; external?: boolean }
  hint?: string
  compact?: boolean
  children?: ReactNode
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  cta,
  secondary,
  hint,
  compact = false,
  children,
}: EmptyStateProps) {
  const padding = compact ? '24px 20px' : '40px 28px'

  return (
    <div
      data-testid="empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding,
        gap: 12,
      }}
    >
      <div
        style={{
          width: compact ? 40 : 48,
          height: compact ? 40 : 48,
          borderRadius: '50%',
          background: 'rgba(74,222,128,0.08)',
          border: '1px solid rgba(74,222,128,0.20)',
          color: 'var(--status-active, #4ade80)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon style={{ width: compact ? 18 : 22, height: compact ? 18 : 22 }} />
      </div>
      <div>
        <p
          style={{
            fontSize: compact ? 13 : 14,
            fontWeight: 600,
            color: 'var(--admin-text, #F7FAF2)',
            margin: '0 0 4px',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {title}
        </p>
        {description && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--admin-text-muted, #727A6C)',
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 360,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {(cta || secondary) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {cta && (
            <Link
              href={cta.href}
              {...(cta.external ? { target: '_external', rel: 'noopener noreferrer' } : {})}
              className="dash-btn-primary"
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              {cta.label}
              <ArrowRight style={{ width: 12, height: 12 }} />
            </Link>
          )}
          {secondary && (
            <Link
              href={secondary.href}
              {...(secondary.external ? { target: '_external', rel: 'noopener noreferrer' } : {})}
              className="dash-btn-ghost"
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              {secondary.label}
            </Link>
          )}
        </div>
      )}

      {hint && (
        <p
          style={{
            fontSize: 11,
            color: 'var(--admin-text-muted, #727A6C)',
            margin: '6px 0 0',
            fontStyle: 'italic',
          }}
        >
          {hint}
        </p>
      )}

      {children}
    </div>
  )
}
