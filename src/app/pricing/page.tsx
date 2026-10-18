import Link from 'next/link'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'

const INCLUDED = [
  'A clearer daily operating brief',
  'Parent intake and owner-approved next steps',
  'Travel-aware capacity context for moving schools',
  'Payments, reminders, bookings, and post-lesson notes',
]

export default function PricingPage() {
  return (
    <MarketingLayout>
      <main className="rs-public-offer-page">
        <section className="rs-public-offer-hero">
          <p className="rs-section-label">A focused operating layer</p>
          <h1>Start with the work that is already costing you attention.</h1>
          <p>Roadsmith is shaped around the owner-operator day: see what matters, understand the context, and approve the next safe move.</p>
        </section>
        <section className="rs-public-offer-card" aria-labelledby="offer-title">
          <div>
            <p className="rs-section-label">Roadsmith for owner-operators</p>
            <h2 id="offer-title">Bring the school into focus.</h2>
            <p>We’ll show you the right starting point for your school instead of forcing you into a generic plan.</p>
          </div>
          <ul>
            {INCLUDED.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Link href="/contact" className="rs-cta rs-cta-primary">Request a conversation →</Link>
        </section>
        <section className="rs-public-offer-footer">
          <p>Want to inspect the workflow first?</p>
          <Link href="/demo" className="rs-nav-link">Open the sandbox demo →</Link>
        </section>
      </main>
    </MarketingLayout>
  )
}
