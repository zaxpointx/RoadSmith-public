import Link from 'next/link'
import { Mark } from '@/components/os/Mark'
import './site.css'

type Line = { me?: boolean; text: string; note?: string }

function Thread({ title, who, lines }: { title: string; who: string; lines: Line[] }) {
  return (
    <figure className="st-thread">
      <figcaption><strong>{title}</strong><span>{who}</span></figcaption>
      <div className="st-thread-body">
        {lines.map((l, i) => (
          <p key={i} className={l.me ? 'st-b st-b--me' : 'st-b'}>{l.text}{l.note ? <small>{l.note}</small> : null}</p>
        ))}
      </div>
    </figure>
  )
}

const RULES = [
  ['It only offers times the scheduler confirms.', 'Instructor hours, time off, classes, holidays and the drive from the last pickup are all checked before a time is suggested — and again before it is booked.'],
  ['It cannot double-book.', 'An instructor or student overlap is rejected by the database itself, no matter who or what tries to write it.'],
  ['It never says “paid” until the payment provider does.', 'Lessons are held, not confirmed, until the payment link is paid. Unpaid holds release on their own.'],
  ['It only talks about the students on that phone number.', 'A parent can see their own child’s lessons and balance. Nobody else’s — and never another school’s.'],
  ['It asks you about money going out and anything sensitive.', 'Refunds, late changes, medical and safety questions, complaints and discounts come to you with the context attached.'],
  ['STOP means stop.', 'Opt-outs, quiet hours and the automated-assistant disclosure are handled by code, not left to the AI.'],
]

