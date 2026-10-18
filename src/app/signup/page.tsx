'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { EyebrowPill, ItalicAccent, RoadsmithWordmark, Starfield } from '@/components/ui'

type SignupErrors = { schoolName?: string; name?: string; email?: string; password?: string }

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="rs-google-icon">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function passwordStrength(pw: string): { label: string; pct: number; tone: string } | null {
  if (!pw) return null
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { label: 'Weak', pct: 25, tone: 'var(--rs-danger, #ef4444)' }
  if (score <= 3) return { label: 'Okay', pct: 60, tone: 'var(--rs-warning, #f59e0b)' }
  return { label: 'Strong', pct: 100, tone: 'var(--rs-green, #22c55e)' }
}

function validate(schoolName: string, name: string, email: string, password: string): SignupErrors {
  const errors: SignupErrors = {}
  if (!schoolName.trim()) errors.schoolName = 'School name is required.'
  if (!name.trim()) errors.name = 'Your name is required.'
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < 6) errors.password = 'Use at least 6 characters.'
  return errors
}

const PLAN_LABELS: Record<string, { name: string; price: string }> = {
  starter: { name: 'Starter', price: '$99/mo' },
  growth: { name: 'Growth', price: '$199/mo' },
  enterprise: { name: 'Enterprise', price: '$499/mo' },
}

export default function SignupPage() {
  const router = useRouter()
  const [schoolName, setSchoolName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('plan')
    if (p && PLAN_LABELS[p]) {
      // Defer to a microtask to avoid cascading renders (lint: set-state-in-effect).
      const handle = window.setTimeout(() => setPlan(p), 0)
      return () => window.clearTimeout(handle)
    }
    return undefined
  }, [])

  const validation = useMemo(() => validate(schoolName, name, email, password), [schoolName, name, email, password])
  const hasErrors = Object.keys(validation).length > 0
  const strength = useMemo(() => passwordStrength(password), [password])
  const planInfo = plan ? PLAN_LABELS[plan] : null

  const touchAll = () => setTouched({ schoolName: true, name: true, email: true, password: true })
  const markTouched = (field: string) => setTouched((current) => ({ ...current, [field]: true }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    touchAll(); setError('')
    if (hasErrors) return
    setLoading(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolName: schoolName.trim(), ownerName: name.trim(), email: email.trim(), password, plan: plan ?? undefined }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Signup failed. Please try again.' }))
      setError(data.error || 'Signup failed. Please try again.')
      setLoading(false); return
    }
    router.replace('/school-admin')
  }

  const handleGoogleSignup = async () => {
    touchAll(); setError('')
    if (!schoolName.trim() || !name.trim()) { setError('Enter your school name and your name before using Google.'); return }
    setLoading(true)
    const callback = new URL(`${window.location.origin}/auth/callback`)
    callback.searchParams.set('mode', 'signup')
    callback.searchParams.set('schoolName', schoolName.trim())
    callback.searchParams.set('ownerName', name.trim())
    if (plan) callback.searchParams.set('plan', plan)
    const supabase = createClient()
    const { error: socialError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback.toString() } })
    if (socialError) { setError(socialError.message); setLoading(false) }
  }

  return (
    <div className="rs-auth-page">
      <Starfield />
      <nav className="rs-auth-nav">
        <RoadsmithWordmark href="/" />
        <div className="rs-auth-nav-right">
          <div className="rs-auth-nav-links">
            <Link href="/#features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Demo</Link>
          </div>
          <Link href="/login" className="rs-cta rs-cta-ghost">Sign in</Link>
        </div>
      </nav>

      <main className="rs-signup-main">
        <div className="rs-auth-card rs-auth-card-wide">
          <Link href="/" className="rs-back-link"><ArrowLeft size={14} /> Back to home</Link>
          <div className="rs-login-brand"><RoadsmithWordmark size={20} /></div>

          <div className="rs-login-head">
            <EyebrowPill>14-day free trial</EyebrowPill>
            <h1 className="rs-auth-card-title">Start your <ItalicAccent>free trial</ItalicAccent></h1>
            <p className="rs-auth-card-sub">14 days. No card required. Cancel anytime.</p>
          </div>

          {planInfo && (
            <div className="rs-plan-badge" data-testid="plan-badge">
              <span className="rs-plan-badge-stack">
                <span className="rs-plan-badge-eyebrow">Selected plan</span>
                <span className="rs-plan-badge-name">{planInfo.name} · <span className="rs-plan-badge-price">{planInfo.price}</span></span>
              </span>
              <Link href="/pricing" className="rs-field-link">Change</Link>
            </div>
          )}

          <button className="rs-cta rs-cta-ghost rs-google-btn" type="button" onClick={handleGoogleSignup} disabled={loading}>
            <GoogleIcon /> Sign up with Google
          </button>

          <div className="rs-auth-divider"><span>or with email</span></div>

          <form onSubmit={handleSubmit} noValidate className="rs-login-form">
            <div className="rs-field-group">
              <label htmlFor="schoolName" className="rs-field-label">School name</label>
              <input id="schoolName" type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
                onBlur={() => markTouched('schoolName')} placeholder="Showcase Driving Academy"
                autoComplete="organization" className="rs-field-input"
                aria-invalid={Boolean(touched.schoolName && validation.schoolName)} />
              {touched.schoolName && validation.schoolName && <p className="rs-field-error">{validation.schoolName}</p>}
            </div>

            <div className="rs-field-group">
              <label htmlFor="name" className="rs-field-label">Your name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                onBlur={() => markTouched('name')} placeholder="Jordan Lee"
                autoComplete="name" className="rs-field-input"
                aria-invalid={Boolean(touched.name && validation.name)} />
              {touched.name && validation.name && <p className="rs-field-error">{validation.name}</p>}
            </div>

            <div className="rs-field-group">
              <label htmlFor="email" className="rs-field-label">Work email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched('email')} placeholder="you@yourschool.com"
                autoComplete="email" className="rs-field-input"
                aria-invalid={Boolean(touched.email && validation.email)} />
              {touched.email && validation.email && <p className="rs-field-error">{validation.email}</p>}
            </div>

            <div className="rs-field-group">
              <label htmlFor="password" className="rs-field-label">Password</label>
              <div className="rs-field-input-wrap">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} onBlur={() => markTouched('password')}
                  placeholder="At least 6 characters" autoComplete="new-password"
                  className="rs-field-input"
                  aria-invalid={Boolean(touched.password && validation.password)} />
                <button type="button" className="rs-field-toggle" onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {strength && (
                <div className="rs-pw-strength" data-testid="pw-strength">
                  <div className="rs-pw-bar"><span className="rs-pw-fill" style={{ width: `${strength.pct}%`, background: strength.tone }} /></div>
                  <span className="rs-pw-label" style={{ color: strength.tone }}>{strength.label}</span>
                </div>
              )}
              {touched.password && validation.password && <p className="rs-field-error">{validation.password}</p>}
            </div>

            {error && <p className="rs-form-error">{error}</p>}

            <button className="rs-cta rs-cta-primary rs-cta-glow" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="rs-auth-foot-link">
            Already have an account? <Link href="/login" className="rs-field-link">Sign in</Link>
          </p>
          <p className="rs-auth-foot-tos">
            By creating an account you agree to our{' '}
            <Link href="/legal/terms" className="rs-field-link">Terms of Service</Link> and{' '}
            <Link href="/legal/privacy" className="rs-field-link">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
