'use client'

import { useEffect, useState } from 'react'
import { Calendar, ExternalLink } from 'lucide-react'
import NotificationSettingsPanel, { NotificationPreferences } from '@/components/admin/NotificationSettingsPanel'

const DEFAULT_PREFS: NotificationPreferences = {
  booking_confirmations: true,
  payment_alerts: true,
  session_reminders: true,
  instructor_schedule_changes: true,
  compliance_alerts: true,
  marketing_updates: false,
  reminder_48h: true,
  reminder_4h: true,
}

type SchoolSettings = {
  name?: string
  slug?: string
  phone?: string
  state?: string
  subscription_status?: string
  timezone?: string
  booking_min_notice_hours?: number
  booking_max_days_ahead?: number
}

export default function SchoolAdminSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS)
  const [school, setSchool] = useState<SchoolSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const [prefsRes, summaryRes] = await Promise.all([
        fetch('/api/school-admin/notification-preferences'),
        fetch('/api/school-admin/dashboard/summary'),
      ])
      if (prefsRes.ok) {
        const data = await prefsRes.json()
        setPreferences({ ...DEFAULT_PREFS, ...(data.preferences ?? {}) })
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSchool(data.school ?? {})
      }
      setLoading(false)
    }
    load()
  }, [])

  function changePreference(key: keyof NotificationPreferences, value: boolean) {
    setSaved(false)
    setPreferences((current) => ({ ...current, [key]: value }))
  }

  async function savePreferences() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/school-admin/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    })
    setSaving(false)
    setSaved(res.ok)
  }

  return (
    <div className="command-page">
      <header className="command-page-head">
        <div>
          <p className="command-eyebrow">Settings</p>
          <h1 className="command-page-title">School operations</h1>
          <p className="command-page-subtitle">Notification rules, booking windows, and school profile context.</p>
        </div>
        {saved && <span className="readiness-chip readiness-ready">Saved</span>}
      </header>

      {loading ? (
        <section className="command-card"><p className="command-muted">Loading settings...</p></section>
      ) : (
        <>
          <div className="command-two-column">
            <NotificationSettingsPanel
              preferences={preferences}
              saving={saving}
              onChange={changePreference}
              onSave={savePreferences}
            />

            <section className="command-card">
              <div className="command-section-head">
                <div>
                  <p className="command-eyebrow">School profile</p>
                  <h2>{school.name ?? 'Roadsmith'}</h2>
                </div>
              </div>
              <table className="command-table">
                <tbody>
                  <tr><th>Booking URL</th><td>{school.slug ? `/book/${school.slug}` : 'Not published'}</td></tr>
                  <tr><th>Phone</th><td>{school.phone || 'Not set'}</td></tr>
                  <tr><th>State</th><td>{school.state || 'TN'}</td></tr>
                  <tr><th>Timezone</th><td>{school.timezone || 'America/Chicago'}</td></tr>
                  <tr><th>Min notice</th><td>{school.booking_min_notice_hours ?? 24} hours</td></tr>
                  <tr><th>Booking horizon</th><td>{school.booking_max_days_ahead ?? 60} days</td></tr>
                  <tr><th>Subscription</th><td>{school.subscription_status || 'trial'}</td></tr>
                </tbody>
              </table>
            </section>
          </div>

          <section className="command-card">
            <div className="command-section-head">
              <div>
                <p className="command-eyebrow">Integrations</p>
                <h2>Connected services</h2>
              </div>
            </div>
            <div className="settings-toggle-list">
              <div className="settings-toggle-row settings-integration-row">
                <span>
                  <strong>Google Calendar</strong>
                  <small>Sync Roadsmith sessions to your school calendar so instructors see lessons in one place.</small>
                </span>
                <a
                  className="command-button command-button-primary"
                  href="/api/auth/google-calendar"
                >
                  <Calendar size={16} aria-hidden="true" />
                  Connect Google Calendar
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