export function Home() {
  return (
    <div className="st">
      <header className="st-nav">
        <Link href="/" className="st-brand"><Mark />Roadsmith</Link>
        <nav aria-label="Main">
          <a href="#day">How it works</a>
          <a href="#rules">Safeguards</a>
          <a href="#control">Your controls</a>
          <Link href="/app/login">Owner sign-in</Link>
          <Link href="/sandbox" className="st-cta st-cta--small">Text the demo school</Link>
        </nav>
      </header>

      <main id="main">
        <section className="st-hero">
          <div className="st-hero-copy">
            <div className="st-sign" role="presentation">
              <h1>Your driving school&apos;s front desk now works by text.</h1>
              <p className="st-sign-tab">No new software for you, your instructors or your families</p>
            </div>
            <p className="st-lede">Roadsmith is an assistant that runs the admin side of a driving school. It answers parents, books lessons around real drive times, collects payments, reminds everyone and keeps instructors on schedule. You see the result, and only the decisions that need you.</p>
            <div className="st-actions">
              <Link className="st-cta" href="/sandbox">Text the demo school</Link>
              <Link className="st-cta st-cta--ghost" href="/app/login">See the owner&apos;s view</Link>
            </div>
            <p className="st-fine">The demo is a fictional school with synthetic students. It runs entirely on your machine and sends no real messages or charges.</p>
          </div>
          <div className="st-hero-phone" aria-label="Example conversation">
            <Thread title="Larkspur Driving School" who="A parent, 9:14 pm" lines={[
              { me: true, text: 'Hi, can my daughter get a driving lesson next week? She has her permit.' },
              { text: "Happy to help! What's her name and date of birth, and the pickup address with ZIP?" },
              { me: true, text: 'Olivia Grant, 04/02/2010. 1500 Riverside Dr 37206' },
              { text: 'Here are open times for Olivia (60 min, $75):\nA) Tue at 2:30 PM with Dan\nB) Wed at 12:00 PM with John\nC) Fri at 10:30 AM with Priya' },
              { me: true, text: 'B please' },
              { text: "I'm holding Wed at 12:00 PM. Pay $75 here to confirm: roadsmith.app/pay/…", note: 'Confirmed the moment the payment clears' },
            ]} />
          </div>
        </section>

        <section className="st-band" id="day">
          <div className="st-wrap">
            <h2>A normal day, already handled</h2>
            <p className="st-sub">Everyone keeps texting the way they already do. Roadsmith does the coordinating in between.</p>
            <div className="st-threads">
              <Thread title="Parents and students" who="Enroll, book, move, pay" lines={[
                { me: true, text: 'Do you have drivers ed classes?' },
                { text: 'Driver Ed · Nov 30–Dec 3 has 1 seat left; Dec 14–17 has 24. $395, $100 holds a seat.' },
                { me: true, text: "The 30th. It's for my son Marcus." },
                { text: "That class just filled. The next one with room is Dec 14–17 — reply 1 and I'll hold Marcus a seat." },
              ]} />
              <Thread title="Instructors" who="No app — just text" lines={[
                { text: 'Good morning John. Wed, Nov 25: 2 lessons.\n10:00 AM James Rivera — 1310 6th Ave N\n3:00 PM Emma Carter — 1204 Holly St\nNotes: Emma is nervous on highways.', note: 'Sent at 7:00 am' },
                { me: true, text: 'running 15 min late' },
                { text: "Told Emma's family you're running about 15 minutes late." },
                { me: true, text: 'done 60 min - great lane changes' },
                { text: "Marked Emma's lesson done. Her mom got a progress text." },
              ]} />
              <Thread title="You, the owner" who="Results, not dashboards" lines={[
                { text: 'Good morning. 7 lessons booked this week. Collected $10,755 this month. 9 students from last week’s class still need drive times — reply "plan drives" and I’ll draft them.', note: 'Your 7am brief' },
                { me: true, text: 'plan drives' },
                { text: 'Drafted 8 drives, grouped by neighborhood. Noah couldn’t be placed (no permit yet). Approve and I’ll book them and text every family.' },
              ]} />
            </div>
          </div>
        </section>

        <section className="st-wrap st-route">
          <div>
            <h2>Driving lessons aren&apos;t haircuts</h2>
            <p>A salon books back-to-back slots in one chair. Your instructors drive across town between pickups, and a calendar app doesn&apos;t know that. Roadsmith estimates the drive from one stop to the next and only offers a time the instructor can actually reach. It also packs lessons by neighborhood, so the day has less windshield time.</p>
            <p>Addresses it can&apos;t place get extra padding rather than an optimistic guess.</p>
          </div>
          <ol className="st-stops" aria-label="Example instructor afternoon">
            <li><time>1:00</time><span><strong>Lesson ends in Germantown</strong>Drop-off at home</span></li>
            <li className="st-gap"><span>25 minutes of driving</span></li>
            <li><time>1:30</time><span><strong>Next pickup in Donelson</strong>Offered only because the drive fits</span></li>
            <li className="st-gap st-gap--no"><span>2:00 in Bellevue would need 40 minutes, so it isn&apos;t offered</span></li>
          </ol>
        </section>

        <section className="st-band st-band--ink" id="rules">
          <div className="st-wrap">
            <h2>Rules it can&apos;t talk its way around</h2>
            <p className="st-sub">The AI handles the conversation. Scheduling, money, permissions and records run on ordinary software that does exactly what it says.</p>
            <dl className="st-rules">
              {RULES.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
            </dl>
          </div>
        </section>

        <section className="st-wrap st-control" id="control">
          <div>
            <h2>You decide how much it handles</h2>
            <p>Each kind of decision has a setting. &ldquo;Ask me first&rdquo; puts a ready-to-run approval in your inbox, or a text to your phone if it&apos;s urgent. Approve it and Roadsmith does the rest, including telling the family.</p>
            <Link href="/app/login" className="st-link">Open the Control Center</Link>
          </div>
          <table className="st-table">
            <caption className="rs-visually-hidden">Default settings</caption>
            <thead><tr><th scope="col">When a family wants to…</th><th scope="col">Default</th></tr></thead>
            <tbody>
              <tr><td>Book an open lesson time</td><td>Handle it</td></tr>
              <tr><td>Take a seat in a class</td><td>Handle it</td></tr>
              <tr><td>Move a lesson with a day&apos;s notice</td><td>Handle it</td></tr>
              <tr><td>Change a lesson at the last minute</td><td>Ask me first</td></tr>
              <tr><td>Get a refund</td><td>Ask me first</td></tr>
              <tr><td>Ask something medical, legal or unusual</td><td>Always sent to you</td></tr>
            </tbody>
          </table>
        </section>

        <section className="st-band">
          <div className="st-wrap st-status">
            <h2>Where Roadsmith is today</h2>
            <div className="st-cols">
              <div>
                <h3>Working in the sandbox now</h3>
                <ul>
                  <li>Texting as a parent, student, instructor or owner</li>
                  <li>Enrollment, drive-time-aware booking, rescheduling and cancellation</li>
                  <li>Test-mode payment links, holds and failed-payment recovery</li>
                  <li>Reminders, 7am briefs and cohort drive-time planning</li>
                  <li>The owner&apos;s Control Center, inbox and full audit trail</li>
                </ul>
              </div>
              <div>
                <h3>Needs your accounts before going live</h3>
                <ul>
                  <li>A Twilio number with US A2P 10DLC registration, for real texts</li>
                  <li>Stripe keys, for real payments</li>
                  <li>An Anthropic API key, for natural conversation (without one, a narrower built-in interpreter replies)</li>
                  <li>A Postgres database (Supabase) and a scheduled job runner</li>
                </ul>
              </div>
            </div>
            <div className="st-actions" style={{ marginTop: 28 }}>
              <Link className="st-cta" href="/sandbox">Text the demo school</Link>
              <Link className="st-cta st-cta--ghost" href="/contact">Talk to us about your school</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="st-foot">
        <div className="st-wrap">
          <span><Mark className="st-foot-mark" /> Roadsmith</span>
          <nav aria-label="Footer"><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><Link href="/contact">Contact</Link></nav>
        </div>
      </footer>
    </div>
  )
}
