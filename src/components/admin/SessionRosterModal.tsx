'use client'

import { useCallback, useState, useEffect } from 'react'
import { X, UserCheck, UserX, Mail, Phone, FileText, Calendar, MapPin, Clock, Users, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

type SessionLite = {
  id: string
  start_date: string
  end_date?: string | null
  start_time?: string | null
  max_seats: number
  seats_booked: number
  location: string | null
  status: string
  instructor?: { id: string; name: string } | null
  session_type?: { id: string; name: string; duration_minutes?: number; color?: string } | null
}

type RosterEntry = {
  booking_id: string
  student_name: string
  student_email: string
  student_phone: string | null
  booking_status: string
  payment_status: string | null
  checked_in: boolean
  checked_in_at: string | null
  notes: string | null
  created_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
}

type Props = {
  session: SessionLite
  onClose: () => void
  onRosterChange?: (next: { seats_booked: number }) => void
}

// ── Visual tokens — match NewSessionModal in sessions/page.tsx ─────
const GLASS_BG = 'var(--glass-bg)'
const GLASS_BORDER = 'var(--glass-border)'
const GLASS_BLUR = 'var(--glass-blur)'
const TEXT_SECONDARY = 'var(--admin-text-secondary)'
const ACCENT_GREEN = 'var(--admin-accent)'

function statusColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'confirmed':
    case 'checked_in':
      return { bg: 'color-mix(in srgb, var(--admin-accent), transparent 85%)', fg: 'var(--admin-accent)' }
    case 'pending':
      return { bg: 'color-mix(in srgb, var(--status-blue), transparent 85%)', fg: 'var(--status-blue)' }
    case 'canceled':
    case 'cancelled':
      return { bg: 'color-mix(in srgb, var(--accent-secondary), transparent 85%)', fg: 'var(--accent-secondary)' }
    case 'completed':
      return { bg: 'color-mix(in srgb, var(--status-purple), transparent 85%)', fg: 'var(--status-purple)' }
    default:
      return { bg: 'color-mix(in srgb, var(--text-primary), transparent 92%)', fg: TEXT_SECONDARY }
  }
}

function paymentColor(status: string | null): { bg: string; fg: string } {
  if (!status) return statusColor('default')
  if (status === 'paid' || status === 'refunded') return statusColor('confirmed')
  if (status === 'pending' || status === 'processing') return statusColor('pending')
  return statusColor('default')
}

