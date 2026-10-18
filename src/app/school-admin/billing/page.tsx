'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// NAV_ITEMS removed — layout provides the sidebar

const GLASS_BG = 'var(--glass-bg)'
const GLASS_BORDER = 'var(--glass-border)'
const GLASS_BLUR = 'var(--glass-blur)'
const TEXT_SECONDARY = 'var(--text-secondary)'
const CARD_SHADOW = 'var(--glass-shadow)'

type Subscription = { subscription_status: string | null; stripe_customer_id: string | null }

export default function BillingPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      let schoolId: string | null = null
      const demoCookie = document.cookie.split('; ').find(c => c.startsWith('demo_user='))
      if (demoCookie) { try { schoolId = JSON.parse(atob(decodeURIComponent(demoCookie.split('=')[1]))).schoolId } catch {} }
      if (!schoolId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }
        const { data: school } = await supabase.from('schools').select('id').eq('owner_user_id', user.id).single()
        if (!school) { setLoading(false); return }
        schoolId = school.id
      }
      const { data } = await supabase.from('schools').select('id, name, subscription_status, stripe_customer_id').eq('id', schoolId)
      setSubscription(data as unknown as Subscription); setLoading(false)
    }
    load()
  }, [router])

  async function openBillingPortal() {
    // Stripe billing portal requires real Stripe account setup. In prototype/demo mode,
    // show a friendly message instead of failing or calling an unconfigured endpoint.
    if (true) {
      // Stub: no real Stripe account configured yet — billing UI works but portal is N/A
      alert('Stripe billing portal requires a connected Stripe account.\n\nFor the prototype, billing is shown as active. When Stripe is connected, this will open the Stripe customer portal where you can manage subscriptions, invoices, and payment methods.')
      return
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <p style={{ fontSize: '14px', color: TEXT_SECONDARY }}>Loading...</p>
      </div>
    )
  }

  const status = subscription?.subscription_status || 'trial'
  const statusBg = status === 'active' ? 'color-mix(in srgb, var(--admin-accent), transparent 85%)' : status === 'past_due' ? 'color-mix(in srgb, var(--accent-secondary), transparent 85%)' : 'color-mix(in srgb, var(--status-blue), transparent 85%)'
  const statusColor = status === 'active' ? 'var(--accent)' : status === 'past_due' ? 'var(--accent-secondary)' : 'var(--accent-secondary)'
  const statusIcon = status === 'active' ? <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} /> : status === 'past_due' ? <AlertCircle className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} /> : <CreditCard className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} />

  return (
      <div className="admin-main billing-page">

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.01em' }}>Billing</h1>
          <p style={{ fontSize: '14px', color: TEXT_SECONDARY }}>Manage your subscription and payment settings.</p>
        </div>

        {/* Status banner */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px', background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', marginBottom: '24px', boxShadow: CARD_SHADOW }}>
          <div style={{ marginTop: '2px', flexShrink: 0 }}>{statusIcon}</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: statusColor, marginBottom: '2px' }}>{status === 'active' ? 'Subscription active' : status === 'past_due' ? 'Payment past due' : 'Free trial'}</div>
            <div style={{ fontSize: '12px', color: TEXT_SECONDARY }}>{status === 'active' ? 'Your subscription is active and billing is up to date.' : status === 'past_due' ? 'Please update your payment method to avoid service interruption.' : 'Free plan — upgrade anytime to unlock all features.'}</div>
          </div>
        </div>

        {/* Plan card */}
        <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', padding: '28px', boxShadow: CARD_SHADOW, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: TEXT_SECONDARY, marginBottom: '4px' }}>Current Plan</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: '800', color: 'var(--accent)' }}>Starter</div>
              <div style={{ fontSize: '14px', color: TEXT_SECONDARY }}>$99/month</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', background: statusBg, color: statusColor }}>{status}</span>
          </div>
          <div style={{ paddingTop: '20px', borderTop: `1px solid ${GLASS_BORDER}`, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {['Unlimited bookings', 'SMS + email reminders', 'TCA compliance tracking', 'Certificate issuance', 'CSV student import', 'Stripe payments'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: TEXT_SECONDARY }}>
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent)', flexShrink: 0 }} />{f}
              </div>
            ))}
          </div>
          <button onClick={openBillingPortal} style={{ width: '100%', padding: '12px', background: 'transparent', border: `1px solid ${GLASS_BORDER}`, borderRadius: '12px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--text-primary), transparent 96%)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>Manage subscription</button>
        </div>

        {/* Payment method */}
        {subscription?.stripe_customer_id && (
          <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', padding: '24px', boxShadow: CARD_SHADOW }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Payment method</div>
              <CreditCard className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
            </div>
            <div style={{ fontSize: '13px', color: TEXT_SECONDARY }}>Visa ending 4242<span style={{ marginLeft: '8px' }}>Expires 12/26</span></div>
            <button onClick={openBillingPortal} style={{ marginTop: '16px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, transition: 'opacity 0.15s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}>Update payment method <ExternalLink className="w-3 h-3" /></button>
          </div>
        )}
      </div>
  )
}
