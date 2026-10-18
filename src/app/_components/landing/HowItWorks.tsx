type Card = { tag: string; title: string };

const CARDS: Card[] = [
  {
    tag: "Time",
    title: "One source of truth for every instructor's day.",
  },
  {
    tag: "Location",
    title:
      "Knows where each instructor is, right now. Sequences drives by distance — no more driving across town for a 30-minute lesson.",
  },
  {
    tag: "Travel",
    title:
      "Pickup, dropoff, route between lessons. Travel time built into the schedule, not bolted on.",
  },
];

/**
 * Section 3 — how it works. Three equal-weight cards. Copy is locked.
 */
export function HowItWorks() {
  return (
    <section className="rl-section" aria-labelledby="rl-how-title">
      <div className="rl-section-inner">
        <p className="rl-eyebrow">How it works</p>
        <h2 id="rl-how-title" className="rl-h2">
          Time, location, and travel — handled in one place.
        </h2>

        <div className="rl-cards">
          {CARDS.map((c) => (
            <article key={c.tag} className="rl-card">
              <span className="rl-card-tag">{c.tag}</span>
              <h3 className="rl-card-title">{c.title}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
