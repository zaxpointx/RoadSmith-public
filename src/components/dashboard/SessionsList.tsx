'use client';

import { StatusPill } from "@/components/ui/StatusPill";

export type SessionRowData = {
  id: string;
  time: string;
  student: string;
  pickup?: string;
  instructor: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
};

/**
 * SessionsList — "This week's sessions" list. Each row: time, student,
 * pickup, instructor, status pill. Uses the existing StatusPill primitive.
 */
export function SessionsList({ rows, title = "This week" }: { rows: SessionRowData[]; title?: string }) {
  return (
    <section className="rs-dash-sessions">
      <header className="rs-dash-section-title">{title}</header>
      <ul className="rs-dash-sessions-list">
        {rows.map((r) => (
          <li key={r.id} className="rs-dash-sessions-row">
            <span className="rs-dash-sessions-time">{r.time}</span>
            <span className="rs-dash-sessions-name">
              <span>{r.student}</span>
              {r.pickup && <span className="rs-dash-sessions-pickup">— {r.pickup}</span>}
            </span>
            <span className="rs-dash-sessions-instructor">{r.instructor}</span>
            <StatusPill variant={pillFor(r.status)}>{labelFor(r.status)}</StatusPill>
          </li>
        ))}
      </ul>
    </section>
  );
}

function pillFor(s: SessionRowData["status"]): "green" | "blue" | "violet" | "amber" | "rose" {
  if (s === "in_progress") return "blue";
  if (s === "completed") return "green";
  if (s === "cancelled") return "rose";
  return "violet";
}

function labelFor(s: SessionRowData["status"]): string {
  if (s === "in_progress") return "In progress";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  return "Scheduled";
}