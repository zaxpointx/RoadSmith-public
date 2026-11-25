import '../../os.css'
import { notFound } from 'next/navigation'
import { Mark } from '@/components/os/Mark'
import { SandboxCheckout } from '@/components/os/SandboxCheckout'
import { ready } from '@/lib/os/sandbox'
import { paymentByToken } from '@/lib/os/payments'
import { loadSchool } from '@/lib/os/school'
import { now } from '@/lib/os/clock'
import { fmtMoney, fmtWhen } from '@/lib/os/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Payment — Roadsmith', robots: { index: false } }

export default async function PayPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params
  const sp = await searchParams
  const db = await ready()
  const p = await paymentByToken(db, token)
  if (!p) notFound()
  const school = (await loadSchool(db, p.school_id))!
  const amount = fmtMoney(p.amount_cents, p.currency)
  const expired = p.expires_at && new Date(p.expires_at) < now() && ['pending', 'failed'].includes(p.status)
  const status = expired ? 'expired' : p.status
  return (
    <div className="rs" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <main className="rs-panel" style={{ maxWidth: 440, width: '100%', padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}><Mark /><strong style={{ fontSize: 16 }}>{school.name}</strong></div>
        {p.provider === 'sandbox' ? <p className="rs-tag rs-tag--amber" style={{ marginBottom: 14 }}>Test checkout — no card is charged</p> : null}
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>{p.description}</h1>
        <p style={{ fontSize: 34, fontWeight: 900, margin: '10px 0 16px' }}>{amount}</p>
        {status === 'paid' ? (
          <div className="rs-result" role="status" style={{ fontSize: 15 }}>Paid{p.paid_at ? ` ${fmtWhen(new Date(p.paid_at), school.timezone)}` : ''}. Your confirmation was sent by text — you can close this page.</div>
        ) : status === 'refunded' ? (
          <div className="rs-result" role="status">This payment was refunded.</div>
        ) : status === 'expired' ? (
          <div className="rs-result rs-result--err" role="status">This link has expired, so the time it was holding was released. Text {school.name} and the assistant will find a new one.</div>
        ) : status === 'cancelled' ? (
          <div className="rs-result rs-result--err" role="status">This payment was cancelled. Nothing was charged.</div>
        ) : (
          <>
            {p.status === 'failed' ? <p className="rs-result rs-result--err" style={{ marginBottom: 12 }}>The last attempt didn&apos;t go through ({p.failure_reason}). Nothing was charged — you can try again.</p> : null}
            {p.expires_at ? <p className="rs-help" style={{ marginBottom: 14 }}>Held for you until {fmtWhen(new Date(p.expires_at), school.timezone)}.</p> : null}
            {p.provider === 'sandbox' ? <SandboxCheckout token={token} amount={amount} /> : sp.done ? (
              <p className="rs-result" role="status">Thanks — we&apos;re confirming your payment with Stripe. You&apos;ll get a text in a moment.</p>
            ) : (
              <a className="rs-btn rs-btn--go" style={{ width: '100%', minHeight: 48 }} href={`/api/os/pay/${token}/checkout`}>Continue to secure checkout</a>
            )}
          </>
        )}
        <p className="rs-help" style={{ marginTop: 18 }}>Card details are entered only on the payment provider&apos;s page — never by text.</p>
      </main>
    </div>
  )
}
