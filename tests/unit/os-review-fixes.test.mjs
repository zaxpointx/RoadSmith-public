// Regression tests for issues found in the independent review of Roadsmith OS.
import assert from 'node:assert/strict'
import test from 'node:test'
import { openSandbox } from '../../src/lib/os/db.ts'
import { seedSandbox } from '../../src/lib/os/seed.ts'
import { schoolByPhone } from '../../src/lib/os/school.ts'
import { findSlots } from '../../src/lib/os/scheduling.ts'
import { applyPaymentEvent, getService, holdLesson, registerStudent } from '../../src/lib/os/bookings.ts'
import { executeAction } from '../../src/lib/os/actions.ts'
import { runDueJobs } from '../../src/lib/os/automations.ts'
import { handleInbound } from '../../src/lib/os/agent/router.ts'
import { runTool } from '../../src/lib/os/agent/tools.ts'
import { createInbox, openInbox } from '../../src/lib/os/inbox.ts'
import { playbookSchema } from '../../src/lib/os/playbook.ts'
import { localDate, zonedToUtc, addDays } from '../../src/lib/os/time.ts'
import { now } from '../../src/lib/os/clock.ts'

process.env.ROADSMITH_AGENT_ENGINE = 'interpreter'
const agent = { type: 'agent' }

async function fresh() {
  globalThis.__rsClockOffsetMs = 0
  const db = await openSandbox()
  await db.tx((q) => seedSandbox(q))
  const school = await schoolByPhone(db, '+16155550100')
  return { db, school, ctx: { q: db, school } }
}
const row = async (db, sql, p = []) => (await db.query(sql, p)).rows[0]

async function heldLesson(ctx, phone) {
  const c = await row(ctx.q, `insert into rs.contacts (school_id, name, phone, kind) values ($1,'P',$2,'parent') returning id`, [ctx.school.id, phone])
  const { student } = await registerStudent(ctx, { contactId: c.id, relationship: 'parent', firstName: 'Rev', lastName: `Kid${phone.slice(-3)}`, dob: '2009-05-05', address: '12 Main St, Nashville, TN 37206', permitNumber: 'TN12345678', actor: agent })
  const svc = await getService(ctx, { code: 'LESSON60' })
  const slots = await findSlots(ctx, { service: svc, pickup: { lat: student.lat, lng: student.lng }, studentId: student.id, limit: 10 })
  const slot = slots.find((s) => +s.start - Date.now() > 4 * 3600000)
  return { contactId: c.id, student, ...(await holdLesson(ctx, { studentId: student.id, serviceId: svc.id, instructorId: slot.instructorId, start: slot.start, contactId: c.id, actor: agent })) }
}

