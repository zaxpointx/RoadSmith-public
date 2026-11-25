/**
 * Messaging: conversations, the transactional outbox, and delivery.
 *
 * Messages are written to rs.messages and rs.outbox inside the caller's
 * transaction. Delivery happens afterwards (dispatchOutbox), so a rolled-back
 * booking never texts anyone. In the sandbox nothing leaves the machine: the
 * outbox row is marked `sandboxed` and the message appears in the phone
 * simulator. With Twilio configured (and a non-sandbox school) it is sent.
 */
import { many, one, type Q } from './db.ts'
import { now } from './clock.ts'
import type { Ctx, School } from './school.ts'

export type Audience = 'customer' | 'instructor' | 'owner'

export interface Conversation {
  id: string
  school_id: string
  phone: string
  contact_id: string | null
  staff_id: string | null
  audience: Audience
  mode: 'agent' | 'human'
  state: ConversationState
}

export interface OfferedSlot {
  code: string
  serviceId: string
  studentId: string
  instructorId: string
  start: string
  label: string
  rescheduleLessonId?: string
}

export interface ConversationState {
  offered?: OfferedSlot[]
  offeredAt?: string
  pending?: { intent: string; data: Record<string, unknown> }
  disclosed?: boolean
}

export async function getConversation(q: Q, id: string): Promise<Conversation | null> {
  return one<Conversation>(q, `select * from rs.conversations where id = $1`, [id])
}

