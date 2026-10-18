'use client';

import Link from "next/link";
import { EyebrowPill } from "@/components/ui/EyebrowPill";
import { GradientText } from "@/components/ui/GradientText";
import { ItalicAccent } from "@/components/ui/ItalicAccent";
import { HeroMockup } from "./HeroMockup";
import { Starfield } from "@/components/ui/Starfield";

/**
 * Hero — eyebrow + H1 (gradient or italic accent on second line) + subhead + single CTA.
 * Visual register matches TEDDY AI: black starfield bg, gradient on H1 second line.
 * Above-the-fold content fits a 1440x900 viewport.
 */
export function Hero() {
  return (
    <section className="rs-hero">
      <Starfield />
      <div className="rs-hero-inner">
        <EyebrowPill dot>Built for Tennessee driving schools</EyebrowPill>
        <h1 className="rs-hero-h1">
          Run your driving school<br />
          <GradientText>from one dashboard.</GradientText>
        </h1>
        <p className="rs-hero-sub">
          Roadsmith handles the <ItalicAccent>time</ItalicAccent>, the <ItalicAccent>location</ItalicAccent>, and the <ItalicAccent>travel</ItalicAccent> —
          so you can focus on teaching. Tennessee compliance paperwork, included.
        </p>
        <div className="rs-hero-cta-row">
          <Link href="/signup" className="rs-cta rs-cta-primary rs-cta-glow">
            Start free trial
          </Link>
          <Link href="/login" className="rs-cta rs-cta-ghost">
            Try the demo
          </Link>
        </div>
        <HeroMockup />
      </div>
    </section>
  );
}