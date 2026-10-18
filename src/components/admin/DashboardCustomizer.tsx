'use client'

import { X, SlidersHorizontal } from 'lucide-react'

export type DashboardWidget = {
  key: string
  label: string
  enabled: boolean
  display_order: number
}

type DashboardCustomizerProps = {
  open: boolean
  widgets: DashboardWidget[]
  saving?: boolean
  onClose: () => void
  onToggle: (key: string) => void
  onApply: () => void
}

export default function DashboardCustomizer({
  open,
  widgets,
  saving,
  onClose,
  onToggle,
  onApply,
}: DashboardCustomizerProps) {
  if (!open) return null

  const enabledCount = widgets.filter((widget) => widget.enabled).length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      role="presentation"
    >
      <section
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-customizer-title"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <div>
            <h2
              id="dashboard-customizer-title"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--admin-text)',
                marginBottom: 4,
              }}
            >
              Customize dashboard
            </h2>
            <p style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
              {enabledCount}/{widgets.length} widgets visible
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dashboard customizer"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--admin-text-muted)',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              transition: 'background 0.15s',
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Widget toggles */}
        <div style={{ padding: '8px 16px' }}>
          {widgets.map((widget, index) => (
            <button
              key={widget.key}
              type="button"
              onClick={() => onToggle(widget.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 8px',
                background: widget.enabled ? 'rgba(166,255,63,0.06)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--admin-border)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: widget.enabled ? 'var(--admin-accent)' : 'var(--admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: widget.enabled ? '#000' : 'var(--admin-text-muted)',
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  color: widget.enabled ? 'var(--admin-text)' : 'var(--admin-text-secondary)',
                }}
              >
                {widget.label}
              </span>
              {/* Toggle switch */}
              <span
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: widget.enabled ? 'var(--admin-accent)' : 'var(--admin-border)',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: widget.enabled ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: widget.enabled ? '#000' : 'var(--admin-text-muted)',
                    transition: 'left 0.2s',
                  }}
                />
              </span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '16px 24px 20px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="dash-btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={saving}
            className="dash-btn-primary"
          >
            <SlidersHorizontal style={{ width: 14, height: 14 }} />
            {saving ? 'Saving...' : 'Apply changes'}
          </button>
        </div>
      </section>
    </div>
  )
}
