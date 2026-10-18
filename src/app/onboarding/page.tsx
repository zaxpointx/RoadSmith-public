'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ArrowRight, Sparkles, Car } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SuccessState } from '@/components/auth/SuccessState'
import { ItalicAccent } from '@/components/ui/ItalicAccent'

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="rs-step-dots">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rs-step-dot${i < current ? ' is-done' : ''}${i === current - 1 ? ' is-current' : ''}`}
        />
      ))}
    </div>
  )
}

function BrandMark() {
  return (
    <Link href="/" className="rs-onboard-brand">
      <span className="rs-onboard-mark"><Car size={18} /></span>
      <span className="rs-onboard-wordmark">Roadsmith</span>
    </Link>
  )
}

function ScreenStart({ onCreate, onSignIn }: { onCreate: () => void; onSignIn: () => void }) {
  return (
    <div className="rs-auth-card rs-onboard-card">
      <div className="rs-onboard-center">
        <div className="rs-onboard-icon"><Sparkles size={28} /></div>
        <h1 className="rs-onboard-h1">Get started with Roadsmith</h1>
        <p className="rs-onboard-sub">Sign in to your school, or set up a new one in under two minutes.</p>
      </div>
      <div className="rs-onboard-actions">
        <button className="rs-cta rs-cta-primary" onClick={onCreate}>
          Create my school <ArrowRight size={16} />
        </button>
        <button className="rs-cta rs-cta-ghost" onClick={onSignIn}>
          Sign in
        </button>
      </div>
      <p className="rs-onboard-tos">
        By continuing, you agree to our Terms of Service and Privacy Policy.
        We&apos;ll never share your school data.
      </p>
    </div>
  )
}

function ScreenSchoolInfo({
  loading, onSubmit, schoolName, setSchoolName, state, setState, studentCount, setStudentCount,
}: {
  loading: boolean; onSubmit: () => void;
  schoolName: string; setSchoolName: (s: string) => void;
  state: string; setState: (s: string) => void;
  studentCount: number; setStudentCount: (n: number) => void;
}) {
  const STATES = ['Tennessee', 'Ohio', 'Pennsylvania', 'Virginia', 'Kentucky', 'North Carolina', 'Georgia', 'Florida', 'Texas', 'Other']
  return (
    <div className="rs-auth-card rs-onboard-card">
      <h1 className="rs-onboard-h1">Tell us about your school</h1>
      <p className="rs-onboard-sub">Three quick details and you&apos;re ready to roll.</p>
      <div className="rs-onboard-fields">
        <div className="rs-field-group">
          <label htmlFor="schoolName" className="rs-field-label">School name</label>
          <input id="schoolName" className="rs-field-input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Oak Ridge Driving Academy" autoFocus />
        </div>
        <div className="rs-field-group">
          <label htmlFor="state" className="rs-field-label">State</label>
          <select id="state" className="rs-field-input" value={state} onChange={(e) => setState(e.target.value)}>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="rs-field-group">
          <label htmlFor="tz" className="rs-field-label">Timezone</label>
          <input id="tz" className="rs-field-input" value="America/New_York (auto-detected)" readOnly disabled />
        </div>
        <div className="rs-field-group">
          <label htmlFor="students" className="rs-field-label">Students per month · {studentCount}</label>
          <input id="students" type="range" min={5} max={500} step={5} value={studentCount} onChange={(e) => setStudentCount(parseInt(e.target.value))} className="rs-range" />
          <div className="rs-range-bounds"><span>5</span><span>500</span></div>
        </div>
      </div>
      <div className="rs-onboard-actions">
        <button className="rs-cta rs-cta-primary" onClick={onSubmit} disabled={!schoolName || loading}>
          {loading ? 'Creating…' : <>Create school <ArrowRight size={16} /></>}
        </button>
      </div>
      <p className="rs-auth-foot-link">
        Already have an account? <Link href="/login" className="rs-field-link">Sign in</Link>
      </p>
    </div>
  )
}

function ScreenDone({ onDashboard }: { onDashboard: () => void }) {
  return (
    <div className="rs-auth-card rs-onboard-card">
      <div className="rs-onboard-center">
        <div className="rs-onboard-check"><Check size={36} strokeWidth={3} /></div>
      </div>
      <SuccessState
        heading={<>You&apos;re all set! <ItalicAccent>your school is live.</ItalicAccent></>}
        subheading="Your free trial is active. Let's get your first student booked."
        benefits={[
          { title: 'All your students, one clean view', description: 'Manage rosters, permits, and progress from one place.' },
          { title: 'Book lessons that don\'t conflict', description: 'Smart scheduling that respects instructor hours and student availability.' },
          { title: 'Built for Tennessee compliance', description: 'Permit tracking, parental consent, and behind-the-wheel hours, handled.' },
        ]}
        ctaLabel="Go to my dashboard"
        onCta={onDashboard}
      />
    </div>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [stateVal, setStateVal] = useState('Tennessee')
  const [studentCount, setStudentCount] = useState(50)

  useEffect(() => {
    const slug = searchParams.get('school')
    if (slug) {
      // Defer to a microtask to avoid cascading renders (lint: set-state-in-effect).
      const handle = window.setTimeout(() => setStep(3), 0)
      return () => window.clearTimeout(handle)
    }
    return undefined
  }, [searchParams])

  async function handleCreate() {
    if (!schoolName) return
    setLoading(true)
    try {
      const supabase = createClient()
      const slug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const { error } = await (supabase.from('schools') as unknown as { insert: (v: unknown) => Promise<{ error: { message: string } | null }> }).insert({
        name: schoolName, slug, state: stateVal, owner_email: 'demo@roadsmith.dev', active: true,
      })
      if (error) console.warn('school insert:', error.message)
    } finally {
      setLoading(false)
      setStep(3)
    }
  }

  return (
    <main className="rs-onboard-page">
      <div className="rs-onboard-brand-wrap"><BrandMark /></div>
      <div className="rs-onboard-stack">
        <div className="rs-onboard-dots-wrap"><StepDots current={step} total={3} /></div>
        {step === 1 && <ScreenStart onCreate={() => setStep(2)} onSignIn={() => router.push('/login')} />}
        {step === 2 && (
          <ScreenSchoolInfo
            loading={loading} onSubmit={handleCreate}
            schoolName={schoolName} setSchoolName={setSchoolName}
            state={stateVal} setState={setStateVal}
            studentCount={studentCount} setStudentCount={setStudentCount}
          />
        )}
        {step === 3 && <ScreenDone onDashboard={() => router.push('/school-admin')} />}
      </div>
    </main>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="rs-onboard-loading" />}>
      <OnboardingContent />
    </Suspense>
  )
}