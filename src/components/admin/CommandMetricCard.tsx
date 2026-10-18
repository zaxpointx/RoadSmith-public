import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

type CommandMetricCardProps = {
  label: string
  /** The number/text to display. If `currency` is provided, the value
   *  is rendered with a small muted "$" prefix. */
  value: string | number
  note?: string
  /** A small status pill shown next to the note (e.g. "Live", "+12%"). */
  delta?: string
  tone?: 'green' | 'teal' | 'blue' | 'amber' | 'red'
  icon?: LucideIcon
  wide?: boolean
  /** When true, prefixes the value with a small "$" glyph. */
  currency?: boolean
}

const TONE_ICON_COLORS: Record<string, string> = {
  green: 'var(--status-active)',
  teal: 'var(--status-active)',
  blue: 'var(--status-blue)',
  amber: 'var(--accent-secondary)',
  red: 'var(--danger)',
}

/**
 * CommandMetricCard — the hero KPI tile.
 * Visual hierarchy (fintech pattern):
 *   LABEL (small, uppercase, muted)
 *   VALUE (huge, tabular, the hero element)
 *   NOTE + DELTA (small, muted context line)
 *
 * The left edge of the card carries a thin 2px color rail whose color is
 * driven by the `tone` prop — the same "quiet signal" pattern that Stripe
 * and Mercury use to categorize KPIs at a glance.
 */
export default function CommandMetricCard({
  label,
  value,
  note,
  delta,
  tone = 'green',
  icon: Icon,
  wide = false,
  currency = false,
}: CommandMetricCardProps) {
  const toneClass = `dash-kpi-tone-${tone}`
  // Format numeric values with thousands separators for a real "finance" feel.
  // Strings (already-formatted) pass through untouched.
  let renderedValue: ReactNode
  if (typeof value === 'number') {
    renderedValue = value.toLocaleString('en-US')
  } else {
    renderedValue = value
  }

  return (
    <div className={`dash-kpi ${toneClass}${wide ? ' dash-kpi-wide' : ''}`}>
      <div className="dash-kpi-header">
        <p className="dash-kpi-label">{label}</p>
        {Icon && (
          <Icon
            style={{
              width: 14,
              height: 14,
              color: TONE_ICON_COLORS[tone],
              flexShrink: 0,
            }}
          />
        )}
      </div>
      <strong className="dash-kpi-value">
        {currency && <span className="dash-kpi-currency">$</span>}
        {renderedValue}
      </strong>
      {(note || delta) && (
        <div className="dash-kpi-note-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {note && <span className="dash-kpi-note">{note}</span>}
          {delta && <span className={`dash-kpi-delta ${tone}`}>{delta}</span>}
        </div>
      )}
    </div>
  )
}
