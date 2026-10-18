"use client";

import React from "react";
import {
  RoadsmithWordmark,
  Starfield,
  SessionRow,
  StatusPill,
  KPITile,
  Sparkline,
} from "@/components/ui";

const SESSIONS = [
  { time: "Mon 09:00", name: "Ava Chen — BTW Lesson 4", pill: <StatusPill variant="green">Confirmed</StatusPill> },
  { time: "Mon 10:30", name: "Marcus Reed — Road Test Prep", pill: <StatusPill variant="violet">Instructor: J. Park</StatusPill> },
  { time: "Mon 13:00", name: "Sofia Alvarez — BTW Lesson 1", pill: <StatusPill variant="amber">Payment due</StatusPill> },
  { time: "Tue 09:00", name: "Liam Foster — BTW Lesson 6", pill: <StatusPill variant="green">Confirmed</StatusPill> },
  { time: "Tue 14:00", name: "Emma Patel — Road Test", pill: <StatusPill variant="blue">DMV scheduled</StatusPill> },
  { time: "Wed 11:00", name: "Noah Williams — BTW Lesson 2", pill: <StatusPill variant="green">Confirmed</StatusPill> },
];

const COMPLIANCE = [
  { name: "TN DOS license renewal", pill: <StatusPill variant="green">Filed 6/12</StatusPill> },
  { name: "Instructor B. Hayes — cert", pill: <StatusPill variant="amber">Expires 8/4</StatusPill> },
  { name: "Vehicle registration (3)", pill: <StatusPill variant="green">Current</StatusPill> },
  { name: "Liability insurance", pill: <StatusPill variant="green">Current</StatusPill> },
];

const COLLECTIONS = [
  { name: "Sofia Alvarez", pill: <StatusPill variant="amber">$480 · 5d late</StatusPill> },
  { name: "Marcus Reed", pill: <StatusPill variant="amber">$640 · 12d late</StatusPill> },
];

const SIDEBAR_LINKS = [
  { label: "⌂ Overview", active: true },
  { label: "◷ Students", active: false },
  { label: "⏱ Sessions", active: false },
  { label: "⛟ Instructors", active: false },
  { label: "▤ Billing", active: false },
  { label: "⚙ Settings", active: false },
];

export default function DashboardPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", color: "var(--rs-text)", fontFamily: "var(--rs-font-display)" }}>
      <Starfield />

      <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside style={{ background: "rgba(255,255,255,0.02)", borderRight: "1px solid var(--rs-border)", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ padding: "0 8px" }}>
            <RoadsmithWordmark />
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SIDEBAR_LINKS.map((link) => (
              <div
                key={link.label}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                  background: link.active ? "rgba(124,58,237,0.12)" : "transparent",
                  border: link.active ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent",
                  color: link.active ? "var(--rs-text)" : "var(--rs-text-muted)",
                }}
              >
                {link.label}
              </div>
            ))}
          </nav>
          <div style={{ marginTop: "auto" }}>
            <div style={{ padding: "10px 12px", borderRadius: 8, fontSize: 14, color: "var(--rs-text-muted)", cursor: "pointer" }}>
              ⎋ Logout
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ padding: "32px 40px", overflowX: "auto" }}>
          <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>
                Good morning, <em className="rs-italic">Showcase Academy</em>
              </h1>
              <p style={{ fontSize: 14, color: "var(--rs-text-muted)" }}>
                6 behind-the-wheel sessions scheduled today · 2 students ready for road test
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="rs-cta rs-cta-ghost">+ New session</button>
              <button className="rs-cta rs-cta-primary">+ Add student</button>
            </div>
          </header>

          {/* KPI strip */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <KPITile label="Active students" number={248} trend="▲ 12% this month" trendDirection="up" />
            <KPITile label="Sessions this week" number={96} trend="▲ 8% vs last week" trendDirection="up" />
            <KPITile label="Hours logged" number={412} trend="▲ 24% MTD" trendDirection="up" />
            <KPITile label="Revenue MTD" number="$18.2k" trend="▲ 18% MoM" trendDirection="up" />
          </section>

          {/* Three panels */}
          <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
            {/* Sessions panel */}
            <div style={{ background: "var(--rs-surface)", border: "1px solid var(--rs-border)", borderRadius: 16, padding: 20 }}>
              <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>This week&apos;s sessions</h2>
                <a href="#" className="rs-field-link" style={{ fontSize: 12 }}>View all →</a>
              </header>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SESSIONS.map((s, i) => (
                  <SessionRow key={i} time={s.time} name={s.name} pill={s.pill} />
                ))}
              </div>
              {/* Sparkline footer */}
              <div style={{ marginTop: 14, padding: "0 4px" }}>
                <Sparkline />
              </div>
            </div>

            {/* Compliance panel */}
            <div style={{ background: "var(--rs-surface)", border: "1px solid var(--rs-border)", borderRadius: 16, padding: 20 }}>
              <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Compliance status</h2>
                <a href="#" className="rs-field-link" style={{ fontSize: 12 }}>Details →</a>
              </header>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {COMPLIANCE.map((c, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--rs-border)", borderRadius: 8, fontSize: 13 }}
                  >
                    <span style={{ color: "var(--rs-text)" }}>{c.name}</span>
                    {c.pill}
                  </div>
                ))}
              </div>
            </div>

            {/* Collections panel */}
            <div style={{ background: "var(--rs-surface)", border: "1px solid var(--rs-border)", borderRadius: 16, padding: 20 }}>
              <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Collections</h2>
                <a href="#" className="rs-field-link" style={{ fontSize: 12 }}>View all →</a>
              </header>
              <KPITile label="Outstanding" number="$3,420" trend="Across 7 students" wide />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {COLLECTIONS.map((row, i) => (
                  <SessionRow key={i} hideTime name={row.name} pill={row.pill} />
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
