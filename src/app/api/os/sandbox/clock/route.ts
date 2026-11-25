import { ready, advanceClock } from '@/lib/os/sandbox'
import { now } from '@/lib/os/clock'
import { tickAll } from '@/lib/os/automations'
import { sandboxEnabled, sandboxSchool } from '@/lib/os/sandbox-api'
import { addDays, localDate, zonedToUtc } from '@/lib/os/time'
import { fail, json, readJson, sameOrigin } from '@/lib/os/http'

export const dynamic = 'force-dynamic'

/** Fast-forward sandbox time and run whatever became due (reminders, holds, briefs). */
export async function POST(req: Request) {
  if (!sandboxEnabled()) return fail('The sandbox is not enabled.', 404)
  if (!sameOrigin(req)) return fail('Cross-site request blocked.', 403)
  const body = await readJson<{ minutes?: number; jump?: 'next7am'; to?: string }>(req)
  const db = await ready()
  const school = await sandboxSchool(db, body.to)
  if (!school) return fail('Unknown sandbox school number.', 404)
  let minutes = Math.round(Number(body.minutes) || 0)
  if (body.jump === 'next7am') {
    const tz = school.timezone
    const target = zonedToUtc(addDays(localDate(now(), tz), 1), 7 * 60 + 1, tz)
    minutes = Math.ceil((+target - +now()) / 60000)
  }
  if (minutes <= 0 || minutes > 60 * 24 * 14) return fail('Choose between 1 minute and 14 days.')
  await advanceClock(minutes)
  const r = await tickAll()
  return json({ ok: true, ran: r.ran })
}
