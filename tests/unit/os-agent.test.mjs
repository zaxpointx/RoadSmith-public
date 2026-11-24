// Roadsmith agents: tenant isolation, permissions, carrier keywords, grounding and the Claude loop.
import assert from 'node:assert/strict'
import test from 'node:test'
import { openSandbox } from '../../src/lib/os/db.ts'
import { seedSandbox } from '../../src/lib/os/seed.ts'
import { schoolByPhone } from '../../src/lib/os/school.ts'
import { handleInbound } from '../../src/lib/os/agent/router.ts'
import { runTool } from '../../src/lib/os/agent/tools.ts'
import { checkGrounding } from '../../src/lib/os/agent/grounding.ts'
import { runClaudeTurn, setClaudeClientFactory } from '../../src/lib/os/agent/claude.ts'
import { parseDob, parseName, parseAddress, parsePermit } from '../../src/lib/os/agent/interpreter.ts'

process.env.ROADSMITH_AGENT_ENGINE = 'interpreter'
const LARKSPUR = '+16155550100', HARBOR = '+16175550100'

async function fresh() {
  globalThis.__rsClockOffsetMs = 0
  const db = await openSandbox()
  await db.tx((q) => seedSandbox(q))
  return db
}

async function agentCtx(db, schoolPhone, who) {
  const school = await schoolByPhone(db, schoolPhone)
  const conv = (await db.query(`insert into rs.conversations (school_id, phone, audience) values ($1, $2, $3)
    on conflict (school_id, phone) do update set audience = excluded.audience returning *`, [school.id, who.phone, who.audience])).rows[0]
  return { q: db, db, school, conv, who, state: {}, events: [] }
}

async function contactId(db, phone) {
  return (await db.query(`select c.id from rs.contacts c join rs.schools s on s.id = c.school_id where c.phone = $1 and s.agent_phone = $2`, [phone, LARKSPUR])).rows[0].id
}

test('a parent books a lesson end to end by text, and only real options can be booked', async () => {
  const db = await fresh()
  const p = '+16155550199'
  const say = (body) => handleInbound(db, { to: LARKSPUR, from: p, body })
  await say('I want to book a driving lesson for my daughter')
  await say('my daughter')
  await say('Olivia Grant, 04/02/2010')
  await say('1500 Riverside Dr, Nashville TN 37206')
  const offer = await say('permit TN55512345')
  assert.match(offer.reply, /A\) .*\nB\) /)
  const invented = await say('Z')
  assert.doesNotMatch(invented.reply, /holding/i, 'a letter that was never offered books nothing')
  const held = await say('A')
  assert.match(held.reply, /holding .* pay \$75 here: http:\/\/localhost:3000\/pay\/[A-Za-z0-9_-]+/)
  const lesson = (await db.query(`select status from rs.lessons l join rs.students s on s.id = l.student_id where s.first_name = 'Olivia'`)).rows
  assert.deepEqual(lesson.map((r) => r.status), ['held'])
  const out = (await db.query(`select body from rs.outbox where to_address = $1 order by created_at limit 1`, [p])).rows[0].body
  assert.match(out, /automated assistant/, 'first reply discloses that it is automated')
})

test('booking tool refuses a time that the scheduler did not offer in this conversation', async () => {
  const db = await fresh()
  const a = await agentCtx(db, LARKSPUR, { audience: 'customer', contactId: await contactId(db, '+16155550201'), name: 'Linda Carter', phone: '+16155550201' })
  a.state.offered = [{ code: 'A', serviceId: 'x', studentId: 'y', instructorId: 'z', start: new Date().toISOString(), label: 'fake' }]
  const r = await runTool(a, 'book_lesson', { option: 'B' })
  assert.equal(r.ok, false)
  assert.match(r.error, /not one of the times currently offered/)
})

test('a family cannot see or change another family’s student or lesson', async () => {
  const db = await fresh()
  const linda = await agentCtx(db, LARKSPUR, { audience: 'customer', contactId: await contactId(db, '+16155550201'), name: 'Linda Carter', phone: '+16155550201' })
  const jamesLesson = (await db.query(`select l.id from rs.lessons l join rs.students s on s.id = l.student_id where s.first_name = 'James' and l.status = 'booked' limit 1`)).rows[0].id
  const cancel = await runTool(linda, 'cancel_lesson', { lesson_id: jamesLesson })
  assert.equal(cancel.ok, false)
  assert.match(cancel.error, /does not belong/)
  const acct = await runTool(linda, 'my_account', {})
  assert.deepEqual(acct.students.map((s) => s.name), ['Emma Carter'])
  assert.equal((await db.query(`select status from rs.lessons where id = $1`, [jamesLesson])).rows[0].status, 'booked')
})

