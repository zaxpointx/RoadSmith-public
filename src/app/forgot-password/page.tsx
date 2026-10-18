'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background geometric */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-[#4ADE80]/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[#4ADE80]/5 blur-3xl" />
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-white/[0.03] to-transparent" />
        <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg bg-[#4ADE80] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 5.5H3L8 2Z" fill="black" fillOpacity="0.9" />
              <path d="M3 5.5V10.5L8 14V8.5H13V5.5H3Z" fill="black" fillOpacity="0.6" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 18, color: '#fff' }}>
            Roadsmith
          </span>
        </div>

        {!sent ? (
          <>
            <div className="mb-8">
              <h1 className="text-white" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
                Forgot password?
              </h1>
              <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.6 }}>
                No worries. Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#D1D5DB', marginBottom: 8 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3.5 rounded-xl text-white text-sm placeholder:text-white/30 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4ADE80'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {error && (
                <p style={{ color: '#F87171', fontSize: 13 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-black font-semibold text-sm transition-all duration-200 mt-2"
                style={{ background: '#4ADE80' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#22C55E')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4ADE80')}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                style={{ fontSize: 14, color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#4ADE80')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
              >
                ← Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/20 flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-white" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
                Check your email
              </h2>
              <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
                We sent a password reset link to <span style={{ color: '#fff', fontWeight: 500 }}>{email}</span>.<br />
                Click the link to set a new password.
              </p>
              <button
                onClick={() => setSent(false)}
                style={{ fontSize: 14, color: '#4ADE80', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Didn&apos;t receive it? Try again
              </button>
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/login"
                style={{ fontSize: 14, color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#4ADE80')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
              >
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
