/**
 * Inbound message router: one entry point for every text, whether it came
 * from Twilio or the sandbox phone.
 *
 *  1. Resolve the school from the number that was texted (tenant boundary).
 *  2. Resolve who is texting from their number: staff → instructor/owner
 *     assistant; anyone else → customer assistant (new numbers become leads).
 *  3. Carrier keywords (STOP/START/HELP) are handled by code, never the AI.
 *  4. If a human has taken over the conversation, the agent stays quiet.
 *  5. Otherwise the agent (Claude, or the built-in interpreter) replies; every
 *     action goes through permission-checked tools and the audit log.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { many, one, type Db } from '../db.ts'
import { now } from '../clock.ts'
import { audit } from '../audit.ts'
import { createInbox } from '../inbox.ts'
import { conversationFor, dispatchOutbox, getConversation, recordInbound, saveState, sendToConversation, type Conversation } from '../messaging.ts'
import { schoolByPhone, type Ctx, type School } from '../school.ts'
import { normalizePhone } from '../util.ts'
import { fmtTime, localDate } from '../time.ts'
import { claudeConfigured, runClaudeTurn } from './claude.ts'
import { customerTurn, staffTurn } from './interpreter.ts'
import { systemPrompt } from './prompt.ts'
import type { AgentCtx, ToolEvent, Who } from './tools.ts'

const STOP = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|optout|opt out|revoke)\s*[.!]?\s*$/i
const START = /^\s*(start|unstop|subscribe)\s*[.!]?\s*$/i
const HELP = /^\s*(help|info)\s*[.!?]?\s*$/i

export type Engine = 'claude' | 'interpreter'
export function activeEngine(): Engine {
  if (process.env.ROADSMITH_AGENT_ENGINE === 'interpreter') return 'interpreter'
  return claudeConfigured() ? 'claude' : 'interpreter'
}

export interface InboundResult {
  handled: boolean
  reason?: string
  reply?: string
  conversationId?: string
  engine?: Engine
  events?: ToolEvent[]
}

async function identify(ctx: Ctx, phone: string): Promise<Who> {
  const staff = await one<{ id: string; name: string; role: string }>(ctx.q, `select id, name, role from rs.staff where school_id = $1 and phone = $2 and active`, [ctx.school.id, phone])
  if (staff) return { audience: staff.role === 'instructor' ? 'instructor' : 'owner', staffId: staff.id, name: staff.name, phone }
  let c = await one<{ id: string; name: string }>(ctx.q, `select id, name from rs.contacts where school_id = $1 and phone = $2`, [ctx.school.id, phone])
  if (!c) {
    c = (await one<{ id: string; name: string }>(ctx.q, `insert into rs.contacts (school_id, phone, kind, first_contact_at) values ($1,$2,'lead',$3) returning id, name`, [ctx.school.id, phone, now()]))!
    await audit(ctx, { type: 'system' }, 'contact.new_lead', { type: 'contact', id: c.id }, {})
  }
  return { audience: 'customer', contactId: c.id, name: c.name, phone }
}

function disclosure(school: School) {
  return `\n\n— ${school.name}'s automated assistant. A person is a text away; reply STOP to opt out.`
}

async function historyFor(db: Db, conv: Conversation): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const rows = (await many<{ direction: string; body: string; author: string }>(db,
    `select direction, body, author from rs.messages where conversation_id = $1 order by created_at desc limit 20`, [conv.id])).reverse()
  const out: Anthropic.Beta.BetaMessageParam[] = []
  for (const r of rows) {
    const role = r.direction === 'in' ? 'user' : 'assistant'
    const text = r.author === 'staff' ? `[sent by school staff] ${r.body}` : r.author === 'system' ? `[automatic message] ${r.body}` : r.body
    const last = out[out.length - 1]
    if (last && last.role === role && typeof last.content === 'string') last.content += `\n${text}`
    else out.push({ role, content: text })
  }
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

function contextText(a: AgentCtx): string {
  const tz = a.school.timezone
  const t = now()
  const lines = [
    `Now: ${localDate(t, tz)} ${fmtTime(t, tz)} (${tz}).`,
    a.who.audience === 'customer'
      ? `Texting: ${a.who.name || 'a new contact (name unknown)'} at ${a.who.phone}. Use my_account to see their students.`
      : `Texting: ${a.who.name}, ${a.who.audience}.`,
  ]
  if (a.state.offered?.length) lines.push(`Lesson options currently offered: ${a.state.offered.map((o) => `${o.code}) ${o.label}`).join('; ')}.`)
  return lines.join('\n')
}

export async function handleInbound(db: Db, args: { to: string; from: string; body: string; externalId?: string }): Promise<InboundResult> {
  const to = normalizePhone(args.to), from = normalizePhone(args.from)
  const body = String(args.body ?? '').slice(0, 1600).trim()
  if (!to || !from || !body) return { handled: false, reason: 'invalid message' }
  const school = await schoolByPhone(db, to)
  if (!school) return { handled: false, reason: 'unknown destination number' }

  // Step 1: record the message and apply carrier keywords.
  const pre = await db.tx(async (q) => {
    const ctx: Ctx = { q, school }
    const who = await identify(ctx, from)
    const conv = await conversationFor(ctx, from, { audience: who.audience, contactId: who.audience === 'customer' ? who.contactId : undefined, staffId: who.audience !== 'customer' ? who.staffId : undefined })
    if (!(await recordInbound(ctx, conv.id, body, args.externalId))) return { done: true as const, reply: 'duplicate delivery ignored', conv }
    if (who.audience === 'customer') {
      const contact = (await one<{ opted_out: boolean }>(q, `select opted_out from rs.contacts where id = $1`, [who.contactId]))!
      if (STOP.test(body)) {
        await q.query(`update rs.contacts set opted_out = false where id = $1`, [who.contactId])
        await sendToConversation(ctx, conv, `You're unsubscribed from ${school.name} texts and won't get more messages. Reply START to resubscribe. (If you meant to cancel a lesson, reply START, then tell us which lesson.)`, { author: 'system', reason: 'opt_out' })
        await q.query(`update rs.contacts set opted_out = true where id = $1`, [who.contactId])
        await audit(ctx, { type: 'contact', id: who.contactId, label: who.name || from }, 'contact.opted_out', { type: 'contact', id: who.contactId })
        return { done: true as const, reply: 'opted out', conv }
      }
      if (START.test(body)) {
        await q.query(`update rs.contacts set opted_out = false where id = $1`, [who.contactId])
        await sendToConversation(ctx, conv, `You're resubscribed to ${school.name} texts. How can we help?`, { author: 'system', reason: 'opt_in' })
        await audit(ctx, { type: 'contact', id: who.contactId, label: who.name || from }, 'contact.opted_in', { type: 'contact', id: who.contactId })
        return { done: true as const, reply: 'opted in', conv }
      }
      if (HELP.test(body)) {
        await sendToConversation(ctx, conv, `${school.name}: automated assistant for lessons, classes and payments. ${school.playbook.office_hours} Reply STOP to opt out. Msg & data rates may apply.`, { author: 'system', reason: 'help' })
        return { done: true as const, reply: 'help', conv }
      }
      if (contact.opted_out) return { done: true as const, reply: 'suppressed (opted out)', conv }
    }
    if (conv.mode === 'human') {
      const open = await one(q, `select 1 from rs.inbox where conversation_id = $1 and status = 'open' and kind = 'alert'`, [conv.id])
      if (!open) await createInbox(ctx, { kind: 'alert', title: `New message in a conversation you took over (${who.name || from})`, detail: body.slice(0, 300), conversationId: conv.id })
      return { done: true as const, reply: 'human mode', conv }
    }
    return { done: false as const, who, conv }
  })
  if (pre.done) {
    await dispatchOutbox(db, school.id)
    return { handled: true, reason: pre.reply, conversationId: pre.conv.id }
  }

  // Step 2: the agent turn. Tools run in their own transactions.
  const conv = (await getConversation(db, pre.conv.id))!
  const a: AgentCtx = { q: db, db, school, conv, who: pre.who, state: { ...(conv.state ?? {}) }, events: [] }
  const engine = activeEngine()
  const started = Date.now()
  let reply = ''
  let run: { model?: string; inputTokens?: number; outputTokens?: number; grounding?: unknown; error?: string } = {}
  try {
    if (engine === 'claude') {
      const turn = await runClaudeTurn(a, { system: await systemPrompt(a, a.who), history: await historyFor(db, conv), context: contextText(a) })
      run = { model: turn.model, inputTokens: turn.inputTokens, outputTokens: turn.outputTokens, grounding: turn.grounding }
      reply = turn.reply
      if (turn.refused || !turn.grounding.ok || !reply) {
        await db.tx((q) => createInbox({ q, school }, { kind: 'escalation', title: `Assistant couldn't answer safely (${a.who.name || a.who.phone})`, detail: `Message: ${body}\n${turn.refused ? 'Model declined.' : `Unverified details: ${turn.grounding.issues.join(', ')}`}`, conversationId: conv.id }))
        reply = "Let me get the office to confirm that for you — someone will follow up shortly."
      }
    } else {
      reply = a.who.audience === 'customer' ? await customerTurn(a, body) : await staffTurn(a, body)
      run = { model: 'built-in interpreter' }
    }
  } catch (err) {
    console.error('[roadsmith] agent turn failed', err)
    run.error = String((err as Error).message ?? err).slice(0, 300)
    await db.tx((q) => createInbox({ q, school }, { kind: 'alert', title: `Assistant error while replying to ${a.who.name || a.who.phone}`, detail: `Message: ${body}\nError: ${run.error}`, conversationId: conv.id }))
    reply = "Sorry — I hit a problem on my side. I've flagged it and someone from the office will follow up."
  }

  // Step 3: send the reply and remember the conversation state.
  await db.tx(async (q) => {
    const ctx: Ctx = { q, school }
    let text = reply
    if (a.who.audience === 'customer' && !a.state.disclosed) {
      text += disclosure(school)
      a.state.disclosed = true
    }
    await sendToConversation(ctx, conv, text, { author: 'agent', meta: { engine, tools: a.events.map((e) => ({ tool: e.tool, ok: e.ok, note: e.summary })) } })
    await saveState(q, conv.id, a.state)
    await q.query(`insert into rs.agent_runs (school_id, conversation_id, engine, model, tool_calls, grounding, input_tokens, output_tokens, latency_ms, error, created_at)
      values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11)`,
      [school.id, conv.id, engine, run.model ?? null, JSON.stringify(a.events), JSON.stringify(run.grounding ?? {}), run.inputTokens ?? null, run.outputTokens ?? null, Date.now() - started, run.error ?? null, now()])
  })
  await dispatchOutbox(db, school.id)
  return { handled: true, reply, conversationId: conv.id, engine, events: a.events }
}
