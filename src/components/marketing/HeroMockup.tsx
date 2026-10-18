'use client';

import { BrowserFrame } from "@/components/ui/BrowserFrame";
import { KPITile } from "@/components/ui/KPITile";
import { SessionRow } from "@/components/ui/SessionRow";
import { StatusPill } from "@/components/ui/StatusPill";
import { Sparkline } from "@/components/ui/Sparkline";

/**
 * HeroMockup — the floating browser-frame sticker under the marketing hero.
 * Previews a Coinstax-style Roadsmith dashboard. Static, no API.
 * Uses real product primitives from src/components/ui/ so the visual matches the real /school-admin surface.
 */
export function HeroMockup() {
  return (
    <div className="rs-hero-mockup">
      <BrowserFrame url="roadsmith.app / dashboard" live>
        <div className="rs-hero-mock-body">
          {/* sidebar */}
          <aside className="rs-hero-side">
            <div className="rs-hero-side-logo">
              <span className="rs-hero-side-logo-road">ROAD</span>
                          <span className="rs-hero-side-logo-smith">SMITH</span>
            </div>
            <div className="rs-hero-side-nav">
              <div className="rs-hero-side-link rs-hero-side-link-active">Dashboard</div>
              <div className="rs-hero-side-link">Students</div>
              <div className="rs-hero-side-link">Sessions</div>
              <div className="rs-hero-side-link">Instructors</div>
              <div className="rs-hero-side-link">Compliance</div>
              <div className="rs-hero-side-link">Billing</div>
            </div>
          </aside>

          {/* main */}
          <div className="rs-hero-main">
            <div className="rs-hero-topbar">
              <div>
                <div className="rs-hero-school-name">Showcase Academy</div>
                <div className="rs-hero-breadcrumb">Dashboard / Overview</div>
              </div>
              <div className="rs-hero-avatar">MW</div>
            </div>

            <div className="rs-hero-kpis">
              <KPITile label="Active Students" number="142" trend="+8 this week" trendDirection="up" />
              <KPITile label="Sessions This Week" number="37" trend="+12% vs last" trendDirection="up" />
              <KPITile label="Revenue MTD" number="$8,420" trend="+18% vs last" trendDirection="up" />
            </div>

            <div className="rs-hero-sessions">
              <div className="rs-hero-section-title">This week</div>
              <SessionRow
                time="Mon 9:00"
                name="Emma R. — Cedar Bluff"
                pill={<StatusPill variant="green">In progress</StatusPill>}
              />
              <SessionRow
                time="Mon 10:30"
                name="Jayden T. — Powell Park"
                pill={<StatusPill variant="blue">Scheduled</StatusPill>}
              />
              <SessionRow
                time="Tue 1:00"
                name="Maya K. — Farragut HS"
                pill={<StatusPill variant="blue">Scheduled</StatusPill>}
              />
            </div>

            <div className="rs-hero-spark">
              <div className="rs-hero-section-title">Weekly growth</div>
              <Sparkline />
            </div>
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}