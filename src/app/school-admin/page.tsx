'use client';

import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays, CheckCircle2, CreditCard, FileText, Plus, Settings2, Sparkles, Users, WalletCards,
} from 'lucide-react'
import CommandMetricCard from '@/components/admin/CommandMetricCard'
import DashboardCustomizer, { DashboardWidget } from '@/components/admin/DashboardCustomizer'
import ComplianceReadinessCard from '@/components/admin/ComplianceReadinessCard'
import EmptyState from '@/components/admin/EmptyState'
import RecentActivityFeed, { ActivityItem } from '@/components/admin/RecentActivityFeed'
import OwnerActionDashboard from '@/components/admin/OwnerActionDashboard'
import SentEmailsPanel from '@/components/admin/SentEmailsPanel'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopBar } from '@/components/dashboard/TopBar'
import { WelcomeCard } from '@/components/dashboard/WelcomeCard'
import { RecentBookingsCard, ActivationChecklist } from '@/components/dashboard/ActivationWidgets'

type DemoCookie = { schoolId?: string; schoolName?: string; email?: string }
function readDemoCookie(): DemoCookie | null {
  if (typeof document === 'undefined') return null
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('demo_user='))
    ?.split('=')[1]
  if (!raw) return null
  try {
    return JSON.parse(atob(raw)) as DemoCookie
  } catch {
    return null
  }
}

type ActivationStep = { key: string; label: string; done: boolean; href: string; icon: string }

type Summary = {
  school?: { name?: string; slug?: string }
  stats?: { totalStudents: number; monthlyRevenue: number; completionRate: number; activeSessions: number }
  operationalMetrics?: {
    todaysLessons: number; pendingBookings: number; openSeats: number; balancesDue: number
    studentsNeedAction: number; instructorsOnDuty: number; complianceReady: number
  }
  widgets?: { widget_key: string; enabled: boolean; display_order: number; size?: string }[]
  upcomingSessions?: unknown[]
  recentBookings?: unknown[]
  complianceRollup?: Parameters<typeof ComplianceReadinessCard>[0]['rollups']
  complianceReadiness?: {
    totalStudents: number; fullyReady: number; fullyCompletePct: number; formReadyPct: number
    totalFormChecks: number; readyChecks: number; needsInfoChecks: number; blockedChecks: number
    studentsBlocked: number; studentsNeedingInfo: number
    missingDocuments: { label: string; count: number }[]
  }
  activationProgress?: { steps: ActivationStep[]; completedCount: number; totalCount: number }
}

const WIDGET_ORDER: string[] = [
  'monthly_revenue', 'todays_lessons', 'pending_bookings', 'open_seats',
  'balances_due', 'students_need_action', 'compliance_ready', 'completion_rate',
]

const WIDGET_LABELS: Record<string, string> = {
  todays_lessons: "Today's lessons", pending_bookings: 'Pending bookings',
  open_seats: 'Open seats', balances_due: 'Balances due',
  students_need_action: 'Student cleanup', compliance_ready: 'Compliance ready',
  monthly_revenue: 'Monthly revenue', completion_rate: 'Completion rate',
}

