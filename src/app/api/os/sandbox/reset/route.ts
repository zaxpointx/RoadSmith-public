import { resetSandbox } from '@/lib/os/sandbox'
import { sandboxEnabled } from '@/lib/os/sandbox-api'
import { fail, json, sameOrigin } from '@/lib/os/http'
import { isSandbox } from '@/lib/os/db'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!sandboxEnabled() || !isSandbox()) return fail('Reset is only available in the local sandbox.', 404)
  if (!sameOrigin(req)) return fail('Cross-site request blocked.', 403)
  await resetSandbox()
  return json({ ok: true })
}
