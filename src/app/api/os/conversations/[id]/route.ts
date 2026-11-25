import { withSession, readJson, json, fail } from '@/lib/os/http'
import { one } from '@/lib/os/db'
import { audit } from '@/lib/os/audit'
import { dispatchOutbox, sendToConversation, type Conversation } from '@/lib/os/messaging'

export const dynamic = 'force-dynamic'

/** Take over a conversation, hand it back to the agent, or send a message as staff. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withSession(req, async (s) => {
    const body = await readJson<{ action?: string; text?: string }>(req)
    const r = await s.db.tx(async (q) => {
      const ctx = { q, school: s.school }
      const conv = await one<Conversation>(q, `select * from rs.conversations where id = $1 and school_id = $2`, [id, s.school.id])
      if (!conv) return fail('Conversation not found.', 404)
      const actor = { type: 'staff' as const, id: s.staff.id, label: s.staff.name }
      if (body.action === 'takeover' || body.action === 'handback') {
        const mode = body.action === 'takeover' ? 'human' : 'agent'
        await q.query(`update rs.conversations set mode = $2 where id = $1`, [id, mode])
        await audit(ctx, actor, `conversation.${body.action}`, { type: 'conversation', id })
        return json({ ok: true, mode })
      }
      if (body.action === 'send') {
        const text = (body.text ?? '').trim().slice(0, 1000)
        if (!text) return fail('Type a message first.')
        await sendToConversation(ctx, conv, text, { author: 'staff', reason: 'staff_message' })
        await audit(ctx, actor, 'conversation.staff_message', { type: 'conversation', id })
        return json({ ok: true })
      }
      return fail('Unknown action.')
    })
    await dispatchOutbox(s.db, s.school.id)
    return r
  })
}