const DEFAULT_SUMMARY: Summary = {
  stats: { totalStudents: 0, monthlyRevenue: 0, completionRate: 0, activeSessions: 0 },
  operationalMetrics: {
    todaysLessons: 0, pendingBookings: 0, openSeats: 0, balancesDue: 0,
    studentsNeedAction: 0, instructorsOnDuty: 0, complianceReady: 0,
  },
  widgets: Object.keys(WIDGET_LABELS).map((widget_key, index) => ({ widget_key, enabled: true, display_order: index })),
  upcomingSessions: [], recentBookings: [], complianceRollup: [],
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function SchoolAdminCommandCenter() {
  const router = useRouter()
  const initialDemo = useMemo<DemoCookie | null>(() => readDemoCookie(), [])
  const isDemo = Boolean(initialDemo?.schoolId)
  const [summary, setSummary] = useState<Summary>(DEFAULT_SUMMARY)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [savingWidgets, setSavingWidgets] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true)
    try {
      const [summaryRes, activityRes] = await Promise.all([
        fetch('/api/school-admin/dashboard/summary', { cache: 'no-store' }),
        fetch('/api/school-admin/activity', { cache: 'no-store' }),
      ])
      if (summaryRes.status === 404) { router.replace('/onboarding?new=1'); return }
      if (summaryRes.ok) {
        const data: Summary = await summaryRes.json()
        const merged: Summary = { ...DEFAULT_SUMMARY, ...data }
        setSummary(merged)
        const widgetList = merged.widgets ?? DEFAULT_SUMMARY.widgets ?? []
        setWidgets(widgetList.map((widget, index) => ({
          key: widget.widget_key, label: WIDGET_LABELS[widget.widget_key] ?? widget.widget_key,
          enabled: widget.enabled, display_order: widget.display_order ?? index,
        })))
        setLastUpdated(new Date())
      }
      if (activityRes.ok) {
        const data: { activity?: ActivityItem[] } = await activityRes.json()
        setActivity(data.activity ?? [])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const initial = window.setTimeout(() => { load() }, 0)
    const handleBookingsChanged = () => { load({ silent: true }) }
    const handleStorage = (e: StorageEvent) => { if (e.key === 'school-admin:bookings-changed') load({ silent: true }) }
    window.addEventListener('school-admin:bookings-changed', handleBookingsChanged)
    window.addEventListener('storage', handleStorage)
    const interval = window.setInterval(() => { load({ silent: true }) }, 15000)
    const handleVisibility = () => { if (document.visibilityState === 'visible') load({ silent: true }) }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearTimeout(initial)
      window.removeEventListener('school-admin:bookings-changed', handleBookingsChanged)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(interval)
    }
  }, [load])

  const visibleWidgetKeys = useMemo(() => {
    const enabled = new Set(widgets.filter((widget) => widget.enabled).map((widget) => widget.key))
    const ordered: string[] = []
    for (const key of WIDGET_ORDER) { if (enabled.has(key)) ordered.push(key) }
    widgets.filter((w) => w.enabled && !WIDGET_ORDER.includes(w.key))
      .sort((a, b) => a.display_order - b.display_order).forEach((w) => ordered.push(w.key))
    return ordered
  }, [widgets])

  const metrics = summary.operationalMetrics ?? DEFAULT_SUMMARY.operationalMetrics!
  const stats = summary.stats ?? DEFAULT_SUMMARY.stats!

  const cards: Record<string, ReactNode> = {
    todays_lessons: (<CommandMetricCard label="Today's lessons" value={metrics.todaysLessons} note={`${metrics.instructorsOnDuty} instructors on duty`} delta="Live" tone="green" icon={CalendarDays} />),
    pending_bookings: (<CommandMetricCard label="Pending bookings" value={metrics.pendingBookings} note="Need confirmation or payment" tone="amber" icon={WalletCards} />),
    open_seats: (<CommandMetricCard label="Open seats" value={metrics.openSeats} note="Sellable lesson capacity" tone="teal" icon={Plus} />),
    balances_due: (<CommandMetricCard label="Balances due" value={Math.round(metrics.balancesDue)} currency note="Outstanding student balances" tone="red" icon={CreditCard} />),
    students_need_action: (<CommandMetricCard label="Student cleanup" value={metrics.studentsNeedAction} note={`${stats.totalStudents} total students`} tone="blue" icon={Users} />),
    compliance_ready: (<CommandMetricCard label="Compliance ready" value={`${summary.complianceReadiness?.fullyCompletePct ?? 0}%`} note={summary.complianceReadiness ? `${summary.complianceReadiness.fullyReady}/${summary.complianceReadiness.totalStudents} students fully compliant` : 'Form readiness signals'} tone={(summary.complianceReadiness?.fullyCompletePct ?? 0) >= 80 ? 'green' : (summary.complianceReadiness?.fullyCompletePct ?? 0) >= 50 ? 'amber' : 'red'} icon={FileText} />),
    monthly_revenue: (<CommandMetricCard label="Monthly revenue" value={Math.round(stats.monthlyRevenue)} currency note="Confirmed deposits this month" tone="teal" icon={CreditCard} />),
    completion_rate: (<CommandMetricCard label="Completion rate" value={`${stats.completionRate}%`} note={`${stats.activeSessions} active sessions`} tone="green" icon={CheckCircle2} />),
  }

  function toggleWidget(key: string) {
    setWidgets((current) => current.map((widget) => widget.key === key ? { ...widget, enabled: !widget.enabled } : widget))
  }
  async function saveWidgets() {
    setSavingWidgets(true)
    const res = await fetch('/api/school-admin/dashboard/summary', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets: widgets.map((widget) => ({ widget_key: widget.key, enabled: widget.enabled, display_order: widget.display_order, size: 'normal' })) }),
    })
    setSavingWidgets(false)
    if (res.ok) setCustomizerOpen(false)
  }

  const schoolName = summary.school?.name ?? initialDemo?.schoolName ?? (loading ? 'Loading school…' : 'School admin')

  const topStats = [
    { label: 'Active students', value: stats.totalStudents, delta: '+8 this week', direction: 'up' as const },
    { label: 'Sessions this week', value: metrics.todaysLessons, delta: '+12% vs last', direction: 'up' as const },
    { label: 'Hours logged', value: '128', delta: '+18%', direction: 'up' as const },
    { label: 'Revenue MTD', value: currency(stats.monthlyRevenue), delta: '+22%', direction: 'up' as const },
  ]

  return (
    <div className="rs-dash-shell">
      <Sidebar />
      <main className="rs-dash-main">
        <WelcomeCard
          greeting={<>Welcome back, <span className="rs-dash-welcome-school">{schoolName}</span></>}
          description={isDemo ? `Live demo data for ${schoolName} — students, instructors, sessions, and bookings are all seeded and editable.` : 'Scheduling, payments, student readiness, and Tennessee compliance in one operating view.'}
          cta={
            <>
              <Link className="rs-cta rs-cta-ghost" href="/school-admin/calendar"><CalendarDays size={14} /> Open calendar</Link>
              <button className="rs-cta rs-cta-primary" type="button" onClick={() => setCustomizerOpen(true)}><Settings2 size={14} /> Customize</button>
            </>
          }
        />

        <TopBar stats={topStats} />

        {loading ? (
          <div className="dash-loading">Loading command center...</div>
        ) : (
          <>
            {summary.activationProgress && <ActivationChecklist progress={summary.activationProgress} />}

            {!isDemo && stats.totalStudents === 0 ? (
              <section className="dash-card dash-card-padded">
                <EmptyState icon={Sparkles} title="Welcome — let's get your first booking"
                  description="Set up your session types, connect Stripe, and share your booking link. Most schools are taking reservations within 30 minutes."
                  cta={{ label: 'Finish setup', href: '/school-admin/settings' }}
                  secondary={{ label: 'View onboarding guide', href: '/school-admin/onboarding' }}
                  hint="Already have students? Import them from a CSV in the Students tab." />
              </section>
            ) : (
              <>
                <div className="dash-kpi-grid">
                  {visibleWidgetKeys.map((key) => cards[key] ? <div key={key}>{cards[key]}</div> : null)}
                </div>
                <RecentBookingsCard bookings={(summary.recentBookings ?? []) as Parameters<typeof RecentBookingsCard>[0]['bookings']} lastUpdated={lastUpdated} onRefresh={() => load({ silent: true })} />
                <div className="dash-two-col">
                  <OwnerActionDashboard />
                  <RecentActivityFeed items={activity} />
                </div>
                <SentEmailsPanel />
                {summary.complianceRollup && summary.complianceRollup.length > 0 && <ComplianceReadinessCard rollups={summary.complianceRollup as Parameters<typeof ComplianceReadinessCard>[0]['rollups']} />}
              </>
            )}
          </>
        )}

        <DashboardCustomizer open={customizerOpen} widgets={widgets} saving={savingWidgets} onClose={() => setCustomizerOpen(false)} onToggle={toggleWidget} onApply={saveWidgets} />
      </main>
    </div>
  )
}
