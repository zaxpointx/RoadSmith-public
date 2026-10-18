'use client';

import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

/**
 * CTASection — closing dark-glass card with a final CTA.
 * Mirrors the hero tone. Single primary CTA.
 */
export function CTASection() {
  return (
    <section className="rs-cta-section">
      <GlassCard className="rs-cta-card">
        <h2 className="rs-cta-h2">
          Ready to get off the <em>paperwork</em> treadmill?
        </h2>
        <p className="rs-cta-sub">
          Tennessee compliance handled. Stripe wired. Your dashboard waiting.
        </p>
        <Link href="/signup" className="rs-cta rs-cta-primary rs-cta-glow">
          Start free trial
        </Link>
      </GlassCard>
    </section>
  );
}