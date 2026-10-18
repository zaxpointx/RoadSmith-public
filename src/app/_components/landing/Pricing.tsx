import Link from "next/link";

/**
 * Section 4 — pricing. Single tier. Copy is locked.
 */
export function Pricing() {
  return (
    <section className="rl-section" aria-labelledby="rl-pricing-title">
      <div className="rl-section-inner">
        <p className="rl-eyebrow">Pricing</p>
        <h2 id="rl-pricing-title" className="rl-h2">
          One plan. Every feature.
        </h2>

        <div className="rl-pricing">
          <div>
            <div className="rl-price">$99/mo</div>
            <p className="rl-price-meta">
              Cancel anytime. Includes all features, all forms, all students.
            </p>
          </div>
          <Link href="/sign-in" className="rl-cta" aria-label="Start free demo — sign in">
            Start free demo
            <svg
              className="rl-cta-arrow"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
