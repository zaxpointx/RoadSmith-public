import React from "react";

type Props = {
  label: string;
  number: string | number;
  trend?: string;
  trendDirection?: "up" | "down";
  wide?: boolean;
  className?: string;
};

export function KPITile({ label, number, trend, trendDirection, wide, className }: Props) {
  return (
    <div className={`rs-kpi ${wide ? "rs-kpi-wide" : ""} ${className ?? ""}`}>
      <div className="rs-kpi-label">{label}</div>
      <div className="rs-kpi-number">{number}</div>
      {trend && (
        <div className={`rs-kpi-trend ${trendDirection ? trendDirection : ""}`}>{trend}</div>
      )}
    </div>
  );
}