test('a real (non-sandbox) school without Stripe cannot create payment links', async () => {
  const { db, school } = await fresh()
  await db.query(`update rs.schools set is_sandbox = false where id = $1`, [school.id])
  const real = { ...school, is_sandbox: false }
  const saved = process.env.STRIPE_SECRET_KEY
  process.env.STRIPE_SECRET_KEY = 'sk_live_example'
  try {
    await assert.rejects(() => heldLesson({ q: db, school: real }, '+16155550161'), /Online payment isn't set up/)
  } finally {
    if (saved === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = saved
  }
  // And its outgoing texts are recorded as failed, not silently "sandboxed".
  await db.tx((q) => import('../../src/lib/os/messaging.ts').then((m) => m.notifyOwners({ q, school: real }, 'test')))
  assert.equal((await row(db, `select status from rs.outbox where body = 'test'`)).status, 'failed')
})

test('payment events never revive cancelled payments; a second charge is escalated', async () => {
  const { ctx } = await fresh()
  const h = await heldLesson(ctx, '+16155550162')
  await ctx.q.query(`update rs.payments set status = 'cancelled' where id = $1`, [h.payment.id])
  const f = await applyPaymentEvent(ctx, { paymentId: h.payment.id, kind: 'failed', eventId: 'e1' })
  assert.match(f.outcome, /ignored/)
  assert.equal((await row(ctx.q, `select status from rs.payments where id = $1`, [h.payment.id])).status, 'cancelled')
  const h2 = await heldLesson(ctx, '+16155550163')
  await applyPaymentEvent(ctx, { paymentId: h2.payment.id, kind: 'paid', eventId: 'p1', providerRef: 'pi_1' })
  const dup = await applyPaymentEvent(ctx, { paymentId: h2.payment.id, kind: 'paid', eventId: 'p2', providerRef: 'pi_2' })
  assert.equal(dup.outcome, 'duplicate charge escalated')
  assert.ok((await openInbox(ctx)).some((i) => /double payment/.test(i.title)))
})

test('Stripe refunds are queued for after the transaction, never called inside it', async () => {
  const { ctx } = await fresh()
  const h = await heldLesson(ctx, '+16155550164')
  await applyPaymentEvent(ctx, { paymentId: h.payment.id, kind: 'paid', eventId: 'p1', providerRef: 'pi_x' })
  await ctx.q.query(`update rs.payments set provider = 'stripe' where id = $1`, [h.payment.id])
  const msg = await ctx.q.tx((q) => executeAction({ q, school: ctx.school }, { type: 'refund_payment', args: { paymentId: h.payment.id } }, { type: 'staff', id: 'x', label: 'Owner' }))
  assert.match(msg, /being sent to Stripe/)
  assert.equal((await row(ctx.q, `select status from rs.payments where id = $1`, [h.payment.id])).status, 'refund_pending')
  assert.equal((await row(ctx.q, `select kind from rs.jobs where dedupe_key = $1`, [`refund:${h.payment.id}`])).kind, 'stripe_refund')
})

test('a student texting cannot replace the guardian on file', async () => {
  const { db } = await fresh()
  const school = await schoolByPhone(db, '+16155550100')
  const james = await row(db, `select c.id from rs.contacts c where c.phone = '+16155550221'`)
  const conv = await row(db, `insert into rs.conversations (school_id, phone, contact_id, audience) values ($1,'+16155550221',$2,'customer') returning *`, [school.id, james.id])
  const a = { q: db, db, school, conv, who: { audience: 'customer', contactId: james.id, name: 'James', phone: '+16155550221' }, state: {}, events: [] }
  const st = await row(db, `select id, guardian_contact_id from rs.students where first_name = 'James' and school_id = $1`, [school.id])
  const r = await runTool(a, 'add_guardian', { student_id: st.id, guardian_name: 'Fake Parent', guardian_phone: '615-555-0999' })
  assert.equal(r.ok, false)
  assert.equal((await row(db, `select guardian_contact_id from rs.students where id = $1`, [st.id])).guardian_contact_id, st.guardian_contact_id)
})

test('hold-expiry texts wait for the end of quiet hours (the release itself does not)', async () => {
  const { db, ctx, school } = await fresh()
  const h = await heldLesson(ctx, '+16155550165')
  const tz = school.timezone
  const twoAm = zonedToUtc(addDays(localDate(now(), tz), 1), 120, tz)
  await db.query(`update rs.jobs set run_at = $2 where dedupe_key = $1`, [`hold:lesson:${h.lesson.id}`, twoAm])
  await db.query(`update rs.lessons set hold_expires_at = $2 where id = $1`, [h.lesson.id, twoAm])
  globalThis.__rsClockOffsetMs = +twoAm - Date.now() + 60000
  await runDueJobs(db, school.id)
  assert.equal((await row(db, `select status from rs.lessons where id = $1`, [h.lesson.id])).status, 'cancelled')
  const sentAt2am = (await db.query(`select 1 from rs.outbox where to_address = '+16155550165' and reason = 'hold_expired'`)).rows.length
  assert.equal(sentAt2am, 0)
  assert.equal((await row(db, `select kind from rs.jobs where kind = 'deferred_text' and status = 'pending'`)).kind, 'deferred_text')
  globalThis.__rsClockOffsetMs = 0
})

test('a retried SMS delivery (same MessageSid) is processed once', async () => {
  const { db } = await fresh()
  const a = await handleInbound(db, { to: '+16155550100', from: '+16155550201', body: 'hello', externalId: 'SM123' })
  const b = await handleInbound(db, { to: '+16155550100', from: '+16155550201', body: 'hello', externalId: 'SM123' })
  assert.equal(a.handled, true)
  assert.equal(b.reason, 'duplicate delivery ignored')
  assert.equal((await row(db, `select count(*)::int as n from rs.messages where external_id = 'SM123'`)).n, 1)
})

test('refunds cannot be approved by text message', async () => {
  const { db, ctx } = await fresh()
  const h = await heldLesson(ctx, '+16155550166')
  await applyPaymentEvent(ctx, { paymentId: h.payment.id, kind: 'paid', eventId: 'p1' })
  await createInbox(ctx, { kind: 'approval', title: 'Refund test', action: { type: 'refund_payment', args: { paymentId: h.payment.id } } })
  const list = await handleInbound(db, { to: '+16155550100', from: '+16155550101', body: 'inbox' })
  const n = /(\d)\) Refund test/.exec(list.reply)[1]
  const r = await handleInbound(db, { to: '+16155550100', from: '+16155550101', body: `approve ${n}` })
  assert.match(r.reply, /only be approved in the Control Center/)
  assert.equal((await row(db, `select status from rs.payments where id = $1`, [h.payment.id])).status, 'paid')
})

test('minimum notice cannot be set below two hours', () => {
  assert.equal(playbookSchema.safeParse({ policies: { min_notice_hours: 0 } }).success, false)
})
