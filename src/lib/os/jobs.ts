/** Durable scheduled work (reminders, hold expiry, daily briefs). */
import { many, type Q } from './db.ts'
import { now } from './clock.ts'
import type { Ctx } from './school.ts'

export interface Job { id: string; school_id: string; kind: string; run_at: Date; payload: Record<string, unknown>; dedupe_key: string; attempts: number }

export async function scheduleJob(ctx: Ctx, kind: string, runAt: Date, payload: Record<string, unknown>, dedupeKey: string) {
  await ctx.q.query(
    `insert into rs.jobs (school_id, kind, run_at, payload, dedupe_key, created_at) values ($1,$2,$3,$4::jsonb,$5,$6)
     on conflict (dedupe_key) do update set run_at = excluded.run_at, payload = excluded.payload, status = 'pending', attempts = 0
       where rs.jobs.status <> 'done'`,
    [ctx.school.id, kind, runAt, JSON.stringify(payload), dedupeKey, now()])
}

export async function cancelJobs(ctx: Ctx, dedupePrefix: string) {
  await ctx.q.query(`update rs.jobs set status = 'cancelled' where school_id = $1 and status = 'pending' and dedupe_key like $2`,
    [ctx.school.id, `${dedupePrefix}%`])
}

export async function dueJobs(q: Q, schoolId: string, limit = 50): Promise<Job[]> {
  return many<Job>(q, `select * from rs.jobs where school_id = $1 and status = 'pending' and run_at <= $2 order by run_at limit $3`, [schoolId, now(), limit])
}
