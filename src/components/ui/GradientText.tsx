import React from "react";

export function GradientText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`rs-grad-text ${className ?? ""}`}>{children}</span>;
}