function fmtDate(d: string): string {
  try {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  try {
    const dt = new Date(iso)
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function SessionRosterModal({ session, onClose, onRosterChange }: Props) {
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [meta, setMeta] = useState<{ seats_booked: number; max_seats: number }>({
    seats_booked: session.seats_booked,
    max_seats: session.max_seats,
  })

  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      // Resolve school id from demo cookie or window var
      let schoolId: string | null = null
      if (typeof document !== 'undefined') {
        const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
        if (demoCookie) {
          try { schoolId = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId } catch {}
        }
      }
      if (!schoolId && typeof window !== 'undefined') {
        schoolId = (window as Window & { __schoolId?: string }).__schoolId ?? null
      }
      if (schoolId) headers['x-school-id'] = schoolId

      const res = await fetch(`/api/sessions/${session.id}/roster`, { headers })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load roster')
        setRoster([])
        setLoading(false)
        return
      }
      setRoster(data.roster || [])
      if (data.session) {
        setMeta({ seats_booked: data.session.seats_booked, max_seats: data.session.max_seats })
      }
    } catch {
      setError('Network error loading roster')
    }
    setLoading(false)
  }, [session.id])

  useEffect(() => { queueMicrotask(() => { void loadRoster() }) }, [loadRoster])

  async function performAction(bookingId: string, action: 'check_in' | 'uncheck_in' | 'cancel', reason?: string) {
    setBusyId(bookingId)
    setError('')
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (typeof document !== 'undefined') {
        const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
        if (demoCookie) {
          try {
            const sid = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId
            if (sid) headers['x-school-id'] = sid
          } catch {}
        }
      }
      if (!headers['x-school-id'] && typeof window !== 'undefined') {
        const sid = (window as Window & { __schoolId?: string }).__schoolId
        if (sid) headers['x-school-id'] = sid
      }

      const res = await fetch(`/api/sessions/${session.id}/roster`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action, booking_id: bookingId, reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Action failed: ${action}`)
        setBusyId(null)
        return
      }
      // Optimistic update from server response
      setRoster(prev => prev.map(r => r.booking_id === bookingId ? {
        ...r,
        booking_status: data.booking.booking_status,
        checked_in: data.booking.checked_in,
        checked_in_at: data.booking.checked_in_at,
        notes: data.booking.notes,
        cancelled_at: data.booking.cancelled_at,
        cancellation_reason: data.booking.cancellation_reason,
      } : r))

      // Update seats meta if cancelled
      if (action === 'cancel') {
        setMeta(m => ({ ...m, seats_booked: Math.max(0, m.seats_booked - 1) }))
        onRosterChange?.({ seats_booked: Math.max(0, meta.seats_booked - 1) })
      } else if (action === 'check_in' || action === 'uncheck_in') {
        // No seat count change
      }
    } catch {
      setError('Network error')
    }
    setBusyId(null)
    setConfirmCancelId(null)
    setCancelReason('')
  }

  const checkedInCount = roster.filter(r => r.checked_in).length
  const activeCount = roster.filter(r => r.booking_status !== 'canceled' && r.booking_status !== 'cancelled').length
  const date = fmtDate(session.start_date)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'color-mix(in srgb, var(--bg-base), transparent 30%)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '640px', maxHeight: '88vh',
          background: 'color-mix(in srgb, var(--text-primary), transparent 95%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid color-mix(in srgb, var(--text-primary), transparent 90%)',
          borderRadius: '24px',
          padding: '28px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '4px' }}>
              Session Roster
            </h2>
            <p style={{ fontSize: '13px', color: TEXT_SECONDARY, fontWeight: '500' }}>
              {session.session_type?.name || 'Session'} · {session.instructor?.name || 'No instructor'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--border)', border: '1px solid color-mix(in srgb, var(--text-primary), transparent 90%)',
              color: 'var(--admin-text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
            aria-label="Close roster"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Session info strip */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px', padding: '14px 16px',
            background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
            border: `1px solid ${GLASS_BORDER}`, borderRadius: '14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <Calendar className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--admin-text)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{date}</span>
          </div>
          {session.start_time && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--admin-text)', fontWeight: '500' }}>{session.start_time}</span>
            </div>
          )}
          {session.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--admin-text)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.location}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--admin-text)', fontWeight: '500' }}>
              {activeCount}/{meta.max_seats} booked
              {checkedInCount > 0 && <span style={{ color: ACCENT_GREEN }}> · {checkedInCount} checked in</span>}
            </span>
          </div>
        </div>

        {/* Refresh + count row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: TEXT_SECONDARY, margin: 0 }}>
            {roster.length} {roster.length === 1 ? 'Student' : 'Students'}
          </p>
          <button
            onClick={loadRoster}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', background: 'transparent', border: `1px solid ${GLASS_BORDER}`,
              borderRadius: '8px', color: TEXT_SECONDARY, fontSize: '11px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', marginBottom: '12px',
            background: 'color-mix(in srgb, var(--accent-secondary), transparent 92%)',
            border: '1px solid color-mix(in srgb, var(--accent-secondary), transparent 75%)',
            borderRadius: '10px',
          }}>
            <AlertCircle className="w-4 h-4" style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--accent-secondary)', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Roster list */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginRight: '-8px', paddingRight: '8px' }}>
          {loading && roster.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: TEXT_SECONDARY }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span style={{ marginLeft: '10px', fontSize: '13px' }}>Loading roster...</span>
            </div>
          ) : roster.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <Users className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_SECONDARY, opacity: 0.4 }} />
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '4px' }}>No bookings yet</p>
              <p style={{ fontSize: '12px', color: TEXT_SECONDARY }}>Students will appear here once they book this session.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roster.map(entry => {
                const sColor = statusColor(entry.booking_status)
                const isCancelled = entry.booking_status === 'canceled' || entry.booking_status === 'cancelled'
                const isBusy = busyId === entry.booking_id
                const initials = (entry.student_name || '?')
                  .split(/\s+/)
                  .map(p => p[0]?.toUpperCase() || '')
                  .slice(0, 2)
                  .join('')

                return (
                  <div
                    key={entry.booking_id}
                    style={{
                      padding: '14px',
                      background: GLASS_BG,
                      backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
                      border: `1px solid ${entry.checked_in ? 'color-mix(in srgb, var(--admin-accent), transparent 65%)' : GLASS_BORDER}`,
                      borderRadius: '14px',
                      opacity: isCancelled ? 0.65 : 1,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Top: avatar + name + status pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                        background: entry.checked_in
                          ? 'color-mix(in srgb, var(--admin-accent), transparent 70%)'
                          : 'color-mix(in srgb, var(--text-primary), transparent 92%)',
                        color: entry.checked_in ? 'var(--admin-accent)' : TEXT_SECONDARY,
                        fontSize: '13px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {entry.checked_in ? <CheckCircle2 className="w-5 h-5" /> : initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.student_name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                            borderRadius: '999px', fontSize: '10px', fontWeight: '700',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            background: sColor.bg, color: sColor.fg,
                          }}>
                            {entry.booking_status === 'checked_in' ? 'Checked in' : entry.booking_status}
                          </span>
                          {entry.payment_status && (() => {
                            const pColor = paymentColor(entry.payment_status)
                            return (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                                borderRadius: '999px', fontSize: '10px', fontWeight: '600',
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                                background: pColor.bg, color: pColor.fg,
                              }}>
                                {entry.payment_status}
                              </span>
                            )
                          })()}
                          {entry.checked_in_at && (
                            <span style={{ fontSize: '10px', color: ACCENT_GREEN, fontWeight: '500' }}>
                              @ {fmtTime(entry.checked_in_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: entry.notes ? '8px' : '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: TEXT_SECONDARY }}>
                        <Mail className="w-3 h-3" style={{ flexShrink: 0 }} />
                        <a href={`mailto:${entry.student_email}`} style={{ color: 'inherit', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.student_email}
                        </a>
                      </div>
                      {entry.student_phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: TEXT_SECONDARY }}>
                          <Phone className="w-3 h-3" style={{ flexShrink: 0 }} />
                          <a href={`tel:${entry.student_phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{entry.student_phone}</a>
                        </div>
                      )}
                      {entry.notes && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: TEXT_SECONDARY, marginTop: '2px' }}>
                          <FileText className="w-3 h-3" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontStyle: 'italic' }}>{entry.notes}</span>
                        </div>
                      )}
                      {isCancelled && entry.cancellation_reason && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: 'var(--accent-secondary)', marginTop: '2px' }}>
                          <AlertCircle className="w-3 h-3" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>Cancelled: {entry.cancellation_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!isCancelled && confirmCancelId === entry.booking_id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={cancelReason}
                          onChange={e => setCancelReason(e.target.value)}
                          style={{
                            flex: 1, padding: '6px 10px', fontSize: '12px',
                            background: 'color-mix(in srgb, var(--bg-base), transparent 60%)',
                            border: `1px solid ${GLASS_BORDER}`,
                            borderRadius: '8px', color: 'var(--admin-text)', outline: 'none',
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => performAction(entry.booking_id, 'cancel', cancelReason || undefined)}
                          disabled={isBusy}
                          style={{
                            padding: '6px 12px', fontSize: '11px', fontWeight: '700',
                            background: 'var(--accent-secondary)', border: 'none', borderRadius: '8px',
                            color: 'white', cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1,
                          }}
                        >
                          {isBusy ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => { setConfirmCancelId(null); setCancelReason('') }}
                          style={{
                            padding: '6px 10px', fontSize: '11px', fontWeight: '600',
                            background: 'transparent', border: `1px solid ${GLASS_BORDER}`,
                            borderRadius: '8px', color: TEXT_SECONDARY, cursor: 'pointer',
                          }}
                        >
                          Back
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {entry.checked_in ? (
                          <button
                            onClick={() => performAction(entry.booking_id, 'uncheck_in')}
                            disabled={isBusy}
                            style={{
                              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              padding: '7px 12px', fontSize: '12px', fontWeight: '600',
                              background: 'color-mix(in srgb, var(--status-blue), transparent 88%)',
                              border: '1px solid color-mix(in srgb, var(--status-blue), transparent 70%)',
                              borderRadius: '8px', color: 'var(--status-blue)',
                              cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1,
                            }}
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Undo check-in
                          </button>
                        ) : (
                          <button
                            onClick={() => performAction(entry.booking_id, 'check_in')}
                            disabled={isBusy}
                            style={{
                              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              padding: '7px 12px', fontSize: '12px', fontWeight: '700',
                              background: 'color-mix(in srgb, var(--admin-accent), transparent 80%)',
                              border: '1px solid color-mix(in srgb, var(--admin-accent), transparent 60%)',
                              borderRadius: '8px', color: 'var(--admin-accent)',
                              cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1,
                            }}
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            Check in student
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmCancelId(entry.booking_id)}
                          disabled={isBusy}
                          title="Cancel booking"
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '7px 12px', fontSize: '12px', fontWeight: '600',
                            background: 'transparent',
                            border: '1px solid color-mix(in srgb, var(--accent-secondary), transparent 75%)',
                            borderRadius: '8px', color: 'var(--accent-secondary)',
                            cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1,
                          }}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', marginTop: '12px', borderTop: `1px solid ${GLASS_BORDER}` }}>
          <p style={{ fontSize: '11px', color: TEXT_SECONDARY, margin: 0 }}>
            {checkedInCount} of {activeCount} checked in
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', fontSize: '13px', fontWeight: '600',
              background: 'transparent', border: `1px solid ${GLASS_BORDER}`,
              borderRadius: '10px', color: 'var(--admin-text)', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
