'use client';

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar, TopStat } from "./TopBar";

/**
 * DashboardLayout — wraps /school-admin with the Sidebar + TopBar shell.
 * Children render in the main content area.
 */
export function DashboardLayout({
  stats,
  children,
}: {
  stats?: TopStat[];
  children: ReactNode;
}) {
  return (
    <div className="rs-dash-shell">
      <Sidebar />
      <main className="rs-dash-main">
        {stats && stats.length > 0 && <TopBar stats={stats} />}
        {children}
      </main>
    </div>
  );
}