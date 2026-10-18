'use client';

import { ReactNode } from "react";

/**
 * AuthCard — the centered card shell for Payvex-style auth screens.
 * Single primary CTA per screen, generous whitespace, Roadsmith logo at the top.
 * Used as the inner content of AuthLayout, or on its own on a dark canvas.
 */
export function AuthCard({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="rs-auth-card">
      {(title || subtitle) && (
        <header className="rs-auth-card-head">
          {title && <h1 className="rs-auth-card-title">{title}</h1>}
          {subtitle && <p className="rs-auth-card-sub">{subtitle}</p>}
        </header>
      )}
      <div className="rs-auth-card-body">{children}</div>
    </div>
  );
}