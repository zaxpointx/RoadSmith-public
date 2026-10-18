import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Minimal nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">DC</div>
          <span className="text-white font-semibold text-sm">Roadsmith</span>
          <span className="text-gray-600 mx-2">·</span>
          <span className="text-gray-500 text-sm">Privacy Policy</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Effective: April 22, 2026</p>

        <div className="space-y-8 text-gray-400 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. What We Collect</h2>
            <p className="mb-3">
              We collect information you provide directly: your name, email address, phone number, school name, and payment information (processed and stored by Stripe). For your students, we collect name, date of birth, permit number, and contact information.
            </p>
            <p>
              Student data — including dates of birth and permit numbers — is encrypted at rest using AES-256-GCM before storage.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. How We Use It</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>Provide and improve the scheduling and booking service</li>
              <li>Send SMS reminders to students at 48h and 4h before lessons (via Twilio)</li>
              <li>Send email confirmations and updates (via Resend)</li>
              <li>Process payments (via Stripe — we never store card numbers)</li>
              <li>Issue completion certificates for TCA compliance tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. Data Retention</h2>
            <p className="mb-3">
              We retain student records for a minimum of 3 years following the last recorded session, consistent with T.C.A. § 40-35-102 recordkeeping requirements for driver education providers.
            </p>
            <p>
              Schools may request deletion of their data at any time by contacting <span className="text-cyan-400">support@roadsmith.app</span>. Deletion requests are processed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. FERPA Compliance</h2>
            <p>
              Student records stored in Roadsmith are considered education records under the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g. We act as a &quot;school official&quot; with a legitimate educational interest under FERPA, and all data is used solely for the purpose of providing our contracted services to your school.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Data Sharing</h2>
            <p className="mb-3">We do not sell student or school data. Data is shared only with:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-white">Stripe</strong> — for payment processing. Card data never touches our servers.</li>
              <li><strong className="text-white">Twilio</strong> — for SMS reminders. Student phone numbers are transmitted to Twilio solely for this purpose.</li>
              <li><strong className="text-white">Resend</strong> — for transactional emails. Email addresses are transmitted to Resend solely for this purpose.</li>
              <li><strong className="text-white">Supabase</strong> — our database provider. Data is encrypted at rest within their infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Security</h2>
            <p>
              All data in transit is encrypted via TLS 1.2+. Sensitive fields (DOB, permit numbers, names) are encrypted at rest using AES-256-GCM. API endpoints are protected by replay attack prevention and ownership-level authorization checks. A full security testing plan is available upon request.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Cookies</h2>
            <p>
              We use a single session cookie to maintain your authenticated session when logged into the school admin panel. We do not use third-party advertising cookies or tracking pixels.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Children&apos;s Privacy</h2>
            <p>
              Our service is used by driving schools that serve students of various ages, including minors. Schools are responsible for obtaining appropriate parental consent for minor students in accordance with applicable state law. We do not collect data directly from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. Your Rights</h2>
            <p className="mb-3">Schools have the right to:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Export all student and school data in JSON format at any time</li>
              <li>Request permanent deletion of all school and student data</li>
              <li>Request a copy of all data stored about their school</li>
              <li>Report security concerns to <span className="text-cyan-400">security@roadsmith.app</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. Contact</h2>
            <p>
              Questions about this policy: <span className="text-cyan-400">privacy@roadsmith.app</span><br />
              Security concerns: <span className="text-cyan-400">security@roadsmith.app</span>
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
