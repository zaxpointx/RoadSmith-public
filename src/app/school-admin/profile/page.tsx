'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Save, Globe, Mail } from 'lucide-react'

// NAV_ITEMS removed — layout provides the sidebar

const BG = '#0D0D12'
const GLASS_BG = 'rgba(255,255,255,0.03)'
const GLASS_BLUR = 'blur(24px)'
const TEXT_SECONDARY = '#9CA3AF'
const ACCENT_GREEN = '#4ADE80'
const CARD_SHADOW = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'

export default function SchoolProfilePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '14px', color: TEXT_SECONDARY }}>Loading...</p>
    </div>}>
      <ProfileContent />
    </Suspense>
  )
}

function ProfileContent() {
  const params = useSearchParams()
  const schoolId = params.get('school_id')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ tagline: '', about: '', address: '', city: '', zip: '', email: '', website: '', facebook: '', instagram: '', state: '' })
  const [slug, setSlug] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Load existing profile on mount
  useEffect(() => {
    async function loadProfile() {
      if (!schoolId) {
        // Try resolving school from auth
        const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
        if (demoCookie) {
          try {
            const { schoolId: sid } = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1])))
            if (!sid) { setLoadingProfile(false); return }
            // Fetch school info from demo API to get slug
            const res = await fetch('/api/demo/school')
            if (res.ok) {
              const data = await res.json()
              if (data.slug) setSlug(data.slug)
            }
            // Load profile via schools API
            await fetch('/api/schools?school_id=' + encodeURIComponent(sid))
            // schools GET doesn't return profile, try the public endpoint
            // Fallback: just load the slug from demo school endpoint
            setLoadingProfile(false)
            return
          } catch {}
        }
        setLoadingProfile(false)
        return
      }

      // Load school info to get slug
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingProfile(false); return }
      const { data: school } = await (supabase.from('schools').select('id, slug').eq('id', schoolId).single() as unknown as Promise<{ data: { id: string; slug: string | null } | null }>)
      if (school?.slug) setSlug(school.slug)

      // Load existing profile via API
      try {
        const res = await fetch('/api/schools/' + encodeURIComponent(school?.slug || schoolId))
        if (res.ok) {
          const data = await res.json()
          const profile = data.profile || {}
          if (profile.tagline || profile.about) {
            setForm({
              tagline: profile.tagline || '',
              about: profile.about || '',
              address: profile.address || '',
              city: profile.city || '',
              zip: profile.zip || '',
              email: profile.email || '',
              website: profile.website || '',
              facebook: profile.facebook || '',
              instagram: profile.instagram || '',
              state: profile.state || '',
            })
          }
        }
      } catch {}
      setLoadingProfile(false)
    }
    loadProfile()
  }, [schoolId])

  function handleChange(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })); setSaved(false) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const targetSlug = slug || schoolId || 'current'
    try {
      const res = await fetch(`/api/schools/${encodeURIComponent(targetSlug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-school-id': schoolId ?? '' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch {}
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: '600', color: TEXT_SECONDARY, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }

  return (
      <div className="admin-main">

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px', letterSpacing: '-0.01em' }}>School Profile</h1>
          <p style={{ fontSize: '14px', color: TEXT_SECONDARY }}>Customize your public booking page.</p>
        </div>

        {/* Public URL preview - glass */}
        <div style={{ padding: '16px 20px', background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid rgba(74,222,128,0.2)`, borderRadius: '16px', marginBottom: '24px', boxShadow: CARD_SHADOW }}>
          <div style={{ fontSize: '11px', color: TEXT_SECONDARY, marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your booking URL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <code style={{ fontSize: '13px', color: ACCENT_GREEN, flex: 1, fontFamily: 'monospace' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/school/{slug || '[your-slug]'}</code>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="your-school-name" style={{ ...inputStyle, width: '160px' }} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Tagline</label>
            <input value={form.tagline} onChange={e => handleChange('tagline', e.target.value)} placeholder="Build confidence. Drive safe." style={inputStyle} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
          </div>
          <div>
            <label style={labelStyle}>About Your School</label>
            <textarea value={form.about} onChange={e => handleChange('about', e.target.value)} placeholder="Tell students who you are, what makes your school different..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Street Address</label><input value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="123 Main St" style={inputStyle} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} /></div>
            <div><label style={labelStyle}>City</label><input value={form.city} onChange={e => handleChange('city', e.target.value)} placeholder="Oak Ridge" style={inputStyle} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>State</label><input value={form.state} onChange={e => handleChange('state', e.target.value)} placeholder="TN" maxLength={2} style={inputStyle} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} /></div>
            <div><label style={labelStyle}>ZIP</label><input value={form.zip} onChange={e => handleChange('zip', e.target.value)} placeholder="37830" style={inputStyle} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} /></div>
          </div>
            <div><label style={labelStyle}><Mail className="w-3 h-3" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Contact Email</label><input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="contact@school.com" style={inputStyle} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}><Globe className="w-3 h-3" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Website</label><input value={form.website} onChange={e => handleChange('website', e.target.value)} placeholder="https://..." style={inputStyle} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} /></div>
            <div><label style={labelStyle}>Facebook</label><input value={form.facebook} onChange={e => handleChange('facebook', e.target.value)} placeholder="https://facebook.com/..." style={inputStyle} onFocus={e => (e.target.style.borderColor = '#4ADE80')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} /></div>
          </div>
          {saved && <div style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: ACCENT_GREEN, background: 'rgba(74,222,128,0.1)' }}>✓ Profile saved</div>}
          <button type="submit" disabled={saving} style={{ width: '100%', padding: '14px', background: ACCENT_GREEN, border: 'none', borderRadius: '12px', color: '#000000', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(74,222,128,0.3)' } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
  )
}
