import { withSession, readJson, json, fail } from '@/lib/os/http'
import { decideInbox } from '@/lib/os/inbox'
import { dispatchOutbox } from '@/lib/os/messaging'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withSession(req, async (s) => {
    const body = await readJson<{ decision?: string; note?: string; reply?: string }>(req)
    if (!['approve', 'decline', 'resolve'].includes(body.decision ?? '')) return fail('Choose approve, decline or resolve.')
    const r = await s.db.tx((q) => decideInbox({ q, school: s.school }, {
      id, decision: body.decision as 'approve' | 'decline' | 'resolve', staffId: s.staff.id, staffName: s.staff.name,
      note: body.note?.slice(0, 1000), replyToCustomer: body.reply?.slice(0, 1000),
    }))
    await dispatchOutbox(s.db, s.school.id)
    return json({ ok: true, status: r.item.status, result: r.result ?? null })
  })
}
