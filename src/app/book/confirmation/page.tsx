'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Clock, Mail, Users } from 'lucide-react'

const GLASS_BG = 'rgba(255,255,255,0.03)'
const GLASS_BORDER = 'rgba(255,255,255,0.06)'
const GLASS_SHADOW = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
const ACCENT = '#4ADE80'
const ACCENT_DIM = 'rgba(74,222,128,0.12)'
const ACCENT_GLOW = 'rgba(74,222,128,0.06)'

type BookingDetails = {
  session_date: string
  session_time: string
  student_name: string
  student_email: string
  session: {
    start_date: string
    start_time?: string
    location?: string | null
    session_type?: { name?: string; color?: string } | null
    instructor?: { name?: string } | null
    school?: { name?: string } | null
  } | null
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

function ConfirmationContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setError('No booking token provided.')
        setLoading(false)
      })
      return
    }
    // Try booking_token first (book_seat stores this), fall back to confirmation_token
    fetch(`/api/booking-links/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setBooking(data as BookingDetails)
        } else {
          // Token not found — might be a confirmation_token from an older flow
          setError('Booking not found. If you just completed payment, your confirmation should arrive by email shortly.')
        }
      })
      .catch(() => setError('Could not load booking details.'))
      .finally(() => setLoading(false))
  }, [token])

  function handleAddToCalendar() {
    if (!booking?.session) return
    const session_date = booking.session_date ?? booking.session?.start_date
    const session_time = booking.session_time ?? booking.session?.start_time
    const start = new Date(`${session_date}T${session_time}:00`)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${booking.session.session_type?.name ?? 'Driving Lesson'} — ${booking.session.school?.name ?? ''}`,
      `DESCRIPTION:Your driving lesson. Booked via Roadsmith.`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'driving-lesson.ics'
    a.click()
    URL.revokeObjectURL(url)
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
        <div style={{ ...glassCard, padding: '40px 32px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Pending Payment</h1>
          <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>{error}</p>
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

  if (!booking) return null

  const { session, student_name, student_email } = booking
  const { session_type, instructor, school, location } = session ?? {}
  const session_date = booking.session_date ?? booking.session?.start_date
  const session_time = booking.session_time ?? booking.session?.start_time

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
      {/* decorative circles */}
      <div className="bg-circle w-[500px] h-[500px] -top-40 -left-40" style={{ background: `radial-gradient(circle, ${ACCENT_DIM} 0%, transparent 70%)` }} />
      <div className="bg-circle w-[400px] h-[400px] bottom-20 -right-32" style={{ background: 'radial-gradient(circle, rgba(112,123,255,0.1) 0%, transparent 70%)' }} />

      <div style={{ ...glassCard, padding: '40px 32px', maxWidth: '480px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Lesson Booked!</h1>
        <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
          Hi {student_name.split(' ')[0]} — you&apos;re all set for your lesson.
        </p>

        {/* Booking details card */}
        <div style={{ ...glassCard, padding: '24px', marginBottom: '24px', textAlign: 'left' }}>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: session_type?.color ?? ACCENT }}
            />
            <span className="font-bold text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{session_type?.name ?? 'Driving Lesson'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
            <span>📅</span>
            <span>{formatDate(session_date)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
            <span>🕐</span>
            <span>{formatTime(session_time)}</span>
          </div>
          {location && (
            <div className="flex items-center gap-3 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
              <span>📍</span>
              <span>{location}</span>
            </div>
          )}
          {instructor?.name && (
            <div className="flex items-center gap-3 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
              <span>👤</span>
              <span>with {instructor.name}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
            <span>🏫</span>
            <span>{school?.name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
            <span>✉️</span>
            <span>{student_email}</span>
          </div>
        </div>

        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif' }}>
          You&apos;ll get an SMS reminder 72 hours before your lesson.
          Reply C to confirm or R to reschedule.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size='14' style={{ color: '#4ADE80' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>Check your email</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>Confirmation sent to {student_email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size='14' style={{ color: '#4ADE80' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>SMS reminder 48h before</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>Reply C to confirm or R to reschedule</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size='14' style={{ color: '#4ADE80' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>Your instructor will contact you</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>with {instructor?.name || 'details about your lesson'}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAddToCalendar}
            style={{ ...glassCard, width: '100%', padding: '14px', color: '#ffffff', fontFamily: 'Inter, sans-serif', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}
          >
            📅 Add to Calendar
          </button>
          <Link
            href="/school-admin"
            style={{ background: ACCENT, color: '#000', fontWeight: '600', padding: '14px 28px', borderRadius: '100px', textDecoration: 'none', display: 'block', textAlign: 'center', fontFamily: 'Outfit, sans-serif', fontSize: '15px' }}
          >
            Back to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#090a05' }} />}>
      <ConfirmationContent />
    </Suspense>
  )
}
