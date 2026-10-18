'use client'

import { useState, useEffect } from 'react'
import { Save, CheckCircle } from 'lucide-react'

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]

export default function InstructorSchedulePage() {
  const [instructorId, setInstructorId] = useState<string>('')
  const [schoolId, setSchoolId] = useState<string>('')
  const [instructorName, setInstructorName] = useState<string>('')
  const [schoolName, setSchoolName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [availability, setAvailability] = useState<Record<number, {
    active: boolean
    start_time: string
    end_time: string
  }>>({})

  useEffect(() => {
    async function load() {
      try {
        // Fetch instructor identity + schedule from the API
        const res = await fetch('/api/instructor/schedule')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error ?? 'Failed to load your schedule. Please log in.')
          setLoading(false)
          return
        }

        const data = await res.json()

        setInstructorId(data.instructor_id)
        setSchoolId(data.school_id)
        setInstructorName(data.instructor_name ?? 'Instructor')

        // Build availability state from API response
        const initState: Record<number, { active: boolean; start_time: string; end_time: string }> = {}
        DAYS.forEach(d => {
          initState[d.value] = { active: false, start_time: '09:00', end_time: '17:00' }
        })

        ;(data.availability ?? []).forEach((row: { day_of_week: number; active: boolean; start_time?: string; end_time?: string }) => {
          if (initState[row.day_of_week]) {
            initState[row.day_of_week] = {
              active: row.active,
              start_time: row.start_time ?? '09:00',
              end_time: row.end_time ?? '17:00',
            }
          }
        })

        setAvailability(initState)
      } catch {
        setError('Failed to connect. Please try again.')
      }
      setLoading(false)
    }

    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const payload = DAYS.map(day => ({
      day_of_week: day.value,
      active: availability[day.value]?.active ?? false,
      start_time: availability[day.value]?.start_time ?? '09:00',
      end_time: availability[day.value]?.end_time ?? '17:00',
    }))

    const res = await fetch('/api/instructor-availability', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-school-id': schoolId,
      },
      body: JSON.stringify({ instructor_id: instructorId, availability: payload }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  function toggleDay(day: number) {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], active: !prev[day]?.active },
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: '#0D0D12', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.06) 0%, transparent 60%)' }}>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Loading your schedule...</p>
      </div>
    )
  }

  if (error && !instructorId) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6" style={{ background: '#0D0D12', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.06) 0%, transparent 60%)' }}>
        <p className="text-sm text-center" style={{ color: '#F87171' }}>{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0D0D12', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.06) 0%, transparent 60%)' }}>
      <div className="max-w-lg mx-auto px-6 py-8 relative z-10">

        {/* Header */}
        <div className="mb-6">
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#4ADE80', fontFamily: 'Outfit, sans-serif' }}>Instructor Schedule</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>{instructorName}</h1>
          {schoolName && (
            <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>{schoolName}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm mb-5" style={{ color: '#94A3B8' }}>
          Toggle the days you&apos;re available and set your hours for each day.
          Your schedule is visible to students booking lessons.
        </div>

        {/* Day grid */}
        <div className="space-y-3">
          {DAYS.map(day => {
            const dayAvail = availability[day.value] ?? { active: false, start_time: '09:00', end_time: '17:00' }
            return (
              <div
                key={day.value}
                className="glass-card"
                style={{
                  padding: '16px',
                  border: dayAvail.active ? '1px solid rgba(74,222,128,0.3)' : undefined,
                }}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDay(day.value)}
                      style={{
                        width: 40,
                        height: 24,
                        borderRadius: 12,
                        border: 'none',
                        background: dayAvail.active ? '#4ADE80' : '#18181B',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: dayAvail.active ? 22 : 4,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#ffffff',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                    <span className="text-sm font-medium" style={{ color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>{day.label}</span>
                  </div>
                  {dayAvail.active && (
                    <span className="text-xs" style={{ color: '#4ADE80' }}>
                      {dayAvail.start_time} – {dayAvail.end_time}
                    </span>
                  )}
                </div>

                {/* Time pickers — only when active */}
                {dayAvail.active && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs mb-1 block" style={{ color: '#94A3B8' }}>Start</label>
                      <input
                        type="time"
                        value={dayAvail.start_time}
                        onChange={e => setAvailability(prev => ({
                          ...prev,
                          [day.value]: { ...prev[day.value], start_time: e.target.value },
                        }))}
                        className="w-full glass-card border-0 text-sm text-white focus:outline-none"
                        style={{ padding: '8px 12px', borderRadius: 12 }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs mb-1 block" style={{ color: '#94A3B8' }}>End</label>
                      <input
                        type="time"
                        value={dayAvail.end_time}
                        onChange={e => setAvailability(prev => ({
                          ...prev,
                          [day.value]: { ...prev[day.value], end_time: e.target.value },
                        }))}
                        className="w-full glass-card border-0 text-sm text-white focus:outline-none"
                        style={{ padding: '8px 12px', borderRadius: 12 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 glass-card border-[#F87171]/30" style={{ padding: '12px 16px' }}>
            <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-2xl transition-opacity disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
            color: '#ffffff',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          {saving ? (
            <span style={{ color: '#ffffff' }}>Saving...</span>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Save Schedule</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
