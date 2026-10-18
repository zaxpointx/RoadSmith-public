'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Calendar,
  Car,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LucideIcon,
  Mail,
  MapPin,
  Menu,
  Search,
  Settings,
  X,
} from 'lucide-react'

type NavItem = {
  icon: LucideIcon
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/school-admin' },
  { icon: GraduationCap, label: 'Students', href: '/school-admin/students' },
  { icon: Calendar, label: 'Sessions', href: '/school-admin/sessions' },
  { icon: Car, label: 'Instructors', href: '/school-admin/instructors' },
  { icon: Clock, label: 'Calendar', href: '/school-admin/calendar' },
  { icon: BarChart3, label: 'Reports', href: '/school-admin/reports' },
  { icon: FileText, label: 'Compliance', href: '/school-admin/compliance' },
  { icon: Mail, label: 'Emails', href: '/school-admin/emails' },
  { icon: DollarSign, label: 'Billing', href: '/school-admin/billing' },
  { icon: Settings, label: 'Settings', href: '/school-admin/settings' },
]

function isActive(href: string, pathname: string) {
  if (href === '/school-admin') return pathname === '/school-admin' || pathname === '/school-admin/'
  return pathname.startsWith(href)
}

type SchoolMeta = {
  schoolName: string
  schoolCity: string
  instructorsToday: number
  isLive: boolean
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [meta, setMeta] = useState<SchoolMeta>({
    schoolName: '',
    schoolCity: '',
    instructorsToday: 0,
    isLive: false,
  })

  useEffect(() => {
    async function loadSchoolMeta() {
      try {
        const res = await fetch('/api/school-admin/dashboard/summary')
        if (!res.ok) return
        const data = await res.json()
        setMeta({
          schoolName: data.school?.name ?? 'Driving Center',
          schoolCity: data.school?.city ?? '',
          instructorsToday: data.operationalMetrics?.instructorsOnDuty ?? 0,
          isLive: (data.operationalMetrics?.todaysLessons ?? 0) > 0,
        })
      } catch {
        setMeta((current) => current)
      }
    }
    loadSchoolMeta()
  }, [])

  return (
    <div className="dash-shell">
      {sidebarOpen && (
        <button
          className="dash-sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`dash-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="dash-sidebar-brand">
          <Link href="/school-admin" className="dash-brand-link" onClick={() => setSidebarOpen(false)}>
            <span className="dash-brand-mark">
              <Car />
            </span>
            <span>
              <div className="dash-brand-name">Roadsmith</div>
            </span>
          </Link>
          <button
            className="dash-sidebar-close"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>

        <div className="dash-search">
          <Search />
          <span>Search students</span>
          <kbd>/</kbd>
        </div>

        <nav className="dash-nav">
          {NAV_ITEMS.map(({ icon: NavIcon, label, href }) => {
            const active = isActive(href, pathname)
            return (
              <Link
                key={label}
                href={href}
                className={`dash-nav-item${active ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <NavIcon />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="dash-sidebar-footer">
          <div className="dash-school-card">
            <div className="dash-school-name">
              {meta.schoolName || 'Loading school...'}
              {meta.isLive && (
                <span className="dash-live-status">
                  <span className="dash-status-dot green" />
                  <span>Live</span>
                </span>
              )}
            </div>
            {meta.schoolCity && (
              <div className="dash-school-meta dash-school-location">
                <MapPin />
                {meta.schoolCity}
              </div>
            )}
            <div className="dash-school-meta dash-school-schedule">
              {meta.instructorsToday > 0
                ? `${meta.instructorsToday} instructor${meta.instructorsToday === 1 ? '' : 's'} active today`
                : 'No sessions scheduled today'}
            </div>
          </div>
        </div>
      </aside>

      <nav className="dash-mobile-nav" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ icon: NavIcon, label, href }) => (
          <Link
            key={label}
            href={href}
            title={label}
            className={isActive(href, pathname) ? 'active' : ''}
          >
            <NavIcon />
            {label}
          </Link>
        ))}
      </nav>

      <button
        className="dash-mobile-menu-btn"
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </button>

      <main className="dash-main">{children}</main>
    </div>
  )
}
