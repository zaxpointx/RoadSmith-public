import React from "react";

type Props = {
  href?: string;
  size?: number;
  className?: string;
};

// Logomark: ROAD (white) + SMITH (gradient via .rs-grad-logo in globals.css)
export function RoadsmithWordmark({ href = "/", size = 18, className }: Props) {
  const Tag = href ? "a" : "span";
  return React.createElement(
    Tag,
    { href, className: `logo ${className ?? ""}`, style: { fontWeight: 900, fontSize: size, letterSpacing: "-0.04em", textDecoration: "none", display: "inline-flex" } },
    <span className="rs-logo-road">ROAD</span>,
    <span className="rs-logo-smith">SMITH</span>
  );
}
