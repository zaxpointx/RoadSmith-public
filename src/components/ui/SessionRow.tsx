import React from "react";

type Props = {
  time?: string;
  name: string;
  pill?: React.ReactNode;
  hideTime?: boolean;
  className?: string;
};

export function SessionRow({ time, name, pill, hideTime, className }: Props) {
  return (
    <div className={`rs-session ${className ?? ""}`} style={hideTime ? { gridTemplateColumns: "1fr auto" } : undefined}>
      {!hideTime && time && <span className="rs-session-time">{time}</span>}
      <span>{name}</span>
      {pill ?? <span />}
    </div>
  );
}
