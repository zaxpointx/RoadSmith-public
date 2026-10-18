'use client';

import { ReactNode } from "react";

/**
 * WelcomeCard — top of /school-admin. Mirrors the marketing Hero tone but smaller.
 * H1 greeting + 1-line description + optional CTA row.
 */
export function WelcomeCard({
  greeting,
  description,
  cta,
}: {
  greeting: ReactNode;
  description?: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <section className="rs-dash-welcome">
      <h1 className="rs-dash-welcome-h1">{greeting}</h1>
      {description && <p className="rs-dash-welcome-desc">{description}</p>}
      {cta && <div className="rs-dash-welcome-cta">{cta}</div>}
    </section>
  );
}