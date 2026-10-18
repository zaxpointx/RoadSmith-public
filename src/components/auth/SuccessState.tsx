'use client';

import { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

type Benefit = { title: string; description: string };

/**
 * SuccessState — "You're all set" panel with three benefit bullets + Continue CTA.
 * Used on /onboarding/complete and /signup success.
 */
export function SuccessState({
  heading,
  subheading,
  benefits,
  ctaLabel,
  ctaHref,
  onCta,
}: {
  heading: ReactNode;
  subheading?: ReactNode;
  benefits: Benefit[];
  ctaLabel: string;
  ctaHref?: string;
  onCta?: () => void;
}) {
  return (
    <div className="rs-success">
      <h1 className="rs-success-h1">{heading}</h1>
      {subheading && <p className="rs-success-sub">{subheading}</p>}
      <ul className="rs-success-list">
        {benefits.map((b) => (
          <li key={b.title} className="rs-success-item">
            <CheckCircle2 size={20} className="rs-success-check" aria-hidden="true" />
            <div>
              <div className="rs-success-item-title">{b.title}</div>
              <div className="rs-success-item-desc">{b.description}</div>
            </div>
          </li>
        ))}
      </ul>
      {ctaHref ? (
        <a href={ctaHref} className="rs-cta rs-cta-primary rs-cta-glow rs-success-cta">
          {ctaLabel}
        </a>
      ) : (
        <button type="button" onClick={onCta} className="rs-cta rs-cta-primary rs-cta-glow rs-success-cta">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}