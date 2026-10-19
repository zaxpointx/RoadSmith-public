'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  happyPathEvents,
  runBookingOperatorDemo,
  type DemoRawEvent,
} from '@/lib/workflow-watchdog/demo'
import type { ReviewOutcome } from '@/lib/workflow-watchdog/types'
import styles from './operator-review.module.css'

const OUTCOMES: Array<{ value: ReviewOutcome; label: string }> = [
  { value: 'approve', label: 'Approve locally' },
  { value: 'reject', label: 'Reject' },
  { value: 'dismiss', label: 'Dismiss' },
  { value: 'needs_information', label: 'Needs information' },
  { value: 'override', label: 'Override' },
]

function incompleteEvents(): DemoRawEvent[] {
  return happyPathEvents().filter((event) => event.eventType !== 'intake.updated')
}

function formatDate(value: string | null): string {
  if (!value) return 'Not supplied'
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(value)) + ' UTC'
}

function display(value: string | number | boolean | null | undefined): string {
  return value === null || value === undefined || value === '' ? 'Not supplied' : String(value)
}

export default function OperatorReviewDemoPage() {
  const [scenario, setScenario] = useState<'reviewable' | 'incomplete'>('reviewable')
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null)
  const [overrideNote, setOverrideNote] = useState('')
  const [reminderQueued, setReminderQueued] = useState(false)
  const [lessonNote, setLessonNote] = useState('Sam handled the neighborhood turns well; practice lane changes next lesson.')
  const [noteSaved, setNoteSaved] = useState(false)
  const [error, setError] = useState('')

  const run = useMemo(() => {
    const events = scenario === 'reviewable' ? happyPathEvents() : incompleteEvents()
    return runBookingOperatorDemo(events, outcome ? {
      reviewId: `demo-review-${outcome}`,
      outcome,
      reviewerId: 'demo-owner',
      note: outcome === 'override' ? overrideNote : undefined,
    } : undefined)
  }, [scenario, outcome, overrideNote])

  const recommendation = run.recommendation
  const paymentWarning = recommendation.detectors.find((detector) => detector.detectorId === 'payment-stall')

  function chooseOutcome(nextOutcome: ReviewOutcome) {
    if (nextOutcome === 'override' && !overrideNote.trim()) {
      setError('Override requires a note explaining the owner decision.')
      return
    }
    setError('')
    setOutcome(nextOutcome)
  }

  function changeScenario(nextScenario: 'reviewable' | 'incomplete') {
    setScenario(nextScenario)
    setOutcome(null)
    setReminderQueued(false)
    setNoteSaved(false)
    setError('')
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link className={styles.backLink} href="/">← Roadsmith public release</Link>
            <div className={styles.eyebrow}>ROADSMITH / HOSTED OPERATOR REVIEW</div>
            <h1>One inquiry. One proposed lesson. One owner decision.</h1>
            <p className={styles.lede}>A local, synthetic walkthrough of what Roadsmith found before anything could be sent, charged, booked, cancelled, or rescheduled.</p>
          </div>
          <div className={styles.modeBadge}><span /> HOSTED SYNTHETIC DEMO</div>
        </header>

        <aside className={styles.disclosure} role="note">
          <strong>Read-only hosted demo using synthetic fixtures.</strong> No messages, payments, calendar changes, bookings, cancellations, or reschedules occur. Every review below has <code>sideEffects: []</code>; controls update only this page’s local state.
        </aside>

        <section className={styles.toolbar} aria-label="Demo controls">
          <div>
            <span className={styles.label}>Scenario</span>
            <div className={styles.segmented}>
              <button className={scenario === 'reviewable' ? styles.selected : ''} onClick={() => changeScenario('reviewable')}>Reviewable candidate</button>
              <button className={scenario === 'incomplete' ? styles.selected : ''} onClick={() => changeScenario('incomplete')}>Incomplete evidence</button>
            </div>
          </div>
          <div className={styles.stateSummary}>
            <span className={styles.label}>Current normalized state</span>
            <strong className={recommendation.normalizedState === 'needs_information' ? styles.warningText : ''}>{recommendation.normalizedState}</strong>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.transcript}`}>
            <div className={styles.cardHeading}><div><span className={styles.kicker}>01 / PARENT INTAKE</span><h2>What came in</h2></div><span className={styles.fixture}>demo-sms</span></div>
            <div className={styles.messages}>
              <div className={styles.message}><span>parent@example.test · inquiry-1</span>Can I book a 60 minute lesson for Sam this Saturday?</div>
              <div className={`${styles.message} ${styles.messageRight}`}><span>Roadsmith draft · not sent</span>What is the pickup address and when is Sam available?</div>
              <div className={styles.message}><span>intake evidence · {scenario === 'incomplete' ? 'missing' : 'demo-sms'}</span>{scenario === 'incomplete' ? 'The intake update is not present in this scenario.' : '123 Oak Lane · Saturday morning · behind-the-wheel'}</div>
            </div>
            <dl className={styles.facts}>
              <div><dt>Student</dt><dd>{display(recommendation.intake.studentId)}</dd></div>
              <div><dt>Pickup address</dt><dd>{display(recommendation.intake.pickupLocation)}</dd></div>
              <div><dt>Availability</dt><dd>{recommendation.intake.availabilityWindows.join(', ') || 'Not supplied'}</dd></div>
              <div><dt>Inquiry ID</dt><dd>{recommendation.intake.inquiryId}</dd></div>
            </dl>
          </section>

          <section className={`${styles.card} ${styles.lesson}`}>
            <div className={styles.cardHeading}><div><span className={styles.kicker}>02 / PROPOSED LESSON</span><h2>Owner review, not a booking</h2></div><span className={styles.awaiting}>AWAITING OWNER CONFIRMATION</span></div>
            <div className={styles.lessonMain}><strong>{formatDate(recommendation.candidate.startsAt)}</strong><span>60-minute behind-the-wheel lesson</span></div>
            <dl className={styles.facts}>
              <div><dt>Pickup</dt><dd>{display(recommendation.candidate.location)}</dd></div>
              <div><dt>Instructor</dt><dd>{display(recommendation.candidate.instructorId)}</dd></div>
              <div><dt>Price fixture</dt><dd>{recommendation.candidate.price === null ? 'Not supplied' : `$${recommendation.candidate.price}`}</dd></div>
              <div><dt>Recommendation</dt><dd>{recommendation.recommendationId}</dd></div>
            </dl>
            <p className={styles.hint}>This is an observed candidate slot. It is never displayed as booked, paid, or confirmed.</p>
          </section>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHeading}><div><span className={styles.kicker}>03 / REASONING CORE</span><h2>What Roadsmith found, and why</h2></div><span className={styles.fixture}>{recommendation.detectors.length} bounded checks</span></div>
          <div className={styles.detectors}>
            {recommendation.detectors.map((detector) => (
              <article key={detector.detectorId} className={`${styles.detector} ${detector.detectorId === 'payment-stall' ? styles.payment : ''}`}>
                <div className={styles.detectorTop}><span className={styles.detectorName}>{detector.detectorId}</span><span className={`${styles.result} ${detector.result !== 'clear' ? styles.resultAlert : ''}`}>{detector.result}</span></div>
                <div className={styles.severity}>SEVERITY / {detector.severity.toUpperCase()}</div>
                <p>{detector.explanation}</p>
                <div className={styles.evidence}><strong>Evidence</strong>{detector.evidence.length ? detector.evidence.map((item) => <span key={`${item.recordId}-${item.field}`}>{item.recordId} · {item.field} = {display(item.value)}</span>) : <span>None available</span>}</div>
                {detector.missingEvidence.length > 0 && <div className={styles.missing}><strong>Missing information</strong><span>{detector.missingEvidence.join(', ')}</span></div>}
              </article>
            ))}
          </div>
          {paymentWarning?.result === 'warning' && <div className={styles.paymentCallout}><strong>Payment-stall warning</strong> The synthetic booking is still pending while payment is pending. This is a reason for owner attention, not a payment attempt or Stripe observation.</div>}
          {recommendation.missingEvidence.length > 0 && <div className={styles.missingSummary}><strong>Missing information</strong><span>{recommendation.missingEvidence.join(' · ')}</span><p>Roadsmith is asking for information instead of guessing.</p></div>}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeading}><div><span className={styles.kicker}>04 / SIMULATED HANDOFF</span><h2>What happens after approval</h2></div><span className={styles.fixture}>local state only</span></div>
          <div className={styles.handoffGrid}>
            <article className={`${styles.handoffStep} ${outcome === 'approve' || outcome === 'override' ? styles.handoffReady : ''}`}>
              <span className={styles.handoffNumber}>01</span><div><strong>Owner approval</strong><p>{outcome === 'approve' ? 'Approved locally by demo-owner.' : outcome === 'override' ? 'Exception accepted with an owner note.' : 'Waiting for the owner decision above.'}</p></div><span className={styles.statePill}>{outcome === 'approve' || outcome === 'override' ? 'approved' : 'awaiting'}</span>
            </article>
            <article className={`${styles.handoffStep} ${outcome === 'approve' || outcome === 'override' ? styles.handoffReady : ''}`}>
              <span className={styles.handoffNumber}>02</span><div><strong>Payment + booking</strong><p>{outcome === 'approve' || outcome === 'override' ? 'Simulated payment pending · booking still not written.' : 'Candidate only · no charge or booking exists.'}</p></div><span className={styles.statePill}>{outcome === 'approve' || outcome === 'override' ? 'simulated' : 'held'}</span>
            </article>
            <article className={`${styles.handoffStep} ${reminderQueued ? styles.handoffReady : ''}`}>
              <span className={styles.handoffNumber}>03</span><div><strong>Reminder state</strong><p>{reminderQueued ? 'Reminder queued in local UI; no message provider was called.' : 'No reminder queued until the operator chooses to simulate it.'}</p></div><button className={styles.inlineAction} type="button" onClick={() => setReminderQueued(true)} disabled={!outcome || outcome === 'reject' || outcome === 'dismiss' || outcome === 'needs_information'}>{reminderQueued ? 'Queued locally' : 'Simulate reminder'}</button>
            </article>
            <article className={`${styles.handoffStep} ${noteSaved ? styles.handoffReady : ''}`}>
              <span className={styles.handoffNumber}>04</span><div><strong>Post-lesson note</strong><p>{noteSaved ? 'Note saved to local demo state.' : 'Draft a follow-up note without persisting it.'}</p><textarea className={styles.lessonNote} value={lessonNote} onChange={(event) => { setLessonNote(event.target.value); setNoteSaved(false) }} aria-label="Synthetic post-lesson note" /></div><button className={styles.inlineAction} type="button" onClick={() => setNoteSaved(true)}>{noteSaved ? 'Saved locally' : 'Save local note'}</button>
            </article>
          </div>
          <p className={styles.handoffDisclosure}>All four handoff states are synthetic fixture labels. Approval, payment, booking, reminder, and note controls never call an external system.</p>
        </section>

        <section className={styles.reviewSection}>
          <div className={styles.reviewCopy}><span className={styles.kicker}>05 / WHAT THE OWNER DECIDES</span><h2>Choose a simulated review outcome</h2><p>These buttons call only the pure local review functions and update this page’s React state. They do not authorize a worker or external action.</p></div>
          <div className={styles.actions}>
            {OUTCOMES.map((item) => <button key={item.value} className={item.value === 'approve' ? styles.primaryAction : styles.action} onClick={() => chooseOutcome(item.value)}>{item.label}</button>)}
          </div>
          <label className={styles.noteField}>Override note <textarea value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} placeholder="Required only for override" rows={2} /></label>
          {error && <p className={styles.error}>{error}</p>}
          {run.review && <div className={styles.reviewRecord}><div><span className={styles.kicker}>SIMULATED REVIEW RECORD</span><strong>{run.review.outcome} · {run.review.reviewId}</strong></div><span className={styles.sideEffects}>sideEffects: []</span><p>{run.review.note || 'No owner note supplied.'}</p></div>}
        </section>

        <footer className={styles.footer}>Synthetic identifiers: {run.rawEvents.map((event) => event.eventId).join(' · ')}<br />No network provider, database, credential, persistence, or production navigation is used by this route.</footer>
      </div>
    </main>
  )
}
