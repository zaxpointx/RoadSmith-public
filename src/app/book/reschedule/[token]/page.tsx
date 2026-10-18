'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, User, ChevronLeft, CheckCircle,
  CalendarDays, ArrowRight, RefreshCw
} from 'lucide-react'

const GLASS_BG = 'rgba(255,255,255,0.03)'
const GLASS_BORDER = 'rgba(255,255,255,0.06)'
const GLASS_SHADOW = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
const ACCENT = '#4ADE80'
const ACCENT_DIM = 'rgba(74,222,128,0.12)'
const ACCENT_GLOW = 'rgba(74,222,128,0.06)'

type RescheduleBooking = {
  id: string
  school_id?: string
  student_name: string
  student_email: string
  session_date: string | null
  session_time: string | null
  deposit_amount_cents?: number | null
  session: {
    school_id?: string
    start_date: string
    start_time?: string | null
    location?: string | null
    session_type?: { id: string; name?: string; color?: string; price_cents?: number; duration_minutes?: number } | null
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

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function formatTime(timeStr: string | null | undefined) {
  const [h, m] = (timeStr ?? '09:00').split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatShortDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function StepIndicator({ current }: { current: number }) {
  const steps = ['Review', 'Select Time', 'Confirm']
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.4)' }}>
          Step {current + 1} of {steps.length} — <span className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{steps[current]}</span>
        </span>
      </div>
      <div style={{ ...glassCard, padding: '12px 14px' }}>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: i <= current ? '100%' : '0%',
                  background: `linear-gradient(90deg, ${ACCENT}, rgba(129,140,248,1))`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 0: Current Booking Review ────────────────────────────────────────
function ReviewStep({ booking, onNext }: { booking: RescheduleBooking; onNext: () => void }) {
  const { session, student_name, student_email } = booking
  const { session_type, instructor, school, location } = session ?? {}
  const session_date = booking.session_date ?? booking.session?.start_date
  const session_time = booking.session_time ?? booking.session?.start_time

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Reschedule Lesson</h1>
      <p className="text-sm mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
        Choose a new date and time for your lesson.
      </p>

      <div style={{ ...glassCard, padding: '20px', marginBottom: '24px' }}>
        <div className="text-xs mb-3 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif' }}>Current Booking</div>

        <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: ACCENT_DIM, border: `1px solid rgba(74,222,128,0.3)` }}>
            <Calendar className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <div>
            <div className="font-bold text-base" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{session_type?.name ?? 'Driving Lesson'}</div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>{school?.name}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
            <div>
              <div className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{session_date && formatDate(session_date)}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>{session_time && formatTime(session_time)}</div>
            </div>
          </div>
          {instructor?.name && (
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>{instructor.name}</div>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>{location}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...glassCard, padding: '14px 18px', background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)', marginBottom: '20px' }}>
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
          <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
            Select a new date and time below — your instructor will be notified.
          </span>
        </div>
      </div>

      <button
        onClick={onNext}
        style={{
          background: ACCENT,
          color: '#000',
          fontWeight: '600',
          padding: '16px 28px',
          borderRadius: '100px',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        Choose New Time <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ─── Step 1: Select New Time Slot ───────────────────────────────────────────
type Slot = {
  id: string; session_date: string; start_time: string
  instructor_id: string; instructor_name: string; seats_available: number
}

function SelectSlotStep({ booking, onBack, onSelect }: {
  booking: RescheduleBooking; onBack: () => void; onSelect: (slot: Slot) => void
}) {
  const session_type = booking.session?.session_type
  const school_id = booking.session?.school_id ?? booking.school_id
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  useEffect(() => {
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    fetch(`/api/slots?school_id=${school_id}&session_type_id=${session_type?.id}&start_date=${startDate}&end_date=${endDate}`)
      .then(r => r.json())
      .then(data => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [school_id, session_type?.id])

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return {
      dateStr: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: i === 0,
    }
  })

  const slotsByDate: Record<string, Slot[]> = {}
  for (const slot of slots) {
    if (!slotsByDate[slot.session_date]) slotsByDate[slot.session_date] = []
    slotsByDate[slot.session_date].push(slot)
  }

  const filteredSlots = selectedDate ? slotsByDate[selectedDate] ?? [] : Object.values(slotsByDate).flat()

  function sectionOf(slot: Slot) {
    const h = parseInt((slot.start_time ?? '09:00').split(':')[0])
    return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
  }

  const sections = ['Morning', 'Afternoon', 'Evening']

  function handleContinue() {
    if (selectedSlot) onSelect(selectedSlot)
  }

  return (
    <motion.div
      key="select-slot"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
    >
      <button onClick={onBack} className="text-sm mb-4 flex items-center gap-1 min-h-[44px] px-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Pick a New Time</h1>
      <p className="text-sm mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
        {session_type?.name} — {session_type?.duration_minutes} min
      </p>

      {/* Calendar strip */}
      <div style={{ ...glassCard, padding: '14px', marginBottom: '20px', overflowX: 'auto' }}>
        <div className="flex gap-2">
          {days.map(({ dateStr, label, dayNum, month, isToday }) => {
            const hasSlots = !!slotsByDate[dateStr]
            const sel = selectedDate === dateStr
            return (
              <button key={dateStr} onClick={() => setSelectedDate(sel ? null : dateStr)}
                className="flex-shrink-0 flex flex-col items-center rounded-2xl px-3 py-3.5 min-w-[60px] transition-all"
                style={{
                  background: sel ? ACCENT_DIM : 'transparent',
                  border: `1px solid ${sel ? ACCENT : GLASS_BORDER}`,
                  color: hasSlots ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}>
                <span className="text-xs" style={{ color: isToday ? ACCENT : 'inherit' }}>{label}</span>
                <span className="text-lg font-bold mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{dayNum}</span>
                <span className="text-xs" style={{ opacity: 0.6 }}>{month}</span>
                {hasSlots && !sel && <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: ACCENT }} />}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-2xl animate-pulse" style={glassCard} />
          ))}
        </div>
      ) : filteredSlots.length === 0 ? (
        <div style={{ ...glassCard, padding: '32px', textAlign: 'center' }}>
          <Calendar className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.4)' }}>
            No available times{selectedDate ? ' on this day' : ' in the next 14 days'}. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map(sec => {
            const ss = filteredSlots.filter(s => sectionOf(s) === sec)
            if (!ss.length) return null
            return (
              <div key={sec}>
                <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{sec}</div>
                <div className="grid grid-cols-2 gap-2">
                  {ss.map((slot, i) => {
                    const sel = selectedSlot?.id === slot.id
                    return (
                      <button key={i} onClick={() => setSelectedSlot(slot)}
                        style={{
                          ...glassCard,
                          background: sel ? ACCENT_DIM : GLASS_BG,
                          border: `1px solid ${sel ? ACCENT : GLASS_BORDER}`,
                          borderRadius: '16px',
                          padding: '12px 16px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          width: '100%',
                        }}>
                        <div className="font-semibold text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: sel ? ACCENT : '#ffffff' }}>
                          {formatTime(slot.start_time)}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>
                          {slot.instructor_name} · {slot.seats_available} seat{slot.seats_available !== 1 ? 's' : ''}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedSlot && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: '20px' }}
        >
          <button
            onClick={handleContinue}
            style={{
              background: ACCENT,
              color: '#000',
              fontWeight: '600',
              padding: '16px 28px',
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            Continue with {formatDate(selectedSlot.session_date)} at {formatTime(selectedSlot.start_time)} <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Step 2: Confirm Reschedule ──────────────────────────────────────────────
function ConfirmStep({ booking, newSlot, onBack, onConfirm, confirming, error }: {
  booking: RescheduleBooking; newSlot: Slot; onBack: () => void; onConfirm: () => void; confirming: boolean; error: string
}) {
  const session_type = booking.session?.session_type
  const { instructor, school } = booking.session ?? {}

  return (
    <motion.div
      key="confirm"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
    >
      <button onClick={onBack} className="text-sm mb-4 flex items-center gap-1 min-h-[44px] px-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Confirm Reschedule</h1>
      <p className="text-sm mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
        Review your new lesson time before confirming.
      </p>

      {/* Before → After comparison */}
      <div style={{ ...glassCard, padding: '20px', marginBottom: '16px' }}>
        <div className="text-xs mb-4 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif' }}>Schedule Change</div>

        <div className="flex items-center gap-4 mb-4">
          {/* Old */}
          <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif' }}>Current</div>
            <div className="font-bold text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>
              {formatShortDate(booking.session_date ?? booking.session?.start_date)}
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif' }}>
              {formatTime(booking.session_time ?? booking.session?.start_time)}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center" style={{ color: ACCENT }}>
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* New */}
          <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: ACCENT_DIM, border: `1px solid ${ACCENT}` }}>
            <div className="text-xs mb-2" style={{ color: ACCENT, fontFamily: 'Inter, sans-serif' }}>New</div>
            <div className="font-bold text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: ACCENT }}>
              {formatShortDate(newSlot.session_date)}
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif' }}>
              {formatTime(newSlot.start_time)}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{session_type?.name} — {session_type?.duration_minutes} min</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 shrink-0" />
            <span>with {newSlot.instructor_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏫</span>
            <span>{school?.name}</span>
          </div>
        </div>
      </div>

      <div style={{ ...glassCard, padding: '14px 18px', background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)', marginBottom: '20px' }}>
        <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.4)' }}>
          Your instructor will be notified of the change. A confirmation email will be sent to {booking.student_email}.
        </p>
      </div>

      {error && (
        <div style={{ ...glassCard, padding: '14px 18px', marginBottom: '16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', textAlign: 'left' }}>
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#f87171' }}>{error}</p>
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={confirming}
        style={{
          background: confirming ? 'rgba(74,222,128,0.4)' : ACCENT,
          color: confirming ? 'rgba(0,0,0,0.5)' : '#000',
          fontWeight: '600',
          padding: '16px 28px',
          borderRadius: '100px',
          border: 'none',
          cursor: confirming ? 'not-allowed' : 'pointer',
          width: '100%',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {confirming ? '⏳ Rescheduling...' : '✓ Confirm New Time'}
      </button>
    </motion.div>
  )
}

// ─── Success ────────────────────────────────────────────────────────────────
function SuccessStep({ booking, newSlot }: { booking: RescheduleBooking; newSlot: Slot }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="text-center py-4"
    >
      <motion.div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.4)' }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: ACCENT }} />
      </motion.div>

      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Lesson Rescheduled!</h1>
      <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
        Your new lesson is on <span className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{formatDate(newSlot.session_date)}</span> at <span className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{formatTime(newSlot.start_time)}</span>.
      </p>

      <div style={{ ...glassCard, padding: '20px', maxWidth: '340px', margin: '0 auto 20px', textAlign: 'left' }}>
        <div className="text-xs mb-3 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Updated Booking</div>
        <div className="space-y-2.5 text-sm">
          {[
            ['Date', formatDate(newSlot.session_date)],
            ['Time', formatTime(newSlot.start_time)],
            ['Instructor', newSlot.instructor_name],
            ['Student', booking.student_name],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>{k}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', color: '#ffffff' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs mb-8" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif' }}>
        A confirmation email has been sent to {booking.student_email}.
      </p>

      <Link
        href="/"
        style={{
          background: ACCENT,
          color: '#000',
          fontWeight: '600',
          padding: '14px 28px',
          borderRadius: '100px',
          textDecoration: 'none',
          display: 'inline-block',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '15px',
        }}
      >
        Done
      </Link>
    </motion.div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────
function RescheduleContent() {
  const params = useParams()
  const token = params.token as string
  const [step, setStep] = useState(0)
  const [booking, setBooking] = useState<RescheduleBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newSlot, setNewSlot] = useState<Slot | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [direction, setDirection] = useState(1)

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
        if (data) setBooking(data as RescheduleBooking)
        else setError('Booking not found.')
      })
      .catch(() => setError('Could not load booking.'))
      .finally(() => setLoading(false))
  }, [token])

  function handleNext() { setDirection(1); setStep(1) }
  function handleBack() { setDirection(-1); setStep(s => s - 1) }
  function handleSlotSelect(slot: Slot) { setNewSlot(slot); setDirection(1); setStep(2) }

  async function handleConfirm() {
    if (!newSlot || !booking?.id) return
    setConfirming(true)
    setConfirmError('')
    try {
      const res = await fetch(`/api/booking-links/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          new_session_id: newSlot.id,
          new_session_date: newSlot.session_date,
          new_session_time: newSlot.start_time,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setConfirmError(data.error ?? 'Reschedule failed. Please try again.')
        setConfirming(false)
        return
      }
      setStep(3) // success
    } catch {
      setConfirmError('Failed to reschedule. Please try again.')
    }
    setConfirming(false)
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

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#090a05' }}>
        <div style={{ ...glassCard, padding: '40px 32px', maxWidth: '440px', textAlign: 'center' }}>
          <div className="text-5xl mb-4">🔄</div>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{error ? 'Error' : 'Booking Not Found'}</h1>
          <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>{error || 'Invalid or expired booking link.'}</p>
          <Link href="/" style={{ background: ACCENT, color: '#000', fontWeight: '600', padding: '14px 28px', borderRadius: '100px', textDecoration: 'none', display: 'inline-block', fontFamily: 'Outfit, sans-serif' }}>Back to Home</Link>
        </div>
      </div>
    )
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
  }

  return (
    <div className="min-h-screen" style={{ background: '#090a05', backgroundImage: `radial-gradient(ellipse at 50% 0%, ${ACCENT_GLOW} 0%, transparent 60%)` }}>
      <div className="bg-circle w-[500px] h-[500px] -top-40 -left-40" style={{ background: `radial-gradient(circle, ${ACCENT_DIM} 0%, transparent 70%)` }} />

      {/* Header */}
      <div className="border-b relative z-10" style={{ borderColor: GLASS_BORDER }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${ACCENT}, rgba(129,140,248,1))` }}>DC</div>
            <span className="font-semibold text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>
              {booking.session?.school?.name ?? 'Roadsmith'}
            </span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {step < 3 && <StepIndicator current={step} />}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {step === 0 && <ReviewStep booking={booking} onNext={handleNext} />}
            {step === 1 && <SelectSlotStep booking={booking} onBack={handleBack} onSelect={handleSlotSelect} />}
            {step === 2 && newSlot && (
              <ConfirmStep
                booking={booking}
                newSlot={newSlot}
                onBack={handleBack}
                onConfirm={handleConfirm}
                confirming={confirming}
                error={confirmError}
              />
            )}
            {step === 3 && newSlot && <SuccessStep booking={booking} newSlot={newSlot} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#090a05' }} />}>
      <RescheduleContent />
    </Suspense>
  )
}
