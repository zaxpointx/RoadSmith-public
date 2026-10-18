'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { X, Calendar, Clock, User, Mail, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'

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
  session_date: string | null
  session_time: string | null
  session: { start_date: string; start_time?: string | null; location?: string | null; session_type?: { name?: string; color?: string } | null; instructor?: { name?: string } | null; school?: { name?: string } | null } | null
}

const glassCard = {
  background: GLASS_BG,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${GLASS_BORDER}`,
  borderRadius: '24px',
  boxShadow: GLASS_SHADOW,
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function CancelContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const [booking, setBooking] = useState<CancellationBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
        body: JSON.stringify({ action: 'cancel' }),
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
        <div style={{ ...glassCard, padding: '40px 32px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
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
        </div>
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

  const { session, student_name, student_email, status } = booking
  const { session_type, instructor, school, location } = session ?? {}
  const session_date = booking.session_date ?? booking.session?.start_date
  const session_time = booking.session_time ?? booking.session?.start_time

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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
      <div className="bg-circle w-[500px] h-[500px] -top-40 -left-40" style={{ background: `radial-gradient(circle, ${DANGER_DIM} 0%, transparent 70%)` }} />

      <div style={{ ...glassCard, padding: '40px 32px', maxWidth: '460px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: DANGER_DIM, border: `1px solid ${DANGER}` }}>
          <AlertTriangle className="w-8 h-8" style={{ color: DANGER }} />
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Cancel Booking?</h1>
        <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
          This will cancel your driving lesson. This action cannot be undone.
        </p>

        {/* Booking details */}
        <div style={{ ...glassCard, padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
          <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: session_type?.color ?? ACCENT }} />
            <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{session_type?.name ?? 'Driving Lesson'}</span>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
              <Calendar className="w-4 h-4 shrink-0" style={{ color: DANGER }} />
              <span>{session_date && formatDate(session_date)}</span>
            </div>
            <div className="flex items-center gap-2.5" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
              <Clock className="w-4 h-4 shrink-0" style={{ color: DANGER }} />
              <span>{session_time && formatTime(session_time)}</span>
            </div>
            {instructor?.name && (
              <div className="flex items-center gap-2.5" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
                <User className="w-4 h-4 shrink-0" />
                <span>{instructor.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
              <Mail className="w-4 h-4 shrink-0" />
              <span>{student_email}</span>
            </div>
          </div>
        </div>

        {cancelError && (
          <div style={{ ...glassCard, padding: '14px 18px', marginBottom: '16px', background: DANGER_DIM, border: `1px solid ${DANGER}`, textAlign: 'left' }}>
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: DANGER }}>{cancelError}</p>
          </div>
        )}

        <div className="space-y-3">
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
      </div>
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
