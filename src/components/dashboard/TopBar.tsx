'use client';

import { KpiTile } from "./KpiTile";

export type TopStat = {
  label: string;
  value: string | number;
  delta?: string;
  direction?: "up" | "down";
};

/**
 * TopBar — 4-tile KPI strip at the top of /school-admin.
 * Bento dashboard register: mono numbers, lime triangle deltas.
 */
export function TopBar({ stats }: { stats: TopStat[] }) {
  return (
    <div className="rs-dash-topbar">
      {stats.slice(0, 4).map((s) => (
        <KpiTile key={s.label} {...s} />
      ))}
    </div>
  );
}