export async function conversationFor(ctx: Ctx, phone: string, who: { audience: Audience; contactId?: string; staffId?: string }): Promise<Conversation> {
  const existing = await one<Conversation>(ctx.q, `select * from rs.conversations where school_id = $1 and phone = $2`, [ctx.school.id, phone])
  if (existing) {
    if (existing.audience !== who.audience || existing.contact_id !== (who.contactId ?? null) || existing.staff_id !== (who.staffId ?? null)) {
      return (await one<Conversation>(ctx.q,
        `update rs.conversations set audience = $2, contact_id = $3, staff_id = $4 where id = $1 returning *`,
        [existing.id, who.audience, who.contactId ?? null, who.staffId ?? null]))!
    }
    return existing
  }
  return (await one<Conversation>(ctx.q,
    `insert into rs.conversations (school_id, phone, contact_id, staff_id, audience, last_message_at)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [ctx.school.id, phone, who.contactId ?? null, who.staffId ?? null, who.audience, now()]))!
}

export async function saveState(q: Q, convId: string, state: ConversationState) {
  await q.query(`update rs.conversations set state = $2::jsonb where id = $1`, [convId, JSON.stringify(state)])
}

/** Record an inbound text. Returns false if this provider message id was already recorded (a retry). */
export async function recordInbound(ctx: Ctx, convId: string, body: string, externalId?: string | null): Promise<boolean> {
  const r = await ctx.q.query(
    `insert into rs.messages (school_id, conversation_id, direction, author, body, external_id, created_at) values ($1, $2, 'in', 'contact', $3, $4, $5)
     on conflict (school_id, external_id) where external_id is not null do nothing returning id`,
    [ctx.school.id, convId, body, externalId ?? null, now()])
  if (!r.rows.length) return false
  await ctx.q.query(`update rs.conversations set last_message_at = $2 where id = $1`, [convId, now()])
  return true
}

export interface SendOptions {
  author?: 'agent' | 'staff' | 'system'
  reason?: string
  meta?: Record<string, unknown>
}

/** Queue an SMS to a conversation (written in the caller's transaction). */
export async function sendToConversation(ctx: Ctx, conv: Pick<Conversation, 'id' | 'phone' | 'contact_id'>, body: string, opts: SendOptions = {}) {
  const t = now()
  await ctx.q.query(
    `insert into rs.messages (school_id, conversation_id, direction, author, body, meta, created_at) values ($1, $2, 'out', $3, $4, $5::jsonb, $6)`,
    [ctx.school.id, conv.id, opts.author ?? 'agent', body, JSON.stringify(opts.meta ?? {}), t])
  await ctx.q.query(`update rs.conversations set last_message_at = $2 where id = $1`, [conv.id, t])
  const mode = deliveryMode(ctx.school)
  let status: 'queued' | 'sandboxed' | 'suppressed' | 'failed' = mode === 'twilio' ? 'queued' : mode === 'sandbox' ? 'sandboxed' : 'failed'
  if (conv.contact_id) {
    const c = await one<{ opted_out: boolean }>(ctx.q, `select opted_out from rs.contacts where id = $1`, [conv.contact_id])
    if (c?.opted_out) status = 'suppressed'
  }
  await ctx.q.query(
    `insert into rs.outbox (school_id, channel, to_address, body, status, provider, conversation_id, reason, created_at, sent_at, error)
     values ($1, 'sms', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [ctx.school.id, conv.phone, body, status, mode === 'twilio' ? 'twilio' : 'sandbox', conv.id, opts.reason ?? '', t, status === 'sandboxed' ? t : null,
      status === 'failed' ? 'Text messaging is not configured for this school (no Twilio credentials).' : null])
}

/** Text a customer contact (creates the conversation if needed). */
export async function notifyContact(ctx: Ctx, contactId: string, body: string, opts: SendOptions = {}) {
  const c = await one<{ id: string; phone: string; kind: string }>(ctx.q, `select id, phone, kind from rs.contacts where id = $1 and school_id = $2`, [contactId, ctx.school.id])
  if (!c) return
  const conv = await conversationFor(ctx, c.phone, { audience: 'customer', contactId: c.id })
  await sendToConversation(ctx, conv, body, { author: 'system', ...opts })
}

/** Text the student's family: the guardian if there is one, and the student's own phone. */
export async function notifyFamily(ctx: Ctx, studentId: string, body: string, opts: SendOptions = {}) {
  const s = await one<{ guardian_contact_id: string | null; student_contact_id: string | null }>(ctx.q,
    `select guardian_contact_id, student_contact_id from rs.students where id = $1 and school_id = $2`, [studentId, ctx.school.id])
  if (!s) return
  const ids = [...new Set([s.guardian_contact_id, s.student_contact_id].filter(Boolean) as string[])]
  for (const id of ids) await notifyContact(ctx, id, body, opts)
}

export async function notifyStaff(ctx: Ctx, staffId: string, body: string, opts: SendOptions = {}) {
  const s = await one<{ id: string; phone: string | null; role: string }>(ctx.q, `select id, phone, role from rs.staff where id = $1 and school_id = $2 and active`, [staffId, ctx.school.id])
  if (!s?.phone) return
  const conv = await conversationFor(ctx, s.phone, { audience: s.role === 'instructor' ? 'instructor' : 'owner', staffId: s.id })
  await sendToConversation(ctx, conv, body, { author: 'system', ...opts })
}

export async function notifyOwners(ctx: Ctx, body: string, opts: SendOptions = {}) {
  const owners = await many<{ id: string }>(ctx.q, `select id from rs.staff where school_id = $1 and role in ('owner','admin') and active`, [ctx.school.id])
  for (const o of owners) await notifyStaff(ctx, o.id, body, opts)
}

export function deliveryMode(school: Pick<School, 'is_sandbox'>): 'sandbox' | 'twilio' | 'unconfigured' {
  if (school.is_sandbox) return 'sandbox'
  return process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 'twilio' : 'unconfigured'
}

/** Deliver queued outbox rows. Called after the transaction that queued them commits. */
export async function dispatchOutbox(q: Q, schoolId?: string): Promise<number> {
  // Claim rows first so concurrent dispatchers (webhook, cron, Control Center) never send twice.
  const rows = await many<{ id: string; to_address: string; body: string; agent_phone: string }>(q,
    `with claimed as (
       update rs.outbox set status = 'sending' where id in (
         select id from rs.outbox where status = 'queued' and ($1::uuid is null or school_id = $1::uuid) order by created_at limit 50 for update skip locked)
       returning id, to_address, body, school_id)
     select c.id, c.to_address, c.body, s.agent_phone from claimed c join rs.schools s on s.id = c.school_id`, [schoolId ?? null])
  for (const r of rows) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID!, tokenValue = process.env.TWILIO_AUTH_TOKEN!
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${tokenValue}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: r.to_address, From: r.agent_phone, Body: r.body }),
      })
      const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string }
      if (!res.ok) throw new Error(json.message ?? `Twilio ${res.status}`)
      await q.query(`update rs.outbox set status = 'sent', provider_ref = $2, sent_at = $3 where id = $1`, [r.id, json.sid ?? null, now()])
    } catch (err) {
      await q.query(`update rs.outbox set status = 'failed', error = $2 where id = $1`, [r.id, String((err as Error).message).slice(0, 300)])
    }
  }
  return rows.length
}
