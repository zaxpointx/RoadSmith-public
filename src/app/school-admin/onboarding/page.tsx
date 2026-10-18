'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, School, Users, Calendar, ArrowRight, ChevronRight, ChevronLeft, Loader2, AlertCircle, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Design tokens ──────────────────────────────────────────────────────────
const TEXT_SECONDARY = '#9CA3AF'
const TEXT_MUTED = '#6B7280'
const ACCENT = '#4ADE80'

const GLASS_BG = 'rgba(255,255,255,0.03)'
const GLASS_BORDER = 'rgba(255,255,255,0.06)'
const GLASS_SHADOW = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'

const STEPS = [
  { num: 1, label: 'School Info', icon: School },
  { num: 2, label: 'Instructors', icon: Users },
  { num: 3, label: 'Session Types', icon: Calendar },
  { num: 4, label: 'Subscription', icon: CreditCard },
]

const glassCard = {
  background: GLASS_BG,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${GLASS_BORDER}`,
  borderRadius: '24px',
  boxShadow: GLASS_SHADOW,
}

const glassInput: React.CSSProperties = {
  background: GLASS_BG,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${GLASS_BORDER}`,
  color: '#ffffff',
  outline: 'none',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '14px',
  width: '100%' as const,
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '12px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: '6px',
  display: 'block',
}

// ── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '999px',
                width: i < current ? '100%' : i === current ? '60%' : '0%',
                background: `linear-gradient(90deg, ${ACCENT}, #22D3EE)`,
                transition: 'width 0.5s ease-out',
              }}
            />
          </div>
        ))}
      </div>
      {/* Step pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {STEPS.map(({ num, label, icon: Icon }) => {
          const done = current > num
          const active = current === num
          return (
            <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '999px',
                  background: done ? 'rgba(74,222,128,0.12)' : active ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                  color: done ? ACCENT : active ? ACCENT : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${done ? 'rgba(74,222,128,0.25)' : active ? 'rgba(74,222,128,0.2)' : GLASS_BORDER}`,
                  fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="step-label">{label}</span>
              </div>
              {num < 4 && <ChevronRight className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.15)' }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Onboarding Content ─────────────────────────────────────────────────────
function OnboardingContent() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [schoolData, setSchoolData] = useState<{ name?: string } | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Step 1: School info
  const [schoolName, setSchoolName] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')

  // Step 2: Instructors
  const [instructors, setInstructors] = useState<{ name: string; email: string; phone: string }[]>([])
  const [insName, setInsName] = useState('')
  const [insEmail, setInsEmail] = useState('')
  const [insPhone, setInsPhone] = useState('')

  // Step 3: Session types
  const [sessionTypes, setSessionTypes] = useState<{ name: string; deposit: string; duration: string }[]>([])
  const [stName, setStName] = useState('')
  const [stDeposit, setStDeposit] = useState('')
  const [stDuration, setStDuration] = useState('60')

  // Step 4: Subscription
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    async function load() {
      const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
      const isDemoMode = !!demoCookie
      setIsDemo(isDemoMode)

      if (demoCookie) {
        try {
          const payload = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1])))
          const sid = payload.schoolId || payload.school_id
          if (sid) {
            setSchoolId(sid)
            // Load school info
            const res = await fetch('/api/demo/school')
            if (res.ok) {
              const data = await res.json()
              setSchoolData(data)
              setSchoolName(data.name || '')
              setSchoolEmail(data.owner_email || '')
            }
            setLoaded(true)
            return
          }
        } catch {}
      }

      // Non-demo: use auth session
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }
        const sid = user.user_metadata?.school_id
        if (sid) {
          setSchoolId(sid)
          const { data: school } = await supabase
            .from('schools')
            .select('id, name, owner_email, phone, slug')
            .eq('id', sid)
            .single()
          if (school) {
            setSchoolData(school)
            setSchoolName(school.name || '')
            setSchoolEmail(school.owner_email || '')
            setSchoolPhone(school.phone || '')
          }
        }
        setLoaded(true)
      } catch {
        router.replace('/login')
      }
    }
    load()
  }, [router])

  // ── Step 1: Update school info ──────────────────────────────────────────────
  async function handleStep1() {
    if (!schoolName) { setError('School name is required'); return }
    setLoading(true)
    setError('')
    try {
      // Use API route to update school info (works in client components)
      const res = await fetch('/api/schools/update-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          name: schoolName,
          phone: schoolPhone || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update school')
      }
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update school info')
    }
    setLoading(false)
  }

  // ── Step 2: Add instructor ─────────────────────────────────────────────────
  function addInstructor() {
    if (!insName) return
    setInstructors(prev => [...prev, { name: insName, email: insEmail, phone: insPhone }])
    setInsName('')
    setInsEmail('')
    setInsPhone('')
  }

  async function handleStep2() {
    if (instructors.length === 0) {
      // Skip — no instructors yet
      setStep(3)
      return
    }
    setLoading(true)
    setError('')
    try {
      for (const inst of instructors) {
        await fetch('/api/instructors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-school-id': schoolId! },
          body: JSON.stringify({ name: inst.name, email: inst.email, phone: inst.phone || null }),
        })
      }
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add instructors')
    }
    setLoading(false)
  }

  // ── Step 3: Add session type ──────────────────────────────────────────────
  function addSessionType() {
    if (!stName) return
    setSessionTypes(prev => [...prev, { name: stName, deposit: stDeposit, duration: stDuration }])
    setStName('')
    setStDeposit('')
    setStDuration('60')
  }

  async function handleStep3() {
    if (sessionTypes.length === 0) {
      // Skip — no session types yet
      setStep(4)
      return
    }
    setLoading(true)
    setError('')
    try {
      for (const st of sessionTypes) {
        const res = await fetch('/api/session-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-school-id': schoolId! },
          body: JSON.stringify({
            school_id: schoolId,
            name: st.name,
            deposit_cents: parseInt(st.deposit) * 100 || 0,
            duration_minutes: parseInt(st.duration) || 60,
            price_cents: parseInt(st.deposit) * 100 || 0,
            tca_hours_credit: null,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to add session type')
        }
      }
      setStep(4)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add session types')
    }
    setLoading(false)
  }

  // ── Step 4: Create subscription ────────────────────────────────────────────
  async function handleCreateSubscription() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          school_name: schoolName,
          owner_email: schoolEmail,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create subscription')
      }

      if (data.demoMode || !data.url) {
        // Demo mode or direct success — go to dashboard
        router.push('/school-admin')
      } else if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Subscription creation failed')
    }
    setLoading(false)
  }

  function skipSubscription() {
    router.push('/school-admin')
  }

  function removeInstructor(idx: number) {
    setInstructors(prev => prev.filter((_, i) => i !== idx))
  }

  function removeSessionType(idx: number) {
    setSessionTypes(prev => prev.filter((_, i) => i !== idx))
  }

  if (!loaded) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#000', gap: '12px',
      }}>
        <Loader2 className="w-6 h-6" style={{ color: ACCENT, animation: 'spin 1s linear infinite' }} />
        <span style={{ color: TEXT_SECONDARY, fontSize: '14px' }}>Loading...</span>
      </div>
    )
  }

  const cardStyle = { ...glassCard, padding: '32px 28px' }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#000',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.05) 0%, transparent 60%)',
      position: 'relative',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', width: '500px', height: '500px', top: '-200px', left: '-200px',
        background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '400px', height: '400px', bottom: '-150px', right: '-150px',
        background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', textDecoration: 'none', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${ACCENT}, #22D3EE)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#000' }}>DC</div>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>Roadsmith</span>
      </Link>

      <div style={{ width: '100%', maxWidth: '520px', position: 'relative', zIndex: 1 }}>
        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* Card */}
        <div style={cardStyle}>
          {/* ── Error display ── */}
          {error && (
            <div style={{
              marginBottom: '20px', padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertCircle className="w-4 h-4" style={{ color: '#EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#EF4444' }}>{error}</span>
            </div>
          )}

          {/* ═══ Step 1: School Info ═══ */}
          {step === 1 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>Step 1 of 4</div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>School information</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', lineHeight: 1.5 }}>
                Let&apos;s get your school set up.{schoolData?.name && (
                  <> We found <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{schoolData.name}</span>.</>
                )}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>School name</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    placeholder="Your Driving School"
                    style={glassInput}
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Owner email</label>
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={e => setSchoolEmail(e.target.value)}
                    placeholder="you@yourdrivingschool.com"
                    style={glassInput}
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone number</label>
                  <input
                    type="tel"
                    value={schoolPhone}
                    onChange={e => setSchoolPhone(e.target.value)}
                    placeholder="(615) 555-0100"
                    style={glassInput}
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  />
                </div>

                <button
                  onClick={handleStep1}
                  disabled={loading || !schoolName}
                  style={{
                    marginTop: '8px',
                    padding: '14px 24px', background: ACCENT, color: '#000', border: 'none',
                    borderRadius: '999px', fontSize: '14px', fontWeight: '600', cursor: loading || !schoolName ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: 'Outfit, sans-serif', opacity: loading || !schoolName ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {loading ? 'Saving...' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ═══ Step 2: Instructors ═══ */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ padding: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', transition: 'background 0.15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>Step 2 of 4</div>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>Add instructors</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                Add at least one instructor. You can add more later.
              </p>

              {/* Added instructors list */}
              {instructors.length > 0 && (
                <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {instructors.map((inst, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                      border: `1px solid ${GLASS_BORDER}`,
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: `linear-gradient(135deg, ${ACCENT}, #22D3EE)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '700', color: '#000', flexShrink: 0,
                      }}>
                        {inst.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>{inst.name}</div>
                        <div style={{ fontSize: '12px', color: TEXT_SECONDARY }}>{inst.email}</div>
                      </div>
                      <button
                        onClick={() => removeInstructor(i)}
                        style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add instructor form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Instructor name</label>
                  <input
                    type="text"
                    value={insName}
                    onChange={e => setInsName(e.target.value)}
                    placeholder="Instructor name"
                    style={glassInput}
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={insEmail}
                    onChange={e => setInsEmail(e.target.value)}
                    placeholder="instructor@school.com"
                    style={glassInput}
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    type="tel"
                    value={insPhone}
                    onChange={e => setInsPhone(e.target.value)}
                    placeholder="(615) 555-0100"
                    style={glassInput}
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  />
                </div>
                <button
                  onClick={addInstructor}
                  disabled={!insName}
                  style={{
                    padding: '10px', background: 'rgba(74,222,128,0.1)', border: `1px solid rgba(74,222,128,0.2)`,
                    borderRadius: '999px', color: ACCENT, fontSize: '13px', fontWeight: '600',
                    cursor: insName ? 'pointer' : 'not-allowed', opacity: insName ? 1 : 0.4,
                    transition: 'all 0.15s',
                  }}
                >
                  + Add instructor
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleStep2}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '14px 24px', background: ACCENT, color: '#000', border: 'none',
                    borderRadius: '999px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: 'Outfit, sans-serif', opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Saving...' : instructors.length > 0 ? `Continue with ${instructors.length} instructor${instructors.length > 1 ? 's' : ''}` : 'Skip for now'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ═══ Step 3: Session Types ═══ */}
          {step === 3 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{ padding: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', transition: 'background 0.15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>Step 3 of 4</div>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>Add session types</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                What kinds of lessons do you offer? Students will book and pay for these.
              </p>

              {/* Added session types list */}
              {sessionTypes.length > 0 && (
                <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sessionTypes.map((st, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                      border: `1px solid ${GLASS_BORDER}`,
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '10px',
                        background: 'rgba(74,222,128,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '700', color: ACCENT, flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>{st.name}</div>
                        <div style={{ fontSize: '12px', color: TEXT_SECONDARY }}>
                          ${st.deposit || '0'} deposit · {st.duration || '60'} min
                        </div>
                      </div>
                      <button
                        onClick={() => removeSessionType(i)}
                        style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add session type form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Session name</label>
                  <input
                    type="text"
                    value={stName}
                    onChange={e => setStName(e.target.value)}
                    placeholder="Behind-the-Wheel Lesson"
                    style={glassInput}
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Deposit amount ($)</label>
                    <input
                      type="number"
                      value={stDeposit}
                      onChange={e => setStDeposit(e.target.value)}
                      placeholder="50"
                      style={glassInput}
                      onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                      onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Duration (min)</label>
                    <input
                      type="number"
                      value={stDuration}
                      onChange={e => setStDuration(e.target.value)}
                      placeholder="60"
                      style={glassInput}
                      onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                      onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                    />
                  </div>
                </div>
                <button
                  onClick={addSessionType}
                  disabled={!stName}
                  style={{
                    padding: '10px', background: 'rgba(74,222,128,0.1)', border: `1px solid rgba(74,222,128,0.2)`,
                    borderRadius: '999px', color: ACCENT, fontSize: '13px', fontWeight: '600',
                    cursor: stName ? 'pointer' : 'not-allowed', opacity: stName ? 1 : 0.4,
                    transition: 'all 0.15s',
                  }}
                >
                  + Add session type
                </button>
              </div>

              <button
                onClick={handleStep3}
                disabled={loading}
                style={{
                  width: '100%', padding: '14px 24px', background: ACCENT, color: '#000', border: 'none',
                  borderRadius: '999px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'Outfit, sans-serif', opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Saving...' : sessionTypes.length > 0 ? `Continue with ${sessionTypes.length} type${sessionTypes.length > 1 ? 's' : ''}` : 'Skip for now'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ═══ Step 4: Subscription ═══ */}
          {step === 4 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <button
                  onClick={() => setStep(3)}
                  style={{ padding: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', transition: 'background 0.15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>Step 4 of 4</div>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>Almost done!</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', lineHeight: 1.5 }}>
                {isDemo
                  ? 'You\'re in demo mode — skip billing and start exploring your dashboard.'
                  : 'Activate your $99/month subscription to start managing students, booking sessions, and collecting payments.'}
              </p>

              {/* Plan card */}
              <div style={{
                background: 'rgba(74,222,128,0.06)',
                border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: '20px',
                padding: '24px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '2px' }}>Starter Plan</h3>
                    <p style={{ fontSize: '13px', color: TEXT_SECONDARY }}>Everything you need to run your school</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: '800', color: '#FFFFFF', lineHeight: 1, marginBottom: '2px' }}>$99</div>
                    <div style={{ fontSize: '12px', color: TEXT_SECONDARY }}>/month</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    'Student management & TCA tracking',
                    'Session scheduling & calendar',
                    'Online booking & payment collection',
                    'Automated reminders & communications',
                    'CSV import for easy migration',
                  ].map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check className="w-4 h-4" style={{ color: ACCENT, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: TEXT_SECONDARY }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={handleCreateSubscription}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px 24px',
                    background: loading ? 'rgba(74,222,128,0.5)' : ACCENT,
                    color: '#000', border: 'none',
                    borderRadius: '999px', fontSize: '14px', fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: 'Outfit, sans-serif',
                    boxShadow: '0 0 16px rgba(74,222,128,0.3)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(74,222,128,0.4)'
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(74,222,128,0.3)'
                  }}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  ) : isDemo ? (
                    <><Check className="w-4 h-4" /> Complete Setup — Free</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Start $99/mo Plan</>
                  )}
                </button>

                {!isDemo && (
                  <button
                    onClick={skipSubscription}
                    style={{
                      width: '100%', padding: '12px', background: 'transparent', border: 'none',
                      color: TEXT_MUTED, fontSize: '13px', cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif', transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = TEXT_SECONDARY)}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = TEXT_MUTED)}
                  >
                    Skip for now — I&apos;ll set up billing later
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .step-label { display: none; }
        }
      `}</style>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  return <OnboardingContent />
}
