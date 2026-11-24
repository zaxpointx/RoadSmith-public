import { ready } from '@/lib/os/sandbox'
import { sandboxEnabled, sandboxSchool, sandboxState, thread, personas } from '@/lib/os/sandbox-api'
import { normalizePhone } from '@/lib/os/util'
import { fail, json } from '@/lib/os/http'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!sandboxEnabled()) return fail('The sandbox is not enabled.', 404)
  const url = new URL(req.url)
  const db = await ready()
  const school = await sandboxSchool(db, url.searchParams.get('to'))
  if (!school) return fail('Unknown sandbox school number.', 404)
  const phone = normalizePhone(url.searchParams.get('phone') ?? '')
  return json({
    school: { name: school.name, phone: school.agent_phone },
    thread: phone ? await thread(db, school, phone) : null,
    personas: url.searchParams.get('personas') ? await personas(db, school) : undefined,
    state: await sandboxState(db, school),
  })
}