test('the same phone number at another school sees nothing from the first school', async () => {
  const db = await fresh()
  const r = await handleInbound(db, { to: HARBOR, from: '+16155550201', body: 'what lessons do we have?' })
  assert.match(r.reply, /don't have any students on file/)
  assert.doesNotMatch(r.reply, /Emma|Larkspur/)
  const harbor = await schoolByPhone(db, HARBOR)
  const leak = (await db.query(`select count(*)::int as n from rs.contacts where school_id = $1 and phone = '+16155550201'`, [harbor.id])).rows[0].n
  assert.equal(leak, 1, 'a new lead is created inside Harbor Point only')
  // Name + birth date of a student at another school does not link across tenants either.
  const a = await agentCtx(db, LARKSPUR, { audience: 'customer', contactId: await contactId(db, '+16155550201'), name: 'Linda', phone: '+16155550201' })
  const acct = await runTool(a, 'my_account', {})
  assert.ok(!JSON.stringify(acct).includes('Harbor Point private note'))
})

test('claiming an existing student by name and birth date needs the office to verify', async () => {
  const db = await fresh()
  const emma = (await db.query(`select dob from rs.students s join rs.schools sc on sc.id = s.school_id where first_name = 'Emma' and sc.agent_phone = $1`, [LARKSPUR])).rows[0]
  await handleInbound(db, { to: LARKSPUR, from: '+16155550166', body: 'hello' })
  const a = await agentCtx(db, LARKSPUR, { audience: 'customer', contactId: (await db.query(`select id from rs.contacts where phone = '+16155550166'`)).rows[0].id, name: '', phone: '+16155550166' })
  const r = await runTool(a, 'register_student', { relationship: 'parent', first_name: 'Emma', last_name: 'Carter', date_of_birth: new Date(emma.dob).toISOString().slice(0, 10) })
  assert.equal(r.ok, false)
  assert.match(r.error, /office has to confirm/)
  const linked = (await db.query(`select count(*)::int as n from rs.students where guardian_contact_id = $1`, [a.who.contactId])).rows[0].n
  assert.equal(linked, 0)
})

test('instructors cannot use owner tools or see payments', async () => {
  const db = await fresh()
  const john = (await db.query(`select id from rs.staff where name = 'John Smith'`)).rows[0].id
  const a = await agentCtx(db, LARKSPUR, { audience: 'instructor', staffId: john, name: 'John Smith', phone: '+16155550111' })
  for (const tool of ['business_summary', 'decide', 'list_decisions', 'plan_drives', 'book_lesson']) {
    const r = await runTool(a, tool, {})
    assert.equal(r.ok, false, `${tool} must be refused`)
    assert.match(r.error, /not available to this person/)
  }
  const info = await runTool(a, 'student_info', { name: 'Emma Carter' })
  assert.equal(info.ok, true)
  assert.equal(info.balance_owed, undefined)
})

test('STOP, START and HELP are handled by code; opted-out numbers get nothing', async () => {
  const db = await fresh()
  const p = '+16155550201'
  const stop = await handleInbound(db, { to: LARKSPUR, from: p, body: 'STOP' })
  assert.equal(stop.reason, 'opted out')
  const ignored = await handleInbound(db, { to: LARKSPUR, from: p, body: 'hello?' })
  assert.equal(ignored.reason, 'suppressed (opted out)')
  const school = await schoolByPhone(db, LARKSPUR)
  const msgs = (await db.query(`select body, status from rs.outbox where school_id = $1 and to_address = $2 order by created_at`, [school.id, p])).rows
  assert.equal(msgs.length, 1)
  assert.match(msgs[0].body, /unsubscribed/)
  const start = await handleInbound(db, { to: LARKSPUR, from: p, body: 'START' })
  assert.equal(start.reason, 'opted in')
  const help = await handleInbound(db, { to: HARBOR, from: '+16175550201', body: 'HELP' })
  assert.equal(help.reason, 'help')
})

test('sensitive messages go to the owner instead of being answered', async () => {
  const db = await fresh()
  const r = await handleInbound(db, { to: LARKSPUR, from: '+16155550201', body: 'Emma was in a fender bender during practice, is she ok to keep driving?' })
  assert.match(r.reply, /alerted the owner/)
  const school = await schoolByPhone(db, LARKSPUR)
  const urgent = (await db.query(`select priority from rs.inbox where school_id = $1 and status = 'open' order by created_at desc limit 1`, [school.id])).rows[0]
  assert.equal(urgent.priority, 'urgent')
})

test('an owner can approve an item by text and the action really runs', async () => {
  const db = await fresh()
  const owner = '+16155550101'
  const plan = await handleInbound(db, { to: LARKSPUR, from: owner, body: 'plan drives' })
  assert.match(plan.reply, /Drafted \d+ drives/)
  const list = await handleInbound(db, { to: LARKSPUR, from: owner, body: 'inbox' })
  const n = /(\d)\) Drive plan/.exec(list.reply)[1]
  const r = await handleInbound(db, { to: LARKSPUR, from: owner, body: `approve ${n}` })
  assert.match(r.reply, /Booked \d+ drives? and texted each family/)
  const booked = (await db.query(`select count(*)::int as n from rs.lessons where course_id is not null and status = 'booked'`)).rows[0].n
  assert.ok(booked >= 5)
})

