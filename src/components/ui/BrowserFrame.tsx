import React from "react";

type Props = {
  url?: string;
  children: React.ReactNode;
  live?: boolean;
  className?: string;
};

export function BrowserFrame({ url = "roadsmith.app", live, children, className }: Props) {
  return (
    <div className={`rs-browser ${className ?? ""}`}>
      <div className="rs-browser-bar">
        <div className="rs-traffic">
          <span className="rs-traffic-dot rs-red" />
          <span className="rs-traffic-dot rs-amber" />
          <span className="rs-traffic-dot rs-green" />
        </div>
        <div className="rs-url-pill">⌐ {url}</div>
        {live && (
          <span className="rs-live-pill">
            <span className="rs-live-dot" /> live
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
