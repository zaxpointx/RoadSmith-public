/**
 * The owner's inbox: the only place a human has to look. Approvals carry a
 * concrete action that runs, deterministically, when the owner says yes.
 */
import { many, one } from './db.ts'
import { now } from './clock.ts'
import { audit, type Actor } from './audit.ts'
import { notifyOwners, getConversation, sendToConversation } from './messaging.ts'
import { OsError } from './util.ts'
import type { Ctx } from './school.ts'

export type ActionType = 'move_lesson' | 'cancel_lesson' | 'refund_payment' | 'apply_drive_plan' | 'hold_lesson' | 'enroll_course'
export interface InboxAction { type: ActionType; args: Record<string, unknown> }

export interface InboxItem {
  id: string
  kind: 'approval' | 'escalation' | 'alert'
  priority: 'normal' | 'urgent'
  title: string
  detail: string
  action: InboxAction | null
  conversation_id: string | null
  status: 'open' | 'approved' | 'declined' | 'resolved'
  resolution: Record<string, unknown> | null
  created_at: Date
  decided_at: Date | null
}

export async function createInbox(ctx: Ctx, item: { kind: InboxItem['kind']; title: string; detail?: string; action?: InboxAction; conversationId?: string | null; priority?: InboxItem['priority'] }): Promise<InboxItem> {
  const row = (await one<InboxItem>(ctx.q,
    `insert into rs.inbox (school_id, kind, priority, title, detail, action, conversation_id, created_at)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8) returning *`,
    [ctx.school.id, item.kind, item.priority ?? 'normal', item.title.slice(0, 200), item.detail ?? '', item.action ? JSON.stringify(item.action) : null, item.conversationId ?? null, now()]))!
  await audit(ctx, { type: 'agent' }, `inbox.${item.kind}`, { type: 'inbox', id: row.id }, { title: row.title })
  if (row.priority === 'urgent') await notifyOwners(ctx, `Needs you now: ${row.title}. Open the Roadsmith inbox to decide.`, { reason: 'urgent_inbox' })
  return row
}

export async function openInbox(ctx: Ctx): Promise<InboxItem[]> {
  return many<InboxItem>(ctx.q, `select * from rs.inbox where school_id = $1 and status = 'open' order by (priority = 'urgent') desc, created_at`, [ctx.school.id])
}

export async function getInboxItem(ctx: Ctx, id: string): Promise<InboxItem | null> {
  return one<InboxItem>(ctx.q, `select * from rs.inbox where id = $1 and school_id = $2`, [id, ctx.school.id])
}

/**
 * Decide an item. `approve` runs the attached action; failures leave the item
 * open with the reason so nothing is silently half-done.
 */
export async function decideInbox(ctx: Ctx, args: { id: string; decision: 'approve' | 'decline' | 'resolve'; staffId: string; staffName: string; note?: string; replyToCustomer?: string }):
  Promise<{ item: InboxItem; result?: string }> {
  const item = await one<InboxItem>(ctx.q, `select * from rs.inbox where id = $1 and school_id = $2 for update`, [args.id, ctx.school.id])
  if (!item) throw new OsError('not_found', 'Item not found.')
  if (item.status !== 'open') throw new OsError('invalid', 'That item was already handled.')
  const actor: Actor = { type: 'staff', id: args.staffId, label: args.staffName }
  let result: string | undefined
  if (args.decision === 'approve') {
    if (!item.action) throw new OsError('invalid', 'Nothing to approve on this item; mark it handled instead.')
    const { executeAction } = await import('./actions.ts')
    result = await executeAction(ctx, item.action, actor)
  }
  const status = args.decision === 'approve' ? 'approved' : args.decision === 'decline' ? 'declined' : 'resolved'
  const updated = (await one<InboxItem>(ctx.q,
    `update rs.inbox set status = $2, decided_by = $3, decided_at = $4, resolution = $5::jsonb where id = $1 returning *`,
    [item.id, status, args.staffId, now(), JSON.stringify({ note: args.note ?? '', result: result ?? null })]))!
  if (item.conversation_id && args.replyToCustomer?.trim()) {
    const conv = await getConversation(ctx.q, item.conversation_id)
    if (conv) await sendToConversation(ctx, conv, args.replyToCustomer.trim(), { author: 'staff', reason: 'inbox_reply' })
  }
  await audit(ctx, actor, `inbox.${status}`, { type: 'inbox', id: item.id }, { title: item.title, result: result ?? null })
  return { item: updated, result }
}