test('grounding blocks invented times, prices and links', () => {
  const evidence = '{"options":[{"option":"A","when":"Tue, Nov 24 at 2:30 PM with Dan"}],"payment":{"amount":"$75","link":"http://localhost:3000/pay/abc123abc123abc123"}} Office hours: Mon–Fri 9am–6pm'
  assert.equal(checkGrounding('I have Tue at 2:30 PM. Pay $75 at http://localhost:3000/pay/abc123abc123abc123', evidence).ok, true)
  assert.equal(checkGrounding('Our office opens at 9am.', evidence).ok, true)
  const bad = checkGrounding('How about 4:00 pm for $60? Pay at https://evil.example/pay', evidence)
  assert.equal(bad.ok, false)
  assert.deepEqual(bad.issues, ['time "4:00 PM"', 'amount $60.00', 'link https://evil.example/pay'])
})

test('Claude loop runs tools, and retries once when the draft reply invents a time', async () => {
  const db = await fresh()
  const a = await agentCtx(db, LARKSPUR, { audience: 'customer', contactId: await contactId(db, '+16155550201'), name: 'Linda Carter', phone: '+16155550201' })
  const calls = []
  const replies = [
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'my_account', input: {} }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: "Emma's next lesson is Friday at 4:45 PM." }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: "I'll check Emma's exact lesson time with the office." }] },
  ]
  setClaudeClientFactory(() => ({ beta: { messages: { create: async (req) => { calls.push(structuredClone(req)); return { ...replies[calls.length - 1], model: 'fake', usage: { input_tokens: 10, output_tokens: 5 } } } } } }))
  const turn = await runClaudeTurn(a, { system: 'sys', history: [{ role: 'user', content: 'when is the lesson?' }], context: 'Now: test' })
  assert.equal(calls.length, 3)
  assert.equal(a.events[0].tool, 'my_account')
  assert.equal(turn.grounding.retried, true)
  assert.equal(turn.grounding.ok, true)
  assert.match(turn.reply, /check Emma's exact lesson time/)
  const correction = calls[2].messages.at(-1)
  assert.equal(correction.role, 'system')
  assert.match(correction.content, /4:45 PM/)
  assert.equal(calls[0].model, 'claude-opus-5-5')
  assert.ok(calls[0].tools.every((t) => !['business_summary', 'decide'].includes(t.name)), 'customer turns never see owner tools')
})

test('interpreter parsers handle common formats', () => {
  assert.equal(parseDob('Olivia Grant, 04/02/2010'), '2010-04-02')
  assert.equal(parseDob('born March 14, 2009'), '2009-03-14')
  assert.deepEqual(parseName("it's for my son Marcus Lee born 2010-06-15"), { first: 'Marcus', last: 'Lee' })
  assert.equal(parseAddress('pick up at 1500 Riverside Dr, Nashville TN 37206 please'), '1500 Riverside Dr, Nashville TN 37206')
  assert.equal(parsePermit('permit number is TN55512345'), 'TN55512345')
})
