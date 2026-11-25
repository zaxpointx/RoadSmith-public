import { tickAll } from '@/lib/os/automations'
import { safeEqual } from '@/lib/os/util'

export const dynamic = 'force-dynamic'

/** Scheduled work entry point (e.g. Vercel Cron every 5 minutes with CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return new Response('CRON_SECRET not set', { status: 503 })
  if (!safeEqual(req.headers.get('authorization') ?? '', `Bearer ${secret}`)) return new Response('Unauthorized', { status: 401 })
  return Response.json(await tickAll())
}
