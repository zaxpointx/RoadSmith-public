const evidenceRows = [
  { label: "Parent inquiry", value: "Maya · Tuesday after school", tone: "violet" },
  { label: "Pickup context", value: "Northview High · 4:15 PM", tone: "blue" },
  { label: "Travel check", value: "Route context attached", tone: "mint" },
];

export function ProductProof() {
  return (
    <section className="rs-product-proof" aria-labelledby="rs-product-proof-title">
      <div className="rs-proof-copy">
        <div className="rs-section-label">A REAL REVIEW, MADE VISIBLE</div>
        <h2 id="rs-product-proof-title">See the next move<br /><span>before it becomes work.</span></h2>
        <p>
          A Roadsmith proposal keeps the request, route context, evidence, and owner decision together. The public preview is synthetic by design; the workflow is the real one.
        </p>
        <a className="rs-text-link" href="https://roadsmith-phi.vercel.app/demo/operator-review">
          Open the hosted review path <span>↗</span>
        </a>
      </div>

      <div className="rs-evidence-desk" aria-label="Synthetic Roadsmith review preview">
        <div className="rs-desk-topline"><span>PROPOSAL / 0042</span><span className="rs-synthetic-chip">SYNTHETIC FIXTURE</span></div>
        <div className="rs-desk-heading"><div><small>OWNER REVIEW</small><h3>Tuesday lesson request</h3></div><span className="rs-pending-chip"><i /> Pending decision</span></div>
        <div className="rs-evidence-list">
          {evidenceRows.map((row) => (
            <div className="rs-evidence-row" key={row.label}>
              <span className={`rs-evidence-icon ${row.tone}`} aria-hidden="true" />
              <div><small>{row.label}</small><strong>{row.value}</strong></div>
              <span className="rs-evidence-check" aria-hidden="true">✓</span>
            </div>
          ))}
        </div>
        <div className="rs-decision-row"><span>Nothing has been sent.</span><div><button type="button" className="rs-decision-secondary">Need more info</button><button type="button" className="rs-decision-primary">Review proposal <span>→</span></button></div></div>
      </div>
    </section>
  );
}
