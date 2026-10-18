'use client'

import { Activity } from 'lucide-react'
import EmptyState from '@/components/admin/EmptyState'

export type ActivityItem = {
  id: string
  type: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'session_completed' | 'payment_received' | 'student_added' | 'compliance_update' | 'email_sent'
  message: string
  created_at: string
  metadata?: Record<string, string>
}

type Props = {
  items: ActivityItem[]
}

const DOT_COLORS: Record<string, string> = {
  booking_created: 'blue',
  booking_confirmed: 'green',
  booking_cancelled: 'red',
  session_completed: 'green',
  payment_received: 'green',
  student_added: 'blue',
  compliance_update: 'amber',
  email_sent: 'blue',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function RecentActivityFeed({ items }: Props) {
  if (!items || items.length === 0) {
    return (
      <section className="dash-card">
        <div className="dash-section-head">
          <div>
            <p className="dash-eyebrow">Activity</p>
            <h2 className="dash-section-title">Recent events</h2>
          </div>
          <Activity style={{ width: 16, height: 16, color: 'var(--admin-text-muted)' }} />
        </div>
        <EmptyState
          compact
          icon={Activity}
          title="Quiet so far"
          description="New bookings, completed lessons, and compliance updates will show up here in real time."
          hint="Activity events are logged as students and instructors use the system."
        />
      </section>
    )
  }

  return (
    <section className="dash-card">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Activity</p>
          <h2 className="dash-section-title">Recent events</h2>
        </div>
        <Activity style={{ width: 16, height: 16, color: 'var(--admin-text-muted)' }} />
      </div>
      <div className="dash-feed-list">
        {items.slice(0, 6).map((item) => (
          <div key={item.id} className="dash-feed-item">
            <span className={`dash-feed-dot dash-status-dot ${DOT_COLORS[item.type] ?? 'blue'}`} />
            <div className="dash-feed-content">
              <p className="dash-feed-text">{item.message}</p>
              <p className="dash-feed-time">{timeAgo(item.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
