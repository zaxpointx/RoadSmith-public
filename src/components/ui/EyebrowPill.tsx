import React from "react";

type Props = {
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
};

export function EyebrowPill({ children, dot = true, className }: Props) {
  return (
    <span className={`rs-eyebrow ${className ?? ""}`}>
      {dot && <span className="rs-status-dot" />}
      {children}
    </span>
  );
}
