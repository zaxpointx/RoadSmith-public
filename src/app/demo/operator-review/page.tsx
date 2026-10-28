'use client'

import { useMemo, useState } from 'react'
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
    setError('')
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>ROADSMITH / OPERATOR REVIEW</div>
            <h1>One inquiry. One proposed lesson. One owner decision.</h1>
            <p className={styles.lede}>A guided, synthetic walkthrough of the moment Roadsmith helps an owner decide whether a parent inquiry is ready for a lesson proposal.</p>
          </div>
          <div className={styles.modeBadge}><span /> SYNTHETIC · NO SIDE EFFECTS</div>
        </header>

        <aside className={styles.disclosure} role="note">
          <strong>Reviewer note.</strong> This walkthrough uses made-up data. Nothing is sent, charged, booked, cancelled, or rescheduled. The owner decision is simulated in this page only.
        </aside>

        <section className={styles.toolbar} aria-label="Demo controls">
          <div>
            <span className={styles.label}>Try the two paths</span>
            <div className={styles.segmented}>
              <button className={scenario === 'reviewable' ? styles.selected : ''} onClick={() => changeScenario('reviewable')}>Enough to review</button>
              <button className={scenario === 'incomplete' ? styles.selected : ''} onClick={() => changeScenario('incomplete')}>Needs information</button>
            </div>
          </div>
          <div className={styles.stateSummary}>
            <span className={styles.label}>What the owner sees</span>
            <strong className={recommendation.normalizedState === 'needs_information' ? styles.warningText : ''}>{recommendation.normalizedState === 'needs_information' ? 'More information needed' : 'Ready to review'}</strong>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.transcript}`}>
            <div className={styles.cardHeading}><div><span className={styles.kicker}>01 / PARENT INQUIRY</span><h2>Start with the question</h2></div><span className={styles.fixture}>made-up example</span></div>
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
            <div className={styles.cardHeading}><div><span className={styles.kicker}>02 / ROADSMITH PROPOSAL</span><h2>A feasible lesson, not a booking</h2></div><span className={styles.awaiting}>OWNER DECIDES</span></div>
            <div className={styles.lessonMain}><strong>{formatDate(recommendation.candidate.startsAt)}</strong><span>60-minute behind-the-wheel lesson</span></div>
            <dl className={styles.facts}>
              <div><dt>Pickup</dt><dd>{display(recommendation.candidate.location)}</dd></div>
              <div><dt>Instructor</dt><dd>{display(recommendation.candidate.instructorId)}</dd></div>
              <div><dt>Price fixture</dt><dd>{recommendation.candidate.price === null ? 'Not supplied' : `$${recommendation.candidate.price}`}</dd></div>
              <div><dt>Recommendation</dt><dd>{recommendation.recommendationId}</dd></div>
            </dl>
            <p className={styles.hint}>Roadsmith proposes a slot using the pickup location and available evidence. The owner still decides whether anything should move forward.</p>
          </section>
        </div>

        <details className={styles.card}>
          <summary className={styles.evidenceSummary}><span><span className={styles.kicker}>03 / SUPPORTING EVIDENCE</span><strong>See why this proposal is safe to review</strong></span><span className={styles.summaryHint}>Technical detail</span></summary>
          <div className={styles.cardHeading}><div><span className={styles.kicker}>EVIDENCE CHECKS</span><h2>What Roadsmith found, and why</h2></div><span className={styles.fixture}>{recommendation.detectors.length} checks</span></div>
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
        </details>
        {recommendation.missingEvidence.length > 0 && <div className={styles.missingSummary}><strong>Needs information before a proposal can be trusted</strong><span>{recommendation.missingEvidence.join(' · ')}</span><p>Roadsmith is asking for information instead of guessing.</p></div>}

        <section className={styles.card}>
          <div className={styles.cardHeading}><div><span className={styles.kicker}>04 / OWNER DECISION</span><h2>Nothing moves without approval</h2></div><span className={styles.fixture}>page-only simulation</span></div>
          <div className={styles.decisionState} role="status">
            <strong>{run.review ? `Owner decision: ${run.review.outcome}` : 'Waiting for the owner decision'}</strong>
            <span>{run.review ? 'Recorded in temporary page state. Side effects: [] — nothing was charged, booked, sent, cancelled, rescheduled, or persisted.' : 'The proposal remains a proposal until the owner chooses an outcome.'}</span>
          </div>
        </section>

        <section className={styles.reviewSection}>
          <div className={styles.reviewCopy}><span className={styles.kicker}>05 / YOUR TURN</span><h2>Make the owner decision</h2><p>Choose what the owner would do with this proposal. This is the point of the workflow: Roadsmith prepares the evidence, but the owner keeps the judgment.</p></div>
          <div className={styles.actions}>
            {OUTCOMES.map((item) => <button key={item.value} className={item.value === 'approve' ? styles.primaryAction : styles.action} onClick={() => chooseOutcome(item.value)}>{item.label}</button>)}
          </div>
          <label className={styles.noteField}>Override note <textarea value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} placeholder="Required only for override" rows={2} /></label>
          {error && <p className={styles.error}>{error}</p>}
          {run.review && <div className={styles.reviewRecord}><div><span className={styles.kicker}>DECISION RECORDED IN THIS DEMO</span><strong>{run.review.outcome} · owner decision</strong></div><span className={styles.sideEffects}>side effects: []</span><p>{run.review.note || 'The proposal was reviewed without creating a booking or payment.'}</p></div>}
        </section>
      </div>
        <footer className={styles.footer}>Synthetic walkthrough · no network provider, database, credential, persistence, or production navigation is used by this route.</footer>
    </main>
  )
}
