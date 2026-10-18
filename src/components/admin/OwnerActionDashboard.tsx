'use client'

import { useEffect, useState } from 'react'

type OwnerActions = {
  pendingBookings: number
  emptySlots: number
  balancesDue: number
  parentsToContact: number
}

type Props = {
  className?: string
}

type OperationalMetrics = {
  todaysLessons?: number
  pendingBookings?: number
  openSeats?: number
  balancesDue?: number
  studentsNeedAction?: number
  instructorsOnDuty?: number
  complianceReady?: number
}

type SummaryResponse = {
  operationalMetrics?: OperationalMetrics
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function OwnerActionDashboard({ className }: Props) {
  const [actions, setActions] = useState<OwnerActions>({
    pendingBookings: 0,
    emptySlots: 0,
    balancesDue: 0,
    parentsToContact: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/school-admin/dashboard/summary', {
          credentials: 'same-origin',
        })
        if (!res.ok) return
        const data = (await res.json()) as SummaryResponse
        if (cancelled) return
        const metrics = data.operationalMetrics ?? {}
        setActions({
          pendingBookings: Number(metrics.pendingBookings ?? 0),
          emptySlots: Number(metrics.openSeats ?? 0),
          balancesDue: Number(metrics.balancesDue ?? 0),
          parentsToContact: Number(metrics.studentsNeedAction ?? 0),
        })
      } catch {
        // Swallow network errors so the rest of the dashboard still renders.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const rows = [
    { label: 'Pending bookings need confirmation', count: actions.pendingBookings, tone: 'amber' },
    { label: 'Empty slots to fill this week', count: actions.emptySlots, tone: 'blue' },
    { label: 'Balances due from families', count: formatCurrency(actions.balancesDue), tone: 'red' },
    { label: 'Parents to contact for reminders', count: actions.parentsToContact, tone: 'green' },
  ]

  return (
    <section className={`dash-card ${className ?? ''}`}>
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Today</p>
          <h2 className="dash-section-title">Action items</h2>
        </div>
      </div>
      <div>
        {loading ? (
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Loading...</p>
        ) : rows.map(({ label, count, tone }) => (
          <div key={label} className="dash-action-item">
            <span className={`dash-feed-dot dash-status-dot ${tone}`} />
            <span className="dash-action-text">{label}</span>
            <span className="dash-action-count">{count}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
