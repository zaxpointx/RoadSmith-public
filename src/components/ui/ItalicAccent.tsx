import React from "react";

export function ItalicAccent({ children }: { children: React.ReactNode }) {
  // Renders inside an H1. Grabs a gradient via bg-clip on the parent class .rs-italic
  return <span className="rs-italic">{children}</span>;
}
