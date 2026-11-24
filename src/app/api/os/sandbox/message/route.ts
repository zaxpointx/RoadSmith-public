import { ready } from '@/lib/os/sandbox'
import { handleInbound } from '@/lib/os/agent/router'
import { tickAll } from '@/lib/os/automations'
import { sandboxEnabled, sandboxSchool } from '@/lib/os/sandbox-api'
import { normalizePhone } from '@/lib/os/util'
import { fail, json, readJson, sameOrigin } from '@/lib/os/http'

export const dynamic = 'force-dynamic'

/** The sandbox phone: deliver a text to the agent exactly as Twilio would. */
export async function POST(req: Request) {
  if (!sandboxEnabled()) return fail('The sandbox is not enabled.', 404)
  if (!sameOrigin(req)) return fail('Cross-site request blocked.', 403)
  const body = await readJson<{ from?: string; to?: string; body?: string }>(req)
  const db = await ready()
  const school = await sandboxSchool(db, body.to)
  if (!school) return fail('Unknown sandbox school number.', 404)
  const from = normalizePhone(body.from ?? '')
  if (!from) return fail('Enter a valid phone number.')
  if (!body.body?.trim()) return fail('Type a message first.')
  await tickAll()
  const r = await handleInbound(db, { to: school.agent_phone, from, body: body.body })
  return json({ ok: r.handled, reply: r.reply ?? null, engine: r.engine ?? null, reason: r.reason ?? null })
}
