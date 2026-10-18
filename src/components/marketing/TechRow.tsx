'use client';

import {
  CreditCard,
  Database,
  Mail,
  Globe,
  Cloud,
  ShieldCheck,
} from "lucide-react";

type Tile = { name: string; Icon: React.ComponentType<{ size?: number; className?: string }> };

const TILES: Tile[] = [
  { name: "Stripe", Icon: CreditCard },
  { name: "Supabase", Icon: Database },
  { name: "Resend", Icon: Mail },
  { name: "Google OAuth", Icon: ShieldCheck },
  { name: "Vercel", Icon: Cloud },
  { name: "Global", Icon: Globe },
];

/**
 * TechRow — horizontal strip of 6 dim icon tiles (Stripe, Supabase, Resend,
 * Google OAuth, Vercel + one more). No animation, no carousel.
 */
export function TechRow() {
  return (
    <section className="rs-techrow">
      <div className="rs-techrow-inner">
        <div className="rs-techrow-label">Plays nicely with your stack</div>
        <div className="rs-techrow-strip">
          {TILES.map(({ name, Icon }) => (
            <div key={name} className="rs-techrow-tile" title={name}>
              <Icon size={22} className="rs-techrow-icon" />
              <span className="rs-techrow-name">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}