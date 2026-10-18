import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Minimal nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">DC</div>
          <span className="text-white font-semibold text-sm">Roadsmith</span>
          <span className="text-gray-600 mx-2">·</span>
          <span className="text-gray-500 text-sm">Terms of Service</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Effective: April 22, 2026</p>

        <div className="space-y-8 text-gray-400 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account with Roadsmith SaaS (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;), you (&quot;school,&quot; &quot;you,&quot; &quot;your&quot;) agree to these Terms of Service. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. The Service</h2>
            <p className="mb-3">
              Roadsmith provides cloud-based scheduling software for driving schools, including: online student booking, automated SMS reminders, student record management, compliance tracking, and payment processing via Stripe.
            </p>
            <p>
              The service is provided on a month-to-month basis at the plan rate in effect at the time of billing. Plans start at $99/month (Starter), $199/month (Growth), or $399/month (Enterprise).
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. Your Responsibilities</h2>
            <p className="mb-3">As a school using our service, you are responsible for:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Ensuring all instructors using the platform hold a valid Tennessee Department of Safety instructor certification</li>
              <li>Accurately representing your school and services in your public profile</li>
              <li>Complying with all applicable Tennessee state and federal laws, including T.C.A. § 40-35-102</li>
              <li>Obtaining any necessary parental consent for minor students</li>
              <li>Maintaining accurate student records, including the 6-hour classroom and 6-hour behind-the-wheel tracking requirement</li>
              <li>Keeping your account credentials secure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. Payments and Billing</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>Fees are billed monthly in advance. Annual billing is available at a discounted rate.</li>
              <li>All fees are non-refundable after the start of a billing period.</li>
              <li>Failed payments may result in suspension of your account after 14 days.</li>
              <li>We use Stripe for all payment processing. We do not store credit card numbers.</li>
              <li>Deposits collected from students are held by the school. We act solely as the payment processor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Cancellations and Refunds</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>Schools may cancel at any time from the dashboard. Cancellation takes effect at the end of the current billing period.</li>
              <li>No cancellation fees apply.</li>
              <li>Deposits: when a student cancels more than 24 hours before a lesson, the school&apos;s deposit policy governs the refund. We are not a party to individual booking agreements between schools and students.</li>
              <li>No-show refunds are governed by each school&apos;s individual deposit policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Data Ownership</h2>
            <p className="mb-3">
              Your school retains all rights to its student data. We act as a processor of that data on your behalf.
            </p>
            <p>
              Upon cancellation, your school data is retained for 90 days in read-only mode. After 90 days, all student records are permanently deleted from our active systems. Data in backups is retained for up to 30 additional days.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. TCA Compliance</h2>
            <p>
              Our software tracks hours toward the T.C.A. § 40-35-102 requirements (6 hours classroom, 6 hours behind-the-wheel). The issuance of certificates of completion is recorded by the software but remains the legal responsibility of the certified instructor. We do not guarantee TCA compliance acceptance by any government agency.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Limitation of Liability</h2>
            <p>
              Roadsmith is not liable for any loss of revenue, student disputes, instructor conduct, or indirect damages arising from use of the service. Our total liability in any event is limited to the fees paid by your school in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. Availability</h2>
            <p>
              We target 99.9% uptime. Scheduled maintenance windows will be communicated via email at least 48 hours in advance. Unscheduled outages will be communicated as promptly as possible.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Changes are communicated via email and take effect 30 days after notification. Continued use after 30 days constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">11. Contact</h2>
            <p>
              Questions about these terms: <span className="text-cyan-400">legal@roadsmith.app</span>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link href="/" className="text-cyan-400 text-sm hover:text-cyan-300">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
