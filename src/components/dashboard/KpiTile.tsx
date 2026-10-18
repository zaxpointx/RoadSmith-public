'use client';

import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  /** Optional percentage delta (e.g. "+12%" or "-3%"). */
  delta?: string;
  direction?: "up" | "down";
  Icon?: LucideIcon;
};

/**
 * KpiTile — single stat card for the admin topbar. Mono numbers, lime-green
 * triangle delta on up, red on down. Reused across the TopBar's 4-tile strip.
 */
export function KpiTile({ label, value, delta, direction = "up", Icon }: Props) {
  const TrendIcon = direction === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="rs-kpi-tile">
      <div className="rs-kpi-tile-label">
        {Icon && <Icon size={14} className="rs-kpi-tile-icon" aria-hidden="true" />}
        <span>{label}</span>
      </div>
      <div className="rs-kpi-tile-value">{value}</div>
      {delta && (
        <div className={`rs-kpi-tile-delta rs-kpi-tile-delta-${direction}`}>
          <TrendIcon size={12} />
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}