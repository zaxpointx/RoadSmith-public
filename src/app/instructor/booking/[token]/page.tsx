'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar, Clock, User, Phone, MapPin, Car,
  ChevronLeft, AlertCircle, Mail, ArrowRight, GraduationCap
} from 'lucide-react'

const GLASS_BG = 'rgba(255,255,255,0.04)'
const GLASS_BORDER = 'rgba(255,255,255,0.08)'
const GLASS_SHADOW = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
const ACCENT = '#4ADE80'
const ACCENT_DIM = 'rgba(74,222,128,0.12)'
const ACCENT_GLOW = 'rgba(74,222,128,0.06)'
const TEXT_SECONDARY = 'rgba(255,255,255,0.5)'
const TEXT_MUTED = 'rgba(255,255,255,0.35)'

const glassCard = {
  background: GLASS_BG,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${GLASS_BORDER}`,
  borderRadius: '24px',
  boxShadow: GLASS_SHADOW,
}

function formatShortDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatTime(timeStr: string | null | undefined) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatPhone(phone: string | null | undefined) {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { bg: string; color: string; label: string }> = {
    confirmed: { bg: ACCENT_DIM, color: ACCENT, label: 'Confirmed' },
    pending: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'Pending' },
    cancelled: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Cancelled' },
    completed: { bg: 'rgba(129,140,248,0.12)', color: '#a78bfa', label: 'Completed' },
  }
  const s = statusMap[status?.toLowerCase()] ?? { bg: GLASS_BG, color: TEXT_SECONDARY, label: status ?? 'Unknown' }
  return { bg: s.bg, color: s.color, label: s.label }
}

type BookingData = {
  id: string
  student_name: string
  student_email: string
  student_phone: string | null
  status: string
  session?: {
    id: string
    start_date: string
    start_time?: string
    location: string
    session_type?: {
      name: string
      duration_minutes: number
    }
    instructor?: {
      name: string
    }
  }
  school?: {
    name: string
  }
  permit_number?: string
}

async function loadBooking(token: string): Promise<BookingData | null> {
  const res = await fetch(`/api/booking-links/${token}`)
  if (!res.ok) return null
  return res.json()
}

function resolveInstructorAuth(): { instructorId: string | null; schoolId: string | null } {
  if (typeof window === 'undefined') return { instructorId: null, schoolId: null }
  
  // Check demo cookie
  const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
  if (demoCookie) {
    try {
      const session = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1])))
      return { instructorId: session.instructorId ?? null, schoolId: session.schoolId }
    } catch { /* fall through */ }
  }
  
  return { instructorId: null, schoolId: null }
}

export default function InstructorBookingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  // Auth check on mount
  useEffect(() => {
    const { instructorId, schoolId } = resolveInstructorAuth()
    
    if (!instructorId || !schoolId) {
      // Redirect to login
      const redirectUrl = `/instructor/login?redirect=/instructor/booking/${token}`
      router.replace(redirectUrl)
      return
    }
    
    queueMicrotask(() => setAuthChecked(true))
  }, [token, router])

  // Load booking after auth verified
  useEffect(() => {
    if (!authChecked) return
    if (!token) {
      queueMicrotask(() => {
        setError('No booking token provided.')
        setLoading(false)
      })
      return
    }

    loadBooking(token)
      .then(data => {
        if (data) {
          setBooking(data)
        } else {
          setError('Booking not found or link has expired.')
        }
      })
      .catch(() => setError('Failed to load booking details.'))
      .finally(() => setLoading(false))
  }, [token, authChecked])

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070806', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
        <div style={glassCard} className="px-8 py-4 rounded-full">
          <span style={{ fontFamily: 'Inter, sans-serif', color: TEXT_SECONDARY }}>
            {authChecked ? 'Loading booking...' : 'Verifying access...'}
          </span>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#070806' }}>
        <div style={{ ...glassCard, padding: '40px 32px', maxWidth: '440px', textAlign: 'center' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
            <AlertCircle className="w-8 h-8" style={{ color: '#f87171' }} />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>
            {error ? 'Error' : 'Booking Not Found'}
          </h1>
          <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_SECONDARY }}>
            {error || 'Invalid or expired booking link.'}
          </p>
          <Link
            href="/instructor/dashboard"
            style={{
              background: ACCENT,
              color: '#000',
              fontWeight: '600',
              padding: '14px 28px',
              borderRadius: '100px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Back to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const { student_name, student_email, student_phone, status, session, school, permit_number } = booking
  const { session_type, instructor, location } = session ?? {}
  const session_date = session?.start_date
  const session_time = session?.start_time
  const statusBadge = getStatusBadge(status)

  return (
    <div className="min-h-screen" style={{ background: '#070806', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-20" style={{ borderColor: GLASS_BORDER, background: 'rgba(7,8,6,0.8)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/instructor/dashboard"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ color: TEXT_SECONDARY, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_MUTED }}>Booking Details</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>
            Booking Details
          </h1>
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_SECONDARY }}>
            {booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '100px',
              background: statusBadge.bg,
              color: statusBadge.color,
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {statusBadge.label}
          </span>
        </motion.div>

        {/* Student Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ ...glassCard, padding: '24px', marginBottom: '16px' }}
        >
          <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: ACCENT_DIM }}>
              <User className="w-6 h-6" style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{student_name}</div>
              <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_SECONDARY }}>Student</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Mail className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
              </div>
              <div>
                <div className="text-xs mb-0.5 uppercase tracking-wider" style={{ color: TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}>Email</div>
                <a
                  href={`mailto:${student_email}`}
                  className="text-sm font-medium transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#ffffff', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                  onMouseLeave={e => (e.currentTarget.style.color = '#ffffff')}
                >
                  {student_email}
                </a>
              </div>
            </div>

            {student_phone && (
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Phone className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
                </div>
                <div>
                  <div className="text-xs mb-0.5 uppercase tracking-wider" style={{ color: TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}>Phone</div>
                  <a
                    href={`tel:${student_phone}`}
                    className="text-sm font-medium transition-colors"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#ffffff', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                    onMouseLeave={e => (e.currentTarget.style.color = '#ffffff')}
                  >
                    {formatPhone(student_phone)}
                  </a>
                </div>
              </div>
            )}

            {permit_number && (
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Car className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
                </div>
                <div>
                  <div className="text-xs mb-0.5 uppercase tracking-wider" style={{ color: TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}>Permit / License</div>
                  <span className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#ffffff' }}>{permit_number}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Session Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ ...glassCard, padding: '24px', marginBottom: '16px' }}
        >
          <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: ACCENT_DIM }}>
              <GraduationCap className="w-6 h-6" style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>
                {session_type?.name ?? 'Driving Lesson'}
              </div>
              {session_type?.duration_minutes && (
                <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_SECONDARY }}>
                  {session_type.duration_minutes} minutes
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs mb-1 uppercase tracking-wider" style={{ color: TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}>
                <Calendar className="w-3 h-3 inline mr-1" />Date
              </div>
              <div className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>
                {session_date && formatShortDate(session_date)}
              </div>
            </div>

            <div>
              <div className="text-xs mb-1 uppercase tracking-wider" style={{ color: TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}>
                <Clock className="w-3 h-3 inline mr-1" />Time
              </div>
              <div className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>
                {session_time && formatTime(session_time)}
              </div>
            </div>

            {instructor?.name && (
              <div>
                <div className="text-xs mb-1 uppercase tracking-wider" style={{ color: TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}>
                  <User className="w-3 h-3 inline mr-1" />Instructor
                </div>
                <div className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#ffffff' }}>
                  {instructor.name}
                </div>
              </div>
            )}

            {location && (
              <div>
                <div className="text-xs mb-1 uppercase tracking-wider" style={{ color: TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}>
                  <MapPin className="w-3 h-3 inline mr-1" />Location
                </div>
                <div className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#ffffff' }}>
                  {location}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* School Card */}
        {school && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ ...glassCard, padding: '20px', marginBottom: '24px' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <GraduationCap className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
              </div>
              <div>
                <div className="text-xs mb-0.5 uppercase tracking-wider" style={{ color: TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}>School</div>
                <div className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{school.name}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Link
            href="/instructor/dashboard"
            style={{
              background: GLASS_BG,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${GLASS_BORDER}`,
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: '100px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: '600',
              fontSize: '14px',
              flex: 1,
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {student_phone && (
            <a
              href={`tel:${student_phone}`}
              style={{
                background: ACCENT,
                color: '#000',
                padding: '14px 24px',
                borderRadius: '100px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: '600',
                fontSize: '14px',
                flex: 1,
              }}
            >
              <Phone className="w-4 h-4" />
              Call Student
            </a>
          )}
        </motion.div>
      </div>
    </div>
  )
}
