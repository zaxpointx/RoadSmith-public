'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Copy, Mail, Shield, Sparkles } from 'lucide-react'

export default function DemoPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function openDemo() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'demo@roadsmith.io', pin: '0000' }),
      })
      if (res.ok) {
        router.replace('/school-admin')
      } else {
        setError('Demo unavailable - check DEMO_MODE and seed data.')
        setLoading(false)
      }
    } catch {
      setError('Demo unavailable - check the local server and try again.')
      setLoading(false)
    }
  }

  async function copyDemoLink() {
    const demoUrl = `${window.location.origin}/demo`
    await navigator.clipboard.writeText(demoUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090a05',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 20% 10%, rgba(166,255,63,0.14), transparent 34%), radial-gradient(ellipse at 80% 30%, rgba(58,255,180,0.08), transparent 32%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '56px clamp(20px, 5vw, 52px)',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, 0.95fr)',
        gap: '36px',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
      }} className="demo-grid">
        <section>
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            color: '#A6FF3F',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '26px',
          }}>
            <Sparkles className="w-4 h-4" />
            RoadSMITH live prototype
          </Link>

          {/* Demo Data Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'rgba(166,255,63,0.12)',
            border: '1px solid rgba(166,255,63,0.25)',
            color: '#A6FF3F',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            <Shield className="w-3 h-3" />
            Demo Data Only — Sandbox Environment
          </div>

          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(44px, 7vw, 82px)',
            lineHeight: 0.98,
            letterSpacing: '-0.04em',
            margin: '0 0 24px',
            maxWidth: '820px',
          }}>
            The driving school command center.
          </h1>
          <p style={{
            color: '#B9C0B2',
            fontSize: '18px',
            lineHeight: 1.7,
            maxWidth: '650px',
            margin: '0 0 32px',
          }}>
            This demo opens as a school owner with <strong style={{color:'#fff'}}>sandbox data</strong> — realistic students, instructors, sessions, and bookings. Use it to evaluate the operating workflow, not production data. Real schools signing up will never see demo data.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
            <button
              type="button"
              onClick={openDemo}
              disabled={loading}
              style={{
                minHeight: '52px',
                border: '0',
                borderRadius: '12px',
                padding: '0 20px',
                background: 'linear-gradient(135deg, #A6FF3F, #47FF9B)',
                color: '#050605',
                fontWeight: 900,
                fontSize: '14px',
                cursor: loading ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 16px 46px rgba(166,255,63,0.18)',
              }}
            >
              {loading ? 'Opening demo...' : 'Enter as school owner'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={copyDemoLink}
              style={{
                minHeight: '52px',
                borderRadius: '12px',
                padding: '0 18px',
                background: '#151812',
                border: '1px solid rgba(255,255,255,0.09)',
                color: '#E7ECE2',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied' : 'Copy demo link'}
            </button>
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '14px', margin: 0 }}>{error}</p>
          )}
        </section>

        <aside style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
          borderRadius: '22px',
          padding: '22px',
          boxShadow: '0 28px 80px rgba(0,0,0,0.36)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '18px',
            marginBottom: '18px',
          }}>
            <div>
              <p style={{ color: '#A6FF3F', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Demo access</p>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', margin: 0 }}>Roadsmith</h2>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: 'rgba(166,255,63,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A6FF3F',
            }}>
              <Shield className="w-5 h-5" />
            </div>
          </div>

          {[
            'Owner dashboard with live school KPIs',
            'Students, instructors, sessions, and bookings',
            'Demo payment flow without charging a card',
            'Booking link flow for parent/student view',
            'Instructor schedule and daily workflow',
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '11px 0' }}>
              <CheckCircle className="w-4 h-4" style={{ color: '#A6FF3F', flexShrink: 0 }} />
              <span style={{ color: '#DDE5D7', fontSize: '14px' }}>{item}</span>
            </div>
          ))}

          <div style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '16px',
            background: 'rgba(166,255,63,0.07)',
            border: '1px solid rgba(166,255,63,0.16)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
            <Mail className="w-4 h-4" style={{ color: '#A6FF3F', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ color: '#B9C0B2', fontSize: '13px', lineHeight: 1.55, margin: 0 }}>
              For the final Matt demo, this page should also send a real access email when Resend is configured. Until then, the direct demo link is the reliable path.
            </p>
          </div>
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 860px) {
          .demo-grid {
            display: flex !important;
            flex-direction: column !important;
            grid-template-columns: 1fr !important;
            gap: 28px !important;
            align-items: start !important;
            padding-top: 36px !important;
          }

          .demo-grid section,
          .demo-grid aside {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
