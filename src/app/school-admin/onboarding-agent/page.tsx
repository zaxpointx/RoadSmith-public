'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Sparkles,
  MessageCircle,
  School,
  Users,
  Calendar,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import ChatPanel from '@/components/onboarding/ChatPanel'
import type { OnboardingState } from '@/components/onboarding/ChatPanel'

// ── Design tokens ──────────────────────────────────────────────────────────
const SURFACE = '#0F0F0F'
const BORDER = 'rgba(255,255,255,0.06)'
const TEXT_SECONDARY = '#9CA3AF'
const TEXT_MUTED = '#6B7280'
const ACCENT = '#4ADE80'


// ── Step cards for the visual overview ──────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    icon: Users,
    title: 'Import Students',
    description: 'Upload a CSV or add students manually',
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.1)',
    path: '/school-admin/import',
  },
  {
    icon: School,
    title: 'Add Instructors',
    description: 'Add the team that will teach your lessons',
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.1)',
    path: '/school-admin/instructors',
  },
  {
    icon: Calendar,
    title: 'Session Types',
    description: 'Set up your lesson offerings and pricing',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
    path: '/school-admin/sessions',
  },
]

// ── Main Page ──────────────────────────────────────────────────────────────
export default function OnboardingAgentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [onboardingState, setOnboardingState] = useState<string>('started')
  const [counts, setCounts] = useState({ students: 0, instructors: 0, sessionTypes: 0 })
  const [progress, setProgress] = useState({
    started: false,
    students_import: false,
    instructors_added: false,
    session_types_set: false,
    complete: false,
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch('/api/onboarding-agent/state')
        if (res.ok) {
          const data = await res.json()
          setOnboardingState(data.state || 'started')
          setProgress(data.progress || progress)
          setCounts(data.counts || counts)
        }
      } catch {
        // API not available — use defaults
      }
      setLoading(false)
    }
    loadState()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  const handleComplete = useCallback(() => {
    router.push('/school-admin')
  }, [router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        gap: '12px',
      }}>
        <Loader2 className="w-6 h-6" style={{ color: ACCENT, animation: 'spin 1s linear infinite' }} />
        <span style={{ color: TEXT_SECONDARY, fontSize: '14px' }}>Loading your setup...</span>
      </div>
    )
  }

  const allDone = progress.complete

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: '#FFFFFF',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.05) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 1,
        borderBottom: `1px solid ${BORDER}`,
        background: SURFACE,
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/school-admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: TEXT_MUTED,
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = TEXT_SECONDARY)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = TEXT_MUTED)}
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div style={{
              width: '1px',
              height: '20px',
              background: BORDER,
            }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${ACCENT}, #22D3EE)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#000' }} />
              </div>
              <span style={{ fontSize: '15px', fontWeight: '600', fontFamily: 'Outfit, sans-serif' }}>
                Setup Assistant
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'none',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BORDER}`,
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                color: TEXT_SECONDARY,
              }}
              className="mobile-hamburger"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 24px 120px',
      }}>
        {/* Status banner */}
        {allDone ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: '16px',
            marginBottom: '32px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(74,222,128,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', marginBottom: '2px' }}>
                Setup Complete!
              </h2>
              <p style={{ fontSize: '13px', color: TEXT_SECONDARY }}>
                Your school is ready to go. The assistant is available if you need help.
              </p>
            </div>
            <button
              onClick={() => router.push('/school-admin')}
              style={{
                padding: '10px 20px',
                background: ACCENT,
                color: '#000',
                border: 'none',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              Go to Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: '16px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(59,130,246,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MessageCircle className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <p style={{ fontSize: '13px', color: TEXT_SECONDARY, lineHeight: 1.5 }}>
              <span style={{ color: '#FFFFFF', fontWeight: '600' }}>Tip:</span> Click the chat bubble in the bottom-right corner to start the guided setup.
              I&apos;ll walk you through everything step by step.
            </p>
          </div>
        )}

        {/* Hero */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '32px',
            fontWeight: '800',
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            marginBottom: '8px',
          }}>
            Get your school running
          </h1>
          <p style={{
            fontSize: '15px',
            color: TEXT_SECONDARY,
            lineHeight: 1.6,
            maxWidth: '600px',
          }}>
            I&apos;ll help you import students, add instructors, and set up your lesson offerings.
            Use the chat or follow the steps below.
          </p>
        </div>

        {/* Progress overview */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '16px',
          }}>
            Progress
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
          }}>
            {[
              { key: 'students_import', label: 'Students', value: counts.students, showCheck: true },
              { key: 'instructors_added', label: 'Instructors', value: counts.instructors, showCheck: true },
              { key: 'session_types_set', label: 'Session Types', value: counts.sessionTypes, showCheck: true },
            ].map(({ key, label, value, showCheck }) => {
              const done = progress[key as keyof typeof progress]
              return (
                <div
                  key={key}
                  style={{
                    padding: '16px',
                    background: SURFACE,
                    border: `1px solid ${done ? 'rgba(74,222,128,0.25)' : BORDER}`,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'border-color 0.3s',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: done ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {done ? (
                      <Check className="w-4 h-4" style={{ color: ACCENT }} />
                    ) : (
                      <div className="w-3 h-3" style={{
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                      }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: done ? ACCENT : TEXT_SECONDARY }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '11px', color: TEXT_MUTED, marginTop: '2px' }}>
                      {done ? `${value} added` : 'Not started'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '16px',
          }}>
            Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}>
            {ONBOARDING_STEPS.map(({ icon: Icon, title, description, color, bgColor, path }) => (
              <button
                key={path}
                onClick={() => router.push(path)}
                style={{
                  padding: '20px',
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,222,128,0.25)'
                  ;(e.currentTarget as HTMLElement).style.background = '#141414'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = BORDER
                  ;(e.currentTarget as HTMLElement).style.background = SURFACE
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  marginBottom: '4px',
                }}>
                  {title}
                </h3>
                <p style={{ fontSize: '12px', color: TEXT_SECONDARY, lineHeight: 1.5 }}>
                  {description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Chat panel (floating) */}
      <ChatPanel
        initialState={onboardingState as OnboardingState}
        onComplete={handleComplete}
        onNavigate={handleNavigate}
      />

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .mobile-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
