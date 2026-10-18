'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function InstructorLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleDemoLogin() {
    setDemoLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'demo@roadsmith.io', pin: '0000' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Demo login failed.')
        setDemoLoading(false)
        return
      }
      router.replace('/instructor/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setDemoLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      if (email.trim().toLowerCase() === 'demo@roadsmith.io' || pin.trim()) {
        const res = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: email.trim(), pin: pin.trim() }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error ?? 'Demo login failed.')
          setLoading(false)
          return
        }
        router.replace('/instructor/dashboard')
        return
      }

      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/instructor/dashboard`,
        },
      })

      if (authError) {
        setError(authError.message)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-base, #090a05)', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.08) 0%, transparent 60%)' }}>
      {/* Noise texture overlay */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      <div className="w-full max-w-md mx-6 relative z-10">
        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #4ADE80, #22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 6v12l8 4 8-4V6l-8-4z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 6l4 2-4 8-4-8 4-2z" fill="white" opacity="0.4" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>Roadsmith</span>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(17,17,17,0.8)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          {!sent ? (
            <>
              {/* Header */}
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', marginBottom: '20px' }}>
                  <Mail className="w-5 h-5" style={{ color: '#4ADE80' }} />
                </div>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>Instructor Login</h1>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>Enter your email to receive a magic link to access your dashboard.</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="instructor@school.com"
                    required
                    style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#ffffff', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(74,222,128,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Demo PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="0000"
                    style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#ffffff', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(74,222,128,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px' }}>
                    <AlertCircle className="w-4 h-4" style={{ color: '#EF4444', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#F87171' }}>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || demoLoading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 20px', background: loading ? 'rgba(74,222,128,0.5)' : 'linear-gradient(135deg, #4ADE80, #22C55E)', border: 'none', borderRadius: '14px', color: '#ffffff', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'opacity 0.2s' }}
                >
                  {loading ? 'Signing in...' : pin.trim() || email.trim().toLowerCase() === 'demo@roadsmith.io' ? <>Enter Demo <ArrowRight className="w-4 h-4" /></> : <>Send Magic Link <ArrowRight className="w-4 h-4" /></>}
                </button>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading || demoLoading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#ffffff', fontSize: '15px', fontWeight: '700', cursor: loading || demoLoading ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'background 0.2s' }}
                >
                  {demoLoading ? 'Loading demo...' : <>Try Demo <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', marginBottom: '24px' }}>
                  <CheckCircle className="w-6 h-6" style={{ color: '#4ADE80' }} />
                </div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '12px' }}>Check your email</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', marginBottom: '24px' }}>
                  We sent a magic link to <strong style={{ color: '#ffffff' }}>{email}</strong>.<br />
                  Click it to sign in to your instructor dashboard.
                </p>
                <button
                  onClick={() => setSent(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
                >
                  Use a different email
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          Not an instructor? <a href="/login" style={{ color: 'rgba(74,222,128,0.8)', textDecoration: 'none' }}>School owner login</a>
        </p>
      </div>
    </div>
  )
}
