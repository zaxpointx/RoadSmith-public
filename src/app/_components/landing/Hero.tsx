import Link from "next/link";

/**
 * Hero — locked copy. Do not paraphrase.
 * Hero copy matches the brief character-for-character.
 */
export function Hero() {
  return (
    <section className="rl-hero" aria-labelledby="rl-hero-title">
      <div className="rl-stars" aria-hidden="true" />
      <div className="rl-hero-inner" style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div>
          <span className="rl-pill">
            <span className="rl-pill-dot" aria-hidden="true" />
            Built for owner-operator driving schools
          </span>
        </div>

        <h1 id="rl-hero-title" className="rl-headline" style={{ marginTop: "1.5rem" }}>
          <span style={{ display: "block" }}>Driving schools&nbsp;don&apos;t run from a desk.</span>
          <span className="rl-grad" style={{ display: "block" }}>
            Roadsmith doesn&apos;t either.
          </span>
        </h1>

        <p className="rl-subhead">
          Time, location, and travel — handled in one place. Built for schools
          that pick up students from home, school, or work.
        </p>

        <div style={{ marginTop: "2rem" }}>
          <Link href="/sign-in" className="rl-cta" aria-label="See it in action — sign in">
            See it in action
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
