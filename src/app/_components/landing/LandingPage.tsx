import Link from "next/link";
import "./landing.css";
import { ProductProof } from "./ProductProof";

const HOSTED_OPERATOR_REVIEW_URL = "https://roadsmith-phi.vercel.app/demo/operator-review";

const attentionItems = [
  { tone: "amber", label: "Needs review", title: "A booking may conflict with instructor travel", meta: "Evidence attached · owner decision" },
  { tone: "violet", label: "Follow up", title: "A parent inquiry is waiting on one answer", meta: "Draft ready · nothing sent" },
  { tone: "mint", label: "Clear", title: "Today’s lesson coverage is ready", meta: "12 lessons · 4 open capacity signals" },
];

function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
}

function Brand() {
  return <Link className="rs-brand" href="/" aria-label="Roadsmith home"><span className="rs-brand-mark" aria-hidden="true">R</span><span>ROADSMITH</span></Link>;
}

function ProductWindow() {
  return (
    <div className="rs-window-shell" aria-label="Roadsmith owner operating brief preview">
      <div className="rs-window-glow" aria-hidden="true" />
      <div className="rs-window">
        <div className="rs-window-topbar"><div className="rs-window-dots" aria-hidden="true"><i /><i /><i /></div><span className="rs-window-url">roadsmith.app / owner-brief</span><span className="rs-live"><b /> Live operator preview</span></div>
        <div className="rs-window-content">
          <aside className="rs-window-sidebar" aria-hidden="true"><div className="rs-mini-logo">R</div><span className="rs-sidebar-active">Brief</span><span>Schedule</span><span>Students</span><span>Payments</span><span>Notes</span><span>Settings</span></aside>
          <div className="rs-window-main">
            <div className="rs-window-heading"><div><small>MONDAY · SEPTEMBER 21</small><h3>Good morning, owner.</h3></div><span className="rs-demo-chip">DEMO DATA</span></div>
            <div className="rs-window-summary"><div className="rs-summary-card rs-summary-wide"><small>OWNER ATTENTION</small><strong>03</strong><span>items worth your decision today</span></div><div className="rs-summary-card"><small>LESSONS TODAY</small><strong>12</strong><span className="rs-positive">↑ covered</span></div><div className="rs-summary-card"><small>OPEN CAPACITY</small><strong>04</strong><span>slots still available</span></div></div>
            <div className="rs-brief-head"><span>DAILY OPERATING BRIEF</span><span>Evidence-backed · approval gated</span></div>
            <div className="rs-attention-list">{attentionItems.map((item) => <div className="rs-attention-row" key={item.title}><span className={`rs-attention-dot ${item.tone}`} /><div><b>{item.label}</b><strong>{item.title}</strong><small>{item.meta}</small></div><Arrow /></div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessCard({ tone, number, title, body, children }: { tone: string; number: string; title: string; body: string; children: React.ReactNode }) {
  return <article className={`rs-process-card ${tone}`}><div className="rs-process-art">{children}</div><div className="rs-process-copy"><small>{number}</small><h3>{title}</h3><p>{body}</p></div></article>;
}

export function LandingPage() {
  return (
    <main className="rs-canvas">
      <header className="rs-nav"><Brand /><nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#operators">For operators</a><a href="#pricing">Pricing</a></nav><a className="rs-nav-cta" href={HOSTED_OPERATOR_REVIEW_URL}>Open the live demo <Arrow /></a></header>

      <section className="rs-hero" aria-labelledby="rs-hero-title"><div className="rs-stars" aria-hidden="true" /><div className="rs-hero-orb rs-hero-orb-one" aria-hidden="true" /><div className="rs-hero-orb rs-hero-orb-two" aria-hidden="true" /><div className="rs-hero-inner"><div className="rs-kicker"><span /> THE DRIVING SCHOOL OPERATING LAYER</div><h1 id="rs-hero-title">Run the school.<br /><em>Not the chaos.</em></h1><p className="rs-hero-copy">Roadsmith turns parent inquiries, lesson capacity, travel-aware scheduling, payments, reminders, and post-lesson notes into one clear operating brief — so owners can approve what matters and get back on the road.</p><div className="rs-hero-actions"><a className="rs-primary-cta" href={HOSTED_OPERATOR_REVIEW_URL}>See Roadsmith in action — open the live demo <Arrow /></a><a className="rs-text-link" href="#how-it-works">Explore the system <span>↓</span></a></div><p className="rs-hosted-note">Verified hosted walkthrough · synthetic fixtures · no external side effects</p></div><ProductWindow /></section>

      <section className="rs-proof-strip" aria-label="Roadsmith product principles"><span>BUILT FOR MOVING SCHOOLS</span><i /><span>OWNER APPROVAL INCLUDED</span><i /><span>TRAVEL-AWARE BY DESIGN</span><i /><span>NO BLACK BOX AUTOMATION</span></section>

      <section className="rs-intro" id="operators"><div className="rs-section-label">THE MISSING LAYER</div><h2>Your school already has the tools.<br /><span>It needs a system that connects them.</span></h2><p>Bookings, payments, parents, instructors, forms, and reminders all create work. Roadsmith brings the work into focus and puts the next safe action in front of you.</p></section>

      <section className="rs-review-path" aria-labelledby="rs-review-path-title"><div className="rs-section-label">THE REVIEW PATH</div><div className="rs-review-path-heading"><h2 id="rs-review-path-title">From parent question<br /><span>to an owner-approved next move.</span></h2><p>Every proposed lesson stays reviewable until the evidence is clear and the owner decides.</p></div><div className="rs-review-path-grid"><article><span>01</span><strong>Parent inquiry</strong><p>Capture the student, pickup location, and availability.</p></article><article><span>02</span><strong>Travel-aware proposal</strong><p>Check the candidate lesson against time, route, and instructor context.</p></article><article><span>03</span><strong>Evidence review</strong><p>Show the bounded checks, evidence, warnings, and missing information.</p></article><article><span>04</span><strong>Owner decision</strong><p>Approve, reject, dismiss, request information, or record an override.</p></article><article><span>05</span><strong>Simulated handoff</strong><p>See what would happen next while every external side effect remains off.</p></article></div><a className="rs-text-link rs-review-path-link" href={HOSTED_OPERATOR_REVIEW_URL}>Walk through the hosted synthetic review <Arrow /></a></section>

      <ProductProof />

      <section className="rs-process" id="how-it-works" aria-labelledby="rs-process-title"><div className="rs-process-heading"><div><div className="rs-section-label">HOW ROADSMITH WORKS</div><h2 id="rs-process-title">The operating layer<br /><span>between the tools.</span></h2></div><p className="rs-process-note">The routine stays moving.<br />The owner stays in control.</p></div><div className="rs-process-grid"><ProcessCard tone="yellow" number="01 / SEE" title="See what matters." body="One brief for the parent inquiries, capacity, payments, and lessons that need attention today."><div className="rs-art-list"><span /><span /><span /><span /></div></ProcessCard><ProcessCard tone="blue" number="02 / UNDERSTAND" title="Understand the route." body="Travel-aware context makes every proposed lesson easier to trust, adjust, and explain."><div className="rs-art-evidence"><b>Evidence</b><i /><i /><i /><strong>3 sources connected</strong></div></ProcessCard><ProcessCard tone="orange" number="03 / DECIDE" title="Approve the next move." body="Roadsmith handles reminders and follow-ups. You keep the judgment on anything consequential."><div className="rs-art-decision"><button>Approve</button><span>Owner decision</span><button className="muted">Needs info</button></div></ProcessCard></div></section>

      <section className="rs-benefits" aria-labelledby="rs-benefits-title"><div className="rs-benefits-intro"><div className="rs-section-label">BUILT AROUND THE REAL DAY</div><h2 id="rs-benefits-title">Less chasing.<br /><em>More teaching.</em></h2><p>Roadsmith is designed for the small school where one owner still carries the context.</p></div><div className="rs-benefit-list"><article><span>01</span><div><h3>Capacity you can actually use</h3><p>See the space between lessons, instructors, and drive time before promising a slot.</p></div></article><article><span>02</span><div><h3>Communication with a clear owner</h3><p>Keep parents moving with reminders and drafts while every consequential send stays yours to approve.</p></div></article><article><span>03</span><div><h3>A record after the lesson</h3><p>Capture notes, payments, and next steps while the details are still fresh.</p></div></article></div></section>

      <section className="rs-callout"><div className="rs-callout-card"><div className="rs-callout-mark">R</div><div><div className="rs-section-label">THE OWNER BRIEF</div><h2>A calmer school is<br /><em>a better business.</em></h2><p>Start with the work that is already costing you attention. Roadsmith makes it visible before it becomes expensive.</p><a className="rs-dark-cta" href={HOSTED_OPERATOR_REVIEW_URL}>Open the hosted owner demo <Arrow /></a></div></div></section>

      <section className="rs-pricing" id="pricing"><div className="rs-section-label">A FOCUSED STARTING POINT</div><h2>Everything your school<br /><span>needs to run the day.</span></h2><div className="rs-price-card"><div><small>ROADSMITH FOR OWNER-OPERATORS</small><strong>Let’s talk</strong><p>We’ll show you the right starting point for your school.</p></div><ul><li>Daily operating brief</li><li>Parent intake and owner-approved next steps</li><li>Travel-aware capacity context</li><li>Payments, reminders, bookings, and notes</li></ul><Link className="rs-primary-cta" href="/contact">Request a conversation <Arrow /></Link></div></section>

      <footer className="rs-footer"><Brand /><span>Built for schools that move people forward.</span><div><a href="mailto:hello@roadsmith.app">hello@roadsmith.app</a><a href="https://github.com/zaxpointx/RoadSmith-public" target="_blank" rel="noopener noreferrer">GitHub</a></div></footer>
    </main>
  );
}
