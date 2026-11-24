/**
 * The OS clock. In production this is wall-clock time. In the sandbox the
 * owner can fast-forward time (to see 7am briefs, reminders and hold expiry)
 * without waiting; the offset is stored in rs.settings so it survives restarts.
 */
import type { Q } from './db.ts'

const g = globalThis as unknown as { __rsClockOffsetMs?: number }

export function now(): Date {
  return new Date(Date.now() + (g.__rsClockOffsetMs ?? 0))
}

export async function loadClock(q: Q): Promise<void> {
  const { rows } = await q.query<{ value: { offsetMs: number } }>(`select value from rs.settings where key = 'clock'`)
  g.__rsClockOffsetMs = rows[0]?.value?.offsetMs ?? 0
}

export async function setClockOffset(q: Q, offsetMs: number): Promise<void> {
  g.__rsClockOffsetMs = offsetMs
  await q.query(
    `insert into rs.settings (key, value) values ('clock', $1::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [JSON.stringify({ offsetMs })],
  )
}

export function clockOffsetMs(): number {
  return g.__rsClockOffsetMs ?? 0
}
