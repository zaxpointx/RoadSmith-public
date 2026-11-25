import { withSession, readJson, json, fail } from '@/lib/os/http'
import { cancelLesson, completeLesson, markNoShow } from '@/lib/os/bookings'
import { createInbox } from '@/lib/os/inbox'
import { fmtMoney } from '@/lib/os/time'
import { dispatchOutbox } from '@/lib/os/messaging'

export const dynamic = 'force-dynamic'

/** Owner actions on a lesson from the schedule. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withSession(req, async (s) => {
    const body = await readJson<{ action?: string; minutes?: number; notes?: string; reason?: string }>(req)
    const actor = { type: 'staff' as const, id: s.staff.id, label: s.staff.name }
    const result = await s.db.tx(async (q) => {
      const ctx = { q, school: s.school }
      if (body.action === 'complete') { await completeLesson(ctx, { lessonId: id, minutes: body.minutes, notes: body.notes, actor }); return 'Marked complete; the family got a progress text.' }
      if (body.action === 'no_show') { await markNoShow(ctx, id, actor); return 'Recorded as a no-show.' }
      if (body.action === 'cancel') {
        const { refundable } = await cancelLesson(ctx, { lessonId: id, reason: body.reason?.slice(0, 200) || 'cancelled by the school', actor, notifyFamily: true })
        if (refundable) {
          await createInbox(ctx, { kind: 'approval', title: `Refund ${fmtMoney(refundable.amount_cents, refundable.currency)}? (${refundable.description})`, detail: 'The school cancelled this paid lesson.', action: { type: 'refund_payment', args: { paymentId: refundable.id } } })
          return 'Cancelled and the family was told. A refund is waiting for your approval in the inbox.'
        }
        return 'Cancelled and the family was told.'
      }
      return null
    })
    if (!result) return fail('Unknown action.')
    await dispatchOutbox(s.db, s.school.id)
    return json({ ok: true, message: result })
  })
}
