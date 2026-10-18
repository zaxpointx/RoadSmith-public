'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, CreditCard, TrendingUp, Users, Briefcase } from 'lucide-react'

type ReportState = {
  monthlyRevenue: number
  activeSessions: number
  completionRate: number
  totalStudents: number
  pendingBookings: number
  needsReminder: number
  openSeats: number
  balancesDue: number
  instructorsOnDuty: number
  utilizationRate: number
}

/**
 * Derive a coarse seat-utilization rate from operational metrics.
 * The production API does not return a precomputed `instructorUtilization`
 * field, so we estimate: utilization = 100 * (seatsBooked / (openSeats + seatsBooked)).
 * `seatsBooked` is not exposed directly, but `openSeats` represents the gap;
 * we treat openSeats as the unfilled portion and assume a healthy target.
 */
function computeUtilizationRate(ops: {
  openSeats?: number
  todaysLessons?: number
  activeSessions?: number
}): number {
  const open = Number(ops?.openSeats ?? 0)
  const todays = Number(ops?.todaysLessons ?? 0)
  const active = Number(ops?.activeSessions ?? 0)
  if (open + todays <= 0) return 0
  // Today's filled seats vs today's + open inventory is a reasonable proxy.
  const total = open + Math.max(todays, active)
  if (total <= 0) return 0
  return Math.round((Math.max(todays, active) / total) * 100)
}

function fmtCurrency(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<ReportState>({
    monthlyRevenue: 0,
    activeSessions: 0,
    completionRate: 0,
    totalStudents: 0,
    pendingBookings: 0,
    needsReminder: 0,
    openSeats: 0,
    balancesDue: 0,
    instructorsOnDuty: 0,
    utilizationRate: 0,
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/school-admin/dashboard/summary', {
          credentials: 'same-origin',
        })
        if (!res.ok) return
        const data = await res.json()
        const stats = data?.stats ?? {}
        const ops = data?.operationalMetrics ?? {}
        setReports({
          monthlyRevenue: stats.monthlyRevenue ?? 0,
          activeSessions: stats.activeSessions ?? 0,
          completionRate: stats.completionRate ?? 0,
          totalStudents: stats.totalStudents ?? 0,
          pendingBookings: ops.pendingBookings ?? 0,
          needsReminder: ops.studentsNeedAction ?? 0,
          openSeats: ops.openSeats ?? 0,
          balancesDue: ops.balancesDue ?? 0,
          instructorsOnDuty: ops.instructorsOnDuty ?? 0,
          // Production API does not return a precomputed utilization rate; derive
          // a coarse one from open vs total seats so the card still renders sensibly.
          utilizationRate: computeUtilizationRate(ops),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // The hero — Monthly revenue. Visually the dominant tile, the way
  // Stripe / Mercury / Mercury-style banking apps treat the top number.
  const hero = {
    label: 'Monthly revenue',
    value: loading ? '—' : fmtCurrency(reports.monthlyRevenue),
    currency: true,
    note: 'Confirmed deposits this month',
    icon: CreditCard,
  }

  // Secondary metrics — the rest of the business health picture.
  const secondary = [
    {
      label: 'Outstanding balances',
      value: loading ? '—' : fmtCurrency(reports.balancesDue),
      currency: true,
      note: 'Pending deposits and follow-up',
      icon: TrendingUp,
      tone: 'amber' as const,
    },
    {
      label: 'Active sessions',
      value: loading ? '—' : reports.activeSessions.toLocaleString(),
      note: 'Scheduled or booked capacity',
      icon: Calendar,
      tone: 'blue' as const,
    },
    {
      label: 'Open capacity',
      value: loading ? '—' : reports.openSeats.toLocaleString(),
      note: 'Seats still available to sell',
      icon: Calendar,
      tone: 'blue' as const,
    },
    {
      label: 'Active students',
      value: loading ? '—' : reports.totalStudents.toLocaleString(),
      note: 'Driver-ed student records',
      icon: Users,
      tone: 'blue' as const,
    },
    {
      label: 'Completion rate',
      value: loading ? '—' : `${reports.completionRate}%`,
      note: 'Completed vs scheduled sessions',
      icon: TrendingUp,
      tone: 'green' as const,
    },
    {
      label: 'Instructor utilization',
      value: loading ? '—' : `${reports.utilizationRate}%`,
      note: 'Lessons filled vs available slots',
      icon: Briefcase,
      tone: 'teal' as const,
    },
  ]

  const toneClass: Record<string, string> = {
    green: 'report-card-tone-green',
    amber: 'report-card-tone-amber',
    purple: 'report-card-tone-purple',
    blue: 'report-card-tone-blue',
    teal: 'report-card-tone-teal',
  }

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <p className="reports-eyebrow">Financial overview</p>
          <h1 className="reports-title">Reports</h1>
          <p className="reports-subtitle">Business health for the school owner demo.</p>
        </div>
        <Link href="/school-admin" className="reports-back-btn">
          Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* HERO: Monthly revenue — the biggest tile, treated like a bank balance */}
      <section className="reports-hero-card" data-testid="reports-hero-revenue">
        <div className="reports-hero-head">
          <div>
            <p className="reports-hero-label">{hero.label}</p>
            <p className="reports-hero-sub">{hero.note}</p>
          </div>
          <span className="reports-hero-icon" aria-hidden>
            <CreditCard className="w-5 h-5" />
          </span>
        </div>
        <div className="reports-hero-value">
          {hero.currency && <span className="reports-hero-currency">$</span>}
          {hero.value}
        </div>
        <div className="reports-hero-meta">
          <span className="reports-hero-chip reports-hero-chip-green">
            <span className="reports-hero-dot" /> Confirmed
          </span>
          <span className="reports-hero-meta-text">This month · to date</span>
        </div>
      </section>

      {/* Secondary grid */}
      <section className="reports-grid">
        {secondary.map(({ label, value, note, icon: Icon, tone, currency }) => (
          <div
            key={label}
            className={`report-card ${toneClass[tone] ?? ''}`}
            data-testid={`report-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="report-card-header">
              <p className="report-card-label">{label}</p>
              <Icon className="report-card-icon" />
            </div>
            <div>
              <div className="report-card-value">
                {currency && !loading && <span className="reports-hero-currency">$</span>}
                {value}
              </div>
              <p className="report-card-note">{note}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="report-insight-section">
        <p className="report-insight-eyebrow">Owner readout</p>
        <h2 className="report-insight-title">What you&apos;ll notice</h2>
        <div className="report-insight-grid">
          {[
            `${reports.pendingBookings} bookings need payment or confirmation follow-up.`,
            `${reports.needsReminder} upcoming sessions should get reminder messages.`,
            `${reports.instructorsOnDuty} instructors are active in today's operating schedule.`,
          ].map(item => (
            <div key={item} className="report-insight-item">
              {loading ? 'Loading report insight...' : item}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
