'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, User, Calendar, Hash, Phone, Mail, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const GLASS_BG = 'rgba(255,255,255,0.03)'
const GLASS_BORDER = 'rgba(255,255,255,0.06)'
const GLASS_SHADOW = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
const ACCENT = '#4ADE80'
const ACCENT_DIM = 'rgba(255,140,66,0.12)'
const SUCCESS = '#4ADE80'


const glassCard = {
  background: GLASS_BG,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${GLASS_BORDER}`,
  borderRadius: '24px',
  boxShadow: GLASS_SHADOW,
}

const glassInput = {
  background: GLASS_BG,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${GLASS_BORDER}`,
  color: '#ffffff',
  outline: 'none',
  borderRadius: '999px',
  padding: '12px 20px',
  fontSize: '14px',
  width: '100%' as const,
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.2s',
}

const labelStyle = {
  fontFamily: 'Inter, sans-serif',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '12px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: '8px',
  display: 'block',
}

function CompleteProfileForm() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'form' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSchoolOwner, setIsSchoolOwner] = useState(false)
  const [student, setStudent] = useState({
    legal_name: '',
    dob: '',
    permit_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    parent_email: '',
  })


  useEffect(() => {
    async function detectRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.school_id) {
        setIsSchoolOwner(true)
        router.replace('/school-admin')
      }
    }
    detectRole()
  }, [router, supabase.auth])

  if (isSchoolOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D12', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(255,140,66,0.06) 0%, transparent 60%)' }}>
        <div style={{ ...glassCard, padding: '32px', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
          <div className="text-4xl mb-4">🏫</div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>School Admin Dashboard</h1>
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>Redirecting you to your school admin panel...</p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // SECURITY: encryption is server-side only. POST plaintext to API;
    // server encrypts PII before storing. Client-side encryption with a
    // public key was not encryption — anyone with the bundle could decrypt.
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated. Please sign in first.'); setLoading(false); return }

      const res = await fetch('/api/students/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_name: student.legal_name,
          dob: student.dob,
          permit_number: student.permit_number,
          emergency_contact_name: student.emergency_contact_name,
          emergency_contact_phone: student.emergency_contact_phone,
          parent_email: student.parent_email,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save profile')
      } else {
        setStep('done')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: '#0D0D12', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(255,140,66,0.06) 0%, transparent 60%)' }}>
        <div className="bg-circle w-96 h-96 -top-20 -left-20" style={{ background: `radial-gradient(circle, ${ACCENT_DIM} 0%, transparent 70%)` }} />
        <div className="text-center relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <CheckCircle className="w-10 h-10" style={{ color: SUCCESS }} />
          </motion.div>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>You&apos;re all set!</h1>
          <p className="text-base mb-8" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>Profile complete. Book your first lesson at the dashboard.</p>
          <a href="/school-admin"
            style={{ background: SUCCESS, color: '#000', padding: '16px 32px', borderRadius: '100px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px', textDecoration: 'none', fontFamily: 'Outfit, sans-serif' }}>
            Go to Dashboard <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: '#0D0D12', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(255,140,66,0.06) 0%, transparent 60%)' }}>
      {/* decorative circles */}
      <div className="bg-circle w-[500px] h-[500px] -top-40 -left-40" style={{ background: `radial-gradient(circle, ${ACCENT_DIM} 0%, transparent 70%)` }} />
      <div className="bg-circle w-[400px] h-[400px] bottom-20 -right-32" style={{ background: 'radial-gradient(circle, rgba(112,123,255,0.1) 0%, transparent 70%)' }} />

      <div className="max-w-lg w-full relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF6B1E)` }}>DC</div>
          <span className="font-semibold text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Roadsmith</span>
        </div>

        <div style={{ ...glassCard, padding: '36px 32px' }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.35)' }}>Step 1 of 1</div>
          <h1 className="text-2xl font-bold mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>Complete your profile</h1>
          <p className="text-sm mb-7" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
            One more step before booking. We need your permit and contact details.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Legal name */}
            <div>
              <label className="block" style={labelStyle}>
                <User className="w-3.5 h-3.5 inline mr-1.5" />Legal Name (as on permit)
              </label>
              <input type="text" value={student.legal_name} onChange={e => setStudent({ ...student, legal_name: e.target.value })}
                placeholder="Jane Marie Smith" required
                onFocus={e => (e.target.style.borderColor = `${ACCENT}80`)}
                onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                style={glassInput} />
            </div>

            {/* DOB + Permit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block" style={labelStyle}>
                  <Calendar className="w-3.5 h-3.5 inline mr-1.5" />Date of Birth
                </label>
                <input type="date" value={student.dob} onChange={e => setStudent({ ...student, dob: e.target.value })} required
                  onFocus={e => (e.target.style.borderColor = `${ACCENT}80`)}
                  onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  style={{ ...glassInput, borderRadius: '12px', height: '52px' }} />
              </div>
              <div>
                <label className="block" style={labelStyle}>
                  <Hash className="w-3.5 h-3.5 inline mr-1.5" />Permit Number
                </label>
                <input type="text" value={student.permit_number} onChange={e => setStudent({ ...student, permit_number: e.target.value })}
                  placeholder="L1234567" required
                  onFocus={e => (e.target.style.borderColor = `${ACCENT}80`)}
                  onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                  style={{ ...glassInput, borderRadius: '12px', height: '52px' }} />
              </div>
            </div>

            {/* Emergency contact section */}
            <div className="rounded-2xl p-4" style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.35)' }}>Emergency Contact</div>
              <div className="space-y-3">
                <div>
                  <label className="block" style={{ ...labelStyle, marginBottom: '6px' }}>Contact Name</label>
                  <input type="text" value={student.emergency_contact_name} onChange={e => setStudent({ ...student, emergency_contact_name: e.target.value })}
                    placeholder="John Smith" required
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}80`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                    style={glassInput} />
                </div>
                <div>
                  <label className="block" style={labelStyle}>
                    <Phone className="w-3.5 h-3.5 inline mr-1.5" />Contact Phone
                  </label>
                  <input type="tel" value={student.emergency_contact_phone} onChange={e => setStudent({ ...student, emergency_contact_phone: e.target.value })}
                    placeholder="(555) 867-5309" required
                    onFocus={e => (e.target.style.borderColor = `${ACCENT}80`)}
                    onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                    style={glassInput} />
                </div>
              </div>
            </div>

            {/* Parent email */}
            <div>
              <label className="block" style={labelStyle}>
                <Mail className="w-3.5 h-3.5 inline mr-1.5" />Parent / Guardian Email {student.dob && new Date().getFullYear() - new Date(student.dob).getFullYear() < 18 ? '*' : '(optional)'}
              </label>
              <input type="email" value={student.parent_email} onChange={e => setStudent({ ...student, parent_email: e.target.value })}
                placeholder="parent@example.com"
                onFocus={e => (e.target.style.borderColor = `${ACCENT}80`)}
                onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
                style={glassInput} />
            </div>

            {/* Encryption notice */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl" style={{ background: `${ACCENT_DIM}`, border: `1px solid ${ACCENT}20` }}>
              <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />
              <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)' }}>Your sensitive information is encrypted and stored securely. We never share your personal data.</span>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: SUCCESS, color: '#000', padding: '16px 24px', borderRadius: '100px', fontWeight: '600', border: 'none', cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontFamily: 'Outfit, sans-serif', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Saving...' : 'Complete Profile'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0D0D12' }} />}>
      <CompleteProfileForm />
    </Suspense>
  )
}
