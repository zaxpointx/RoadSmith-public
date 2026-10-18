import React from "react";

// 30-line reference inline SVG sparkline, lime color. Static points for now.
type Props = { points?: number[]; className?: string };

const DEFAULT_POINTS = [4, 7, 5, 9, 6, 11, 8, 12, 9, 13, 10, 14, 11, 16, 13, 18, 15, 19, 16, 21];

export function Sparkline({ points = DEFAULT_POINTS, className }: Props) {
  const w = 160;
  const h = 36;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const stepX = w / (points.length - 1);
  const coords = points.map((v, i) => [i * stepX, h - ((v - min) / span) * (h - 4) - 2]);
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
  const fill = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ width: "100%", height: "auto", color: "var(--rs-lime)" }}
      aria-hidden="true"
    >
      <path d={fill} fill="currentColor" opacity="0.18" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
