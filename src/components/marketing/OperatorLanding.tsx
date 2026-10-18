import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  MessageCircle,
  Route,
  Send,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { ProcessSection } from "./ProcessSection";
import { TimeAuditCard } from "./TimeAuditCard";

/**
 * OperatorLanding — single-page operator marketing surface.
 * Hero (centered, single CTA) -> proof strip -> three numbered process
 * sections (audit / operator / Tennessee) -> story message stack ->
 * closing CTA. Reuses the existing `.operator-*` CSS system.
 */
export function OperatorLanding() {
  return (
    <main className="operator-page">
      <section className="operator-hero" aria-labelledby="operator-hero-title">
        <div className="operator-road-glow operator-road-glow-one" />
        <div className="operator-road-glow operator-road-glow-two" />
        <div className="operator-grid" />
        <div className="operator-hero-inner">
          <div className="operator-eyebrow">
            <span className="operator-live-dot" aria-hidden="true" />
            Built for Tennessee driving schools
          </div>
          <h1 id="operator-hero-title">
            Your driving school&apos;s<br />
            <span>AI operator.</span>
          </h1>
          <p className="operator-hero-copy">
            Booking, payments, reminders, dispatch, and no-show recovery —
            handled by an agent. You approve finished work instead of running
            another tool.
          </p>
          <div className="operator-hero-actions">
            <a
              className="operator-button operator-button-primary"
              href="mailto:support@roadsmith.app?subject=Roadsmith%20working%20session"
            >
              Book a working session <ArrowRight size={17} aria-hidden="true" />
            </a>
            <Link className="operator-button operator-button-secondary" href="/demo">
              See the operator console
            </Link>
          </div>
          <p className="operator-hero-note">
            Early access for Tennessee schools. No self-serve setup required.
          </p>
          <OperatorConsole />
        </div>
      </section>

      <section className="operator-proof" aria-label="Roadsmith product principles">
        <p>Roadsmith is built around the work a driving school owner should not have to carry alone.</p>
        <div className="operator-proof-items">
          <span><Clock3 size={16} aria-hidden="true" /> Less owner back-and-forth</span>
          <span><Route size={16} aria-hidden="true" /> Drive time considered</span>
          <span><WalletCards size={16} aria-hidden="true" /> Payments and follow-up handled</span>
        </div>
      </section>

      <section className="operator-workflows" id="workflows" aria-labelledby="workflow-title">
        <div className="operator-section-intro">
          <p className="operator-kicker">The owner&apos;s day, redesigned</p>
          <h2 id="workflow-title">
            The agent does the <em>routine.</em>
            <br />You keep the judgment.
          </h2>
          <p>
            Not another dashboard to learn. A managed operating layer built
            around the conversations, schedules, and exceptions already eating
            your day.
          </p>
        </div>
        <div className="operator-process-list">
          <ProcessSection
            number="01"
            name="Audit"
            heading="Find the time leaks costing you a hire."
            body="Most owners don't see the hours leaking into parent SMS, payment follow-up, and reschedules until they add up. We start every working session with a 1-week time audit."
            tone="lime"
          >
            <TimeAuditCard />
          </ProcessSection>

          <ProcessSection
            number="02"
            name="Operator"
            heading="An agent that answers, dispatches, and follows up."
            body="Scott handles the parent conversation. Bob sends the morning instructor brief. Your console is the audit trail for what happened and the few calls that need your say-so."
            tone="blue"
          >
            <div className="operator-message-stack" aria-label="Example Roadsmith agent messages">
              <div className="operator-message operator-message-parent">
                <span className="operator-message-label">SCOTT · PARENT SMS</span>
                <p>&ldquo;Tuesday at 4:30 is open. Want me to hold it and send the deposit link?&rdquo;</p>
                <span className="operator-message-status">Drafted for approval</span>
              </div>
              <div className="operator-message operator-message-instructor">
                <span className="operator-message-label">BOB · MORNING BRIEF</span>
                <p>&ldquo;3 drives today. Leave Cedar Bluff by 10:15 to keep the Powell pickup on time.&rdquo;</p>
                <span className="operator-message-status">Ready to send</span>
              </div>
              <div className="operator-message operator-message-owner">
                <span className="operator-message-label">OWNER EXCEPTION</span>
                <p>&ldquo;Traffic adds 24 min to Maya&apos;s route. Approve the proposed 4:00 reschedule?&rdquo;</p>
                <button type="button" aria-label="Example approval button">
                  Approve change <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </ProcessSection>

          <ProcessSection
            number="03"
            name="Tennessee"
            heading="Forms done. Signatures sent. Audit trail kept."
            body="Roadsmith keeps student, scheduling, payment, and Tennessee compliance work in one operating record. The paperwork doesn't disappear into a black box."
            tone="violet"
          >
            <div className="operator-tn-card">
              <div className="operator-tn-tags" aria-label="Tennessee compliance capabilities">
                <span>SF-1010</span>
                <span>SF-1256</span>
                <span>SF-0259</span>
              </div>
              <p className="operator-tn-note">
                <em>Audit trail ready for any state review.</em>
              </p>
            </div>
          </ProcessSection>
        </div>
      </section>

      <section className="operator-story" id="operator-console" aria-labelledby="story-title">
        <div className="operator-story-copy">
          <p className="operator-kicker">One operator surface</p>
          <h2 id="story-title">The dashboard is where work gets <em>approved.</em></h2>
          <p>
            Scott handles the parent conversation. Bob sends the instructor plan.
            Your console is the audit trail for what happened and the few calls
            that need your say-so.
          </p>
          <ul className="operator-check-list">
            <li><Check size={16} aria-hidden="true" /> Parent messages waiting on a real answer</li>
            <li><Check size={16} aria-hidden="true" /> Routes with drive-time conflicts surfaced early</li>
            <li><Check size={16} aria-hidden="true" /> Tennessee compliance kept in the same operating flow</li>
          </ul>
        </div>
        <div className="operator-message-stack" aria-label="Example Roadsmith agent messages">
          <div className="operator-message operator-message-parent">
            <span className="operator-message-label">SCOTT · PARENT SMS</span>
            <p>&ldquo;Tuesday at 4:30 is open. Want me to hold it and send the deposit link?&rdquo;</p>
            <span className="operator-message-status">Drafted for approval</span>
          </div>
          <div className="operator-message operator-message-instructor">
            <span className="operator-message-label">BOB · MORNING BRIEF</span>
            <p>&ldquo;3 drives today. Leave Cedar Bluff by 10:15 to keep the Powell pickup on time.&rdquo;</p>
            <span className="operator-message-status">Ready to send</span>
          </div>
          <div className="operator-message operator-message-owner">
            <span className="operator-message-label">OWNER EXCEPTION</span>
            <p>&ldquo;Traffic adds 24 min to Maya&apos;s route. Approve the proposed 4:00 reschedule?&rdquo;</p>
            <button type="button" aria-label="Example approval button">
              Approve change <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section className="operator-close" aria-labelledby="operator-close-title">
        <Sparkles className="operator-close-sparkle" aria-hidden="true" />
        <p className="operator-kicker">A calmer operating day starts here</p>
        <h2 id="operator-close-title">See what Roadsmith can take <em>off your plate.</em></h2>
        <p>
          Bring the scheduling, parent-message, or no-show problem that is
          costing you the most time. We&apos;ll walk through the workflow together.
        </p>
        <a
          className="operator-button operator-button-primary"
          href="mailto:support@roadsmith.app?subject=Roadsmith%20working%20session"
        >
          Book a working session <ArrowRight size={17} aria-hidden="true" />
        </a>
      </section>
    </main>
  );
}

