import React from "react";

export function Sticker({ children, className }: { children: React.ReactNode; className?: string }) {
  // .rs-sticker applies perspective tilt + hover float
  return <div className={`rs-sticker ${className ?? ""}`}>{children}</div>;
}
