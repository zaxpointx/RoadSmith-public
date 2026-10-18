'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type InstructorSummary = { id: string; name: string; email?: string | null }
type AvailabilityWindow = { start: string; end: string; enabled: boolean }

const DEFAULT_WINDOWS: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '17:00' },
  2: { start: '08:00', end: '17:00' },
  3: { start: '08:00', end: '17:00' },
  4: { start: '08:00', end: '17:00' },
  5: { start: '08:00', end: '17:00' },
}

// NAV_ITEMS removed — layout provides the sidebar

const BG = '#0D0D12'
const GLASS_BG = 'rgba(255,255,255,0.03)'
const GLASS_BORDER = 'rgba(255,255,255,0.06)'
const GLASS_BLUR = 'blur(24px)'
const TEXT_SECONDARY = '#9CA3AF'
const ACCENT_CYAN = '#67E8F9'
const ACCENT_GREEN = '#4ADE80'
const CARD_SHADOW = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'

export default function InstructorAvailabilityPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: BG }} />}>
      <AvailabilityContent />
    </Suspense>
  )
}

function AvailabilityContent() {
  const params = useSearchParams()
  const schoolId = params.get('school_id')
  const [instructors, setInstructors] = useState<InstructorSummary[]>([])
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorSummary | null>(null)
  const [windows, setWindows] = useState<Record<number, AvailabilityWindow>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!schoolId) return
    async function load() {
      try {
        const res = await fetch(`/api/instructors?school_id=${schoolId}`)
        const data = await res.json()
        setInstructors(data)
        if (data?.length > 0) {
          setSelectedInstructor(data[0])
          const availRes = await fetch(`/api/instructor-availability?instructor_id=${data[0].id}`)
          const availData = await availRes.json()
          // API returns { availability: [...] }
          const items = Array.isArray(availData) ? availData : (availData?.availability ?? [])
          const byDay: Record<number, AvailabilityWindow> = {}
          for (const w of items as Array<{ day_of_week: number; start_time: string; end_time: string }>) byDay[w.day_of_week] = { start: w.start_time.slice(0, 5), end: w.end_time.slice(0, 5), enabled: true }
          setWindows(byDay)
        }
      } catch (err) {
        console.error('Failed to load availability:', err)
      }
    }
    load()
  }, [schoolId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); if (!selectedInstructor) return
    setSaving(true); setSaved(false)
    // Build payload matching API route format: { instructor_id, availability: [{ day_of_week, start_time, end_time, active }] }
    const availability = Object.entries(windows).map(([day, v]) => ({
      day_of_week: parseInt(day),
      start_time: v.start + ':00',
      end_time: v.end + ':00',
      active: v.enabled,
    }))
    try {
      const res = await fetch('/api/instructor-availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-school-id': schoolId! },
        body: JSON.stringify({ instructor_id: selectedInstructor.id, availability }),
      })
      if (res.ok) {
        setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
        return
      }
    } catch {}
    setSaving(false)
  }

  return (
    <div className="admin-main">

      {/* Back link */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/school-admin" style={{ fontSize: '13px', color: TEXT_SECONDARY, textDecoration: 'none', transition: 'color 0.15s' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FFFFFF')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = TEXT_SECONDARY)}>← Back</Link>
      </div>

      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: '700', color: '#FFFFFF', marginBottom: '24px' }}>Set Weekly Hours</h1>

      {instructors.length > 1 && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: TEXT_SECONDARY, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instructor</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {instructors.map(inst => (
              <button key={inst.id} onClick={() => { setSelectedInstructor(inst); setWindows({}) }} style={{
                padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                ...(selectedInstructor?.id === inst.id ? { background: 'rgba(103,232,249,0.15)', color: ACCENT_CYAN, border: `1px solid ${ACCENT_CYAN}` } : { background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, color: TEXT_SECONDARY, border: `1px solid ${GLASS_BORDER}` }),
              }}>{inst.name}</button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3, 4, 5].map(day => (
          <div key={day} style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', padding: '16px', boxShadow: CARD_SHADOW }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={windows[day]?.enabled ?? false} onChange={e => { setWindows(prev => ({ ...prev, [day]: { start: prev[day]?.start ?? DEFAULT_WINDOWS[day].start, end: prev[day]?.end ?? DEFAULT_WINDOWS[day].end, enabled: e.target.checked } })) }} style={{ width: '16px', height: '16px', borderRadius: '4px', accentColor: ACCENT_CYAN }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{DAYS[day]}</span>
              </label>
            </div>
            {(windows[day]?.enabled ?? false) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '11px', color: TEXT_SECONDARY }}>From</span>
                  <input type="time" value={windows[day]?.start ?? '08:00'} onChange={e => { setWindows(prev => ({ ...prev, [day]: { ...prev[day], start: e.target.value, enabled: true } })) }} style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '8px', padding: '8px 12px', color: '#FFFFFF', fontSize: '14px', outline: 'none' }} onFocus={e => (e.target.style.borderColor = ACCENT_CYAN)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '11px', color: TEXT_SECONDARY }}>to</span>
                  <input type="time" value={windows[day]?.end ?? '17:00'} onChange={e => { setWindows(prev => ({ ...prev, [day]: { ...prev[day], end: e.target.value, enabled: true } })) }} style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '8px', padding: '8px 12px', color: '#FFFFFF', fontSize: '14px', outline: 'none' }} onFocus={e => (e.target.style.borderColor = ACCENT_CYAN)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ paddingTop: '8px' }}>
          {saved && (<div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '600', color: ACCENT_GREEN, background: 'rgba(74,222,128,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>✓ Availability saved</div>)}
          <button type="submit" disabled={saving} style={{ width: '100%', padding: '14px', background: ACCENT_GREEN, border: 'none', borderRadius: '12px', color: '#000', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(103,232,249,0.3)' } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </form>
    </div>
  )
}