function OperatorConsole() {
  return (
    <div className="operator-console-wrap">
      <div className="operator-console" aria-label="Roadsmith operator console preview">
        <div className="operator-console-bar">
          <div className="operator-console-dots" aria-hidden="true"><i /><i /><i /></div>
          <span>roadsmith.app / operator</span>
          <b><i aria-hidden="true" /> Live work queue</b>
        </div>
        <div className="operator-console-content">
          <aside className="operator-console-sidebar">
            <div className="operator-console-brand"><span>ROAD</span>SMITH</div>
            <div className="operator-console-nav"><b>Today&apos;s work</b><span>Parent desk</span><span>Instructor briefs</span><span>Payments</span><span>Compliance</span></div>
            <div className="operator-console-side-note"><i /><span>3 items need your review</span></div>
          </aside>
          <div className="operator-console-main">
            <header><div><small>MONDAY · 7:06 AM</small><h2>Good morning, operator.</h2></div><span className="operator-console-avatar">OP</span></header>
            <div className="operator-console-summary">
              <div><small>ROUTINE WORK</small><strong>14 <span>handled</span></strong><p>Messages, reminders, and payment follow-up</p></div>
              <div className="operator-console-route"><small>DRIVE TIME</small><strong>1 <span>route at risk</span></strong><div><i /><i /><i /><i /></div></div>
            </div>
            <div className="operator-console-columns">
              <section>
                <div className="operator-console-heading"><h3>Ready to send</h3><span>2</span></div>
                <article>
                  <div className="operator-console-icon operator-console-icon-blue"><MessageCircle size={15} aria-hidden="true" /></div>
                  <p><b>Emma&apos;s Tuesday booking</b><small>Deposit link + reminder queued</small></p>
                  <Check size={16} aria-hidden="true" />
                </article>
                <article>
                  <div className="operator-console-icon operator-console-icon-lime"><Send size={15} aria-hidden="true" /></div>
                  <p><b>Instructor morning brief</b><small>3 pickups, 1 drive-time buffer</small></p>
                  <Check size={16} aria-hidden="true" />
                </article>
              </section>
              <section className="operator-console-exception">
                <div className="operator-console-heading"><h3>Needs your call</h3><span>1</span></div>
                <article>
                  <div className="operator-console-alert">!</div>
                  <p><b>Traffic changes Maya&apos;s pickup</b><small>24 minutes late without a change</small></p>
                </article>
                <div className="operator-console-choice"><span>Proposed: move to 4:00 PM</span><button type="button">Review <ArrowRight size={13} aria-hidden="true" /></button></div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
