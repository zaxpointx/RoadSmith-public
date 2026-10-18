'use client';

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react'
import { BrowserFrame, EyebrowPill, ItalicAccent, RoadsmithWordmark, Starfield } from '@/components/ui'

type LoginErrors = { email?: string; password?: string }

function validate(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {}
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.'
  if (!password) errors.password = 'Password is required.'
  return errors
}

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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [welcome, setWelcome] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoHint, setDemoHint] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Defer to a microtask to avoid cascading renders (lint: set-state-in-effect).
    const welcome = params.get('welcome') === '1'
    const demo = params.get('demo') === '1'
    const welcomeEmail = params.get('email') ?? ''
    if (welcome || demo) {
      const handle = window.setTimeout(() => {
        if (welcome) {
          setWelcome(true)
          setEmail(welcomeEmail)
        }
        if (demo) {
          setDemoHint('Click "Try the demo" to skip sign-in and explore a live demo school.')
        }
      }, 0)
      return () => window.clearTimeout(handle)
    }
    return undefined
  }, [])

  const validation = useMemo(() => validate(email, password), [email, password])
  const hasErrors = Object.keys(validation).length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    setError('')
    if (hasErrors) return
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }
    router.replace('/school-admin')
  }

  const handleGoogleLogin = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: socialError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (socialError) { setError(socialError.message); setLoading(false) }
  }

  const handleDemoLogin = async () => {
    setDemoLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@roadsmith.app', pin: '0000' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Demo login is not enabled in this environment.')
        setDemoLoading(false)
        return
      }
      router.replace('/school-admin')
    } catch {
      setError('Could not reach the demo login endpoint. Try again in a moment.')
      setDemoLoading(false)
    }
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
          <Link href="/signup" className="rs-cta rs-cta-primary">Start free trial</Link>
        </div>
      </nav>

      <main className="rs-login-grid">
        <div className="rs-login-form-col">
          <div className="rs-auth-card rs-login-card">
            <Link href="/" className="rs-back-link"><ArrowLeft size={14} /> Back to home</Link>
            <div className="rs-login-brand"><RoadsmithWordmark size={20} /></div>

            <div className="rs-login-head">
              <EyebrowPill>Welcome back</EyebrowPill>
              <h1 className="rs-auth-card-title">
                {welcome ? "You're all set." : <><span>Sign in to </span><ItalicAccent>your school</ItalicAccent></>}
              </h1>
              <p className="rs-auth-card-sub">
                {welcome ? 'Your school is ready.' : 'Use Google, your password, or the demo school below.'}
              </p>
            </div>

            <button
              type="button"
              className="rs-cta rs-cta-ghost rs-demo-btn"
              onClick={handleDemoLogin}
              disabled={loading || demoLoading}
              data-testid="demo-login-button"
            >
              <span className="rs-demo-prefix">⌐</span>
              {demoLoading ? 'Loading demo…' : 'Try the demo'} — PIN <code className="rs-demo-pin">0000</code>
            </button>

            {demoHint && <p className="rs-demo-hint">{demoHint}</p>}

            <div className="rs-auth-divider"><span>or</span></div>

            <button
              className="rs-cta rs-cta-ghost rs-google-btn"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <GoogleIcon /> Continue with Google
            </button>

            <form onSubmit={handleSubmit} noValidate className="rs-login-form">
              <div className="rs-field-group">
                <label htmlFor="email" className="rs-field-label">Email</label>
                <input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((c) => ({ ...c, email: true }))}
                  placeholder="you@yourschool.com" autoComplete="email"
                  className="rs-field-input"
                  aria-invalid={Boolean(touched.email && validation.email)}
                />
                {touched.email && validation.email && <p className="rs-field-error">{validation.email}</p>}
              </div>

              <div className="rs-field-group">
                <div className="rs-field-label-row">
                  <label htmlFor="password" className="rs-field-label">Password</label>
                  <Link href="/forgot-password" className="rs-field-link">
                    <KeyRound size={12} /> Forgot?
                  </Link>
                </div>
                <div className="rs-field-input-wrap">
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((c) => ({ ...c, password: true }))}
                    placeholder="Your password" autoComplete="current-password"
                    className="rs-field-input"
                    aria-invalid={Boolean(touched.password && validation.password)}
                  />
                  <button type="button" className="rs-field-toggle" onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {touched.password && validation.password && <p className="rs-field-error">{validation.password}</p>}
              </div>

              {error && <p className="rs-form-error">{error}</p>}

              <button className="rs-cta rs-cta-primary rs-cta-glow" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="rs-auth-foot-link">
              Don&apos;t have an account? <Link href="/signup" className="rs-field-link">Start free trial</Link>
            </p>
          </div>
        </div>

        <div className="rs-login-preview">
          <div className="rs-login-preview-glow" aria-hidden="true" />
          <BrowserFrame url="roadsmith.app/dashboard" live>
            <Image src="/dashboard-preview.png" alt="Roadsmith dashboard preview" width={1440} height={913} priority className="rs-login-preview-img" />
          </BrowserFrame>
          <p className="rs-login-preview-caption">Live preview · demo data, refreshed every minute</p>
        </div>
      </main>
    </div>
  )
}
