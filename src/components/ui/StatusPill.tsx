import React from "react";

type Variant = "green" | "violet" | "amber" | "blue" | "rose";
type Props = {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
};

export function StatusPill({ children, variant = "green", className }: Props) {
  return (
    <span className={`rs-pill rs-pill-${variant} ${className ?? ""}`}>{children}</span>
  );
}
