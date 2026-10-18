'use client';

import { KPITile } from "@/components/ui/KPITile";

type Props = {
  index: number; // 1-3
  name: string; // e.g. "Find the Biggest Opportunities"
  headline: string;
  description: string;
  kpi: { label: string; number: string; trend?: string };
  flip?: boolean; // alternate the column order on desktop
};

/**
 * NumberedSection — TEDDY AI-style "0X. NAME" feature section.
 * KPI tile pair on one side, headline + description on the other.
 * Section 1 = Find the Biggest Opportunities
 * Section 2 = Scale Without Growing Headcount
 * Section 3 = Get Paid On Time
 */
export function NumberedSection({
  index,
  name,
  headline,
  description,
  kpi,
  flip = false,
}: Props) {
  const idx = String(index).padStart(2, "0");
  return (
    <section className={`rs-numsec ${flip ? "rs-numsec-flip" : ""}`}>
      <div className="rs-numsec-inner">
        <div className="rs-numsec-text">
          <div className="rs-numsec-badge">
            <span className="rs-numsec-badge-num">{idx}.</span>
            <span className="rs-numsec-badge-name">{name}</span>
          </div>
          <h2 className="rs-numsec-h2">{headline}</h2>
          <p className="rs-numsec-desc">{description}</p>
        </div>
        <div className="rs-numsec-kpis">
          <KPITile label={kpi.label} number={kpi.number} trend={kpi.trend} trendDirection="up" wide />
        </div>
      </div>
    </section>
  );
}