import { after } from 'next/server'
import { ready } from '@/lib/os/sandbox'
import { handleInbound } from '@/lib/os/agent/router'
import { validTwilioSignature } from '@/lib/os/twilio'
import { appUrl } from '@/lib/os/payments'

export const dynamic = 'force-dynamic'

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

/** Inbound SMS webhook (Twilio Messaging). Replies are sent through the outbox, not TwiML. */
export async function POST(req: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return new Response('SMS provider not configured', { status: 503 })
  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { params[k] = String(v) })
  const url = process.env.TWILIO_WEBHOOK_URL || `${appUrl()}/api/os/sms/twilio`
  if (!validTwilioSignature(token, url, params, req.headers.get('x-twilio-signature'))) return new Response('Invalid signature', { status: 403 })
  // Acknowledge Twilio right away (its webhook times out after ~15s) and do the agent turn afterwards.
  // Retries carry the same MessageSid and are ignored.
  after(async () => {
    const db = await ready()
    await handleInbound(db, { to: params.To ?? '', from: params.From ?? '', body: params.Body ?? '', externalId: params.MessageSid })
      .catch((err) => console.error('[roadsmith] inbound SMS failed', err))
  })
  return new Response(EMPTY_TWIML, { headers: { 'Content-Type': 'text/xml' } })
}
