'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar, Clock, User, Mail, Phone, MapPin,
  AlertTriangle, CheckCircle, X, ArrowRight, MessageSquare
} from 'lucide-react'

const GLASS_BG = 'rgba(255,255,255,0.03)'
const GLASS_BORDER = 'rgba(255,255,255,0.06)'
const GLASS_SHADOW = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
const ACCENT = '#4ADE80'
const ACCENT_DIM = 'rgba(74,222,128,0.12)'
const ACCENT_GLOW = 'rgba(74,222,128,0.06)'
const DANGER = '#f87171'
const DANGER_DIM = 'rgba(248,113,113,0.12)'

type CancellationBooking = {
  id: string
  student_name: string
  student_email: string
  student_phone?: string | null
  status: string
  deposit_amount_cents?: number | null
  session_date: string | null
  session_time: string | null
  session: { start_date: string; start_time?: string | null; location?: string | null; session_type?: { name?: string; color?: string; price_cents?: number } | null; instructor?: { name?: string } | null; school?: { name?: string } | null } | null
}

const glassCard = {
  background: GLASS_BG,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${GLASS_BORDER}`,
  borderRadius: '24px',
  boxShadow: GLASS_SHADOW,
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function formatTime(timeStr: string | null | undefined) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function CancelContent() {
  const params = useParams()
  const token = params.token as string
  const router = useRouter()
  const [booking, setBooking] = useState<CancellationBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setError('No booking token provided.')
        setLoading(false)
      })
      return
    }
    fetch(`/api/booking-links/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setBooking(data as CancellationBooking)
        } else {
          setError('Booking not found.')
        }
      })
      .catch(() => setError('Could not load booking details.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleCancel() {
    if (!booking?.id) return
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch(`/api/booking-links/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          cancellation_reason: cancelReason || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCancelError(data.error ?? 'Cancel failed. Please try again.')
        setCancelling(false)
        return
      }
      setCancelled(true)
    } catch {
      setCancelError('Failed to cancel. Please try again.')
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
        <div style={glassCard} className="px-8 py-4 rounded-full">
          <span style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>Loading booking...</span>
        </div>
      </div>
    )
  }

  if (cancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ ...glassCard, padding: '40px 32px', maxWidth: '440px', width: '100%', textAlign: 'center' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: ACCENT_DIM, border: `1px solid ${ACCENT}` }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: ACCENT }} />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Booking Cancelled</h1>
          <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
            Your lesson has been cancelled. We hope to see you again soon.
          </p>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif' }}>
            A confirmation email will be sent to {booking?.student_email}
          </p>
          <Link
            href="/"
            style={{ background: ACCENT, color: '#000', fontWeight: '600', padding: '14px 28px', borderRadius: '100px', textDecoration: 'none', display: 'inline-block', fontFamily: 'Outfit, sans-serif' }}
          >
            Book Again →
          </Link>
        </motion.div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
        <div style={{ ...glassCard, padding: '40px 32px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Booking Not Found</h1>
          <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>{error || 'Invalid or expired booking link.'}</p>
          <Link
            href="/"
            style={{ background: ACCENT, color: '#000', fontWeight: '600', padding: '14px 28px', borderRadius: '100px', textDecoration: 'none', display: 'inline-block', fontFamily: 'Outfit, sans-serif' }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const { session, student_name, student_email, student_phone, status } = booking
  const { session_type, instructor, school, location } = session ?? {}
  const session_date = booking.session_date ?? booking.session?.start_date
  const session_time = booking.session_time ?? booking.session?.start_time
  const price_cents = session_type?.price_cents ?? booking.deposit_amount_cents ?? 0

  if (status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
        <div style={{ ...glassCard, padding: '40px 32px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Already Cancelled</h1>
          <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>This booking was already cancelled.</p>
          <Link
            href="/"
            style={{ background: ACCENT, color: '#000', fontWeight: '600', padding: '14px 28px', borderRadius: '100px', textDecoration: 'none', display: 'inline-block', fontFamily: 'Outfit, sans-serif' }}
          >
            Book Again →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 50% 0%, ${DANGER_DIM} 0%, transparent 50%)`, pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ ...glassCard, padding: '40px 32px', maxWidth: '480px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}
      >
        {/* Warning icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: DANGER_DIM, border: `1px solid ${DANGER}` }}>
          <AlertTriangle className="w-8 h-8" style={{ color: DANGER }} />
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Cancel Booking?</h1>
        <p className="mb-6 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
          This will permanently cancel your driving lesson.
        </p>

        {/* Booking details card */}
        <div style={{ ...glassCard, padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
          <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: DANGER_DIM }}>
              <Calendar className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{session_type?.name ?? 'Driving Lesson'}</div>
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>{school?.name}</div>
            </div>
            {price_cents > 0 && (
              <div className="font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: DANGER }}>{formatPrice(price_cents)}</div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)' }}>
                <span className="font-medium" style={{ color: '#ffffff' }}>{session_date && formatDate(session_date)}</span>
                <span className="ml-2">{session_time && formatTime(session_time)}</span>
              </div>
            </div>

            {instructor?.name && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)' }}>{instructor.name}</span>
              </div>
            )}

            {location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)' }}>{location}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)' }}>{student_email}</span>
            </div>

            {student_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)' }}>{student_phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cancellation reason textarea */}
        <div className="mb-4 text-left">
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
            <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />
            Reason for cancellation (optional)
          </label>
          <textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Let us know why you're cancelling..."
            rows={3}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: GLASS_BG,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${GLASS_BORDER}`,
              borderRadius: '14px',
              color: '#ffffff',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              resize: 'vertical',
              minHeight: '80px',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(248,113,113,0.4)')}
            onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
          />
        </div>

        {cancelError && (
          <div style={{ ...glassCard, padding: '14px 18px', marginBottom: '16px', background: DANGER_DIM, border: `1px solid ${DANGER}`, textAlign: 'left' }}>
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: DANGER }}>{cancelError}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Cancel button */}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              background: cancelling ? 'rgba(248,113,113,0.4)' : DANGER,
              color: cancelling ? 'rgba(255,255,255,0.5)' : '#000',
              fontWeight: '600',
              padding: '14px 28px',
              borderRadius: '100px',
              border: 'none',
              cursor: cancelling ? 'not-allowed' : 'pointer',
              width: '100%',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <X className="w-4 h-4" />
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
          </button>

          {/* Reschedule link */}
          <Link
            href={`/book/reschedule/${token}`}
            style={{
              background: 'transparent',
              color: ACCENT,
              fontWeight: '500',
              padding: '14px 28px',
              borderRadius: '100px',
              border: `1px solid ${ACCENT}`,
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <Calendar className="w-4 h-4" />
            Reschedule Instead
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Keep booking link */}
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              padding: '8px',
            }}
          >
            Keep my booking
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function CancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#090a05' }} />}>
      <CancelContent />
    </Suspense>
  )
}
