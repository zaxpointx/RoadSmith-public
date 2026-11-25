import type { Ctx } from './school.ts'

export type Actor =
  | { type: 'agent'; label?: string }
  | { type: 'staff'; id: string; label: string }
  | { type: 'contact'; id: string; label: string }
  | { type: 'system'; label?: string }
  | { type: 'provider'; label: string }

export function actorLabel(a: Actor): string {
  if (a.type === 'agent') return a.label ?? 'Roadsmith agent'
  if (a.type === 'system') return a.label ?? 'Roadsmith'
  return a.label
}

export async function audit(ctx: Ctx, actor: Actor, action: string, target?: { type: string; id: string }, detail: Record<string, unknown> = {}) {
  await ctx.q.query(
    `insert into rs.audit_log (school_id, actor_type, actor_label, action, target_type, target_id, detail)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [ctx.school.id, actor.type, actorLabel(actor), action, target?.type ?? null, target?.id ?? null, JSON.stringify(detail)],
  )
}
