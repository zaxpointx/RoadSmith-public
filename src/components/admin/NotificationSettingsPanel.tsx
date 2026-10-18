'use client'

export type NotificationPreferences = {
  booking_confirmations: boolean
  payment_alerts: boolean
  session_reminders: boolean
  instructor_schedule_changes: boolean
  compliance_alerts: boolean
  marketing_updates: boolean
  reminder_48h: boolean
  reminder_4h: boolean
}

const ITEMS: { key: keyof NotificationPreferences; label: string; note: string }[] = [
  { key: 'booking_confirmations', label: 'Booking confirmations', note: 'Notify owners and parents when a booking is confirmed.' },
  { key: 'payment_alerts', label: 'Payment alerts', note: 'Send alerts for deposits, balances, and failed payments.' },
  { key: 'session_reminders', label: 'Session reminders', note: 'Send lesson reminders before scheduled sessions.' },
  { key: 'instructor_schedule_changes', label: 'Instructor schedule changes', note: 'Alert instructors when sessions are added, moved, or cancelled.' },
  { key: 'compliance_alerts', label: 'Compliance alerts', note: 'Surface Tennessee form readiness and missing student data.' },
  { key: 'marketing_updates', label: 'Product updates', note: 'Receive Roadsmith announcements and promotions.' },
  { key: 'reminder_48h', label: '48-hour reminders', note: 'Send the long-lead reminder before a session.' },
  { key: 'reminder_4h', label: '4-hour reminders', note: 'Send the day-of reminder before a session.' },
]

export default function NotificationSettingsPanel({
  preferences,
  saving,
  onChange,
  onSave,
}: {
  preferences: NotificationPreferences
  saving?: boolean
  onChange: (key: keyof NotificationPreferences, value: boolean) => void
  onSave: () => void
}) {
  return (
    <section className="command-card settings-panel">
      <div className="command-section-head">
        <div>
          <p className="command-eyebrow">Notifications</p>
          <h2>Operational alerts</h2>
        </div>
        <button className="command-button command-button-primary" type="button" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
      <div className="settings-toggle-list">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`settings-toggle-row${preferences[item.key] ? ' is-on' : ''}`}
            onClick={() => onChange(item.key, !preferences[item.key])}
          >
            <span>
              <strong>{item.label}</strong>
              <small>{item.note}</small>
            </span>
            <span className="command-switch" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}
