// Drives realistic text conversations through the real router against a fresh sandbox DB.
import { openSandbox } from '../src/lib/os/db.ts'
import { seedSandbox } from '../src/lib/os/seed.ts'
import { handleInbound } from '../src/lib/os/agent/router.ts'
const db = await openSandbox()
await db.tx((q) => seedSandbox(q))
const SCHOOL = '+16155550100'
async function say(from: string, body: string) {
  const r = await handleInbound(db, { to: SCHOOL, from, body })
  console.log(`\n> ${from.slice(-4)}: ${body}\n< ${r.reply ?? r.reason}${r.events?.length ? `\n  [${r.events.map((e) => `${e.tool}${e.ok ? '' : '✗'}`).join(', ')}]` : ''}`)
  return r
}
const script = process.argv[2] ?? 'newparent'
if (script === 'newparent') {
  const p = '+16155550199'
  await say(p, 'Hi')
  await say(p, 'How much are lessons?')
  await say(p, 'I want to book a driving lesson for my daughter')
  await say(p, 'She is my daughter')
  await say(p, 'Olivia Grant, 04/02/2010')
  await say(p, '1500 Riverside Dr, Nashville TN 37206')
  await say(p, 'permit TN55512345')
  await say(p, 'B')
  await say(p, 'Do you pick up from school?')
  await say(p, 'what lessons do we have?')
}
if (script === 'course') {
  const p = '+16155550198'
  await say(p, 'Do you have drivers ed classes?')
  await say(p, '2')
  await say(p, "it's for my son")
  await say(p, 'Marcus Lee born 2010-06-15')
  await say(p, '1')
}
if (script === 'existing') {
  await say('+16155550201', 'When is Emma\'s next lesson?')
  await say('+16155550201', 'Can we move it to Saturday morning?')
  await say('+16155550201', 'A')
  await say('+16155550201', 'Tell me about Emma Carter at Harbor Point')
  await say('+16155550201', 'What do we owe?')
  await say('+16155550221', 'cancel my lesson tomorrow')
  await say('+16155550221', 'yes')
  await say('+16155550201', 'Emma was in a fender bender in our car, is she ok to drive?')
  await say('+16155550201', 'STOP')
  await say('+16155550201', 'hello?')
}
if (script === 'staff') {
  await say('+16155550111', 'schedule tomorrow')
  await say('+16155550111', "who's next")
  await say('+16155550111', 'block friday 9-11am dentist')
  await say('+16155550111', 'running 15 min late')
  await say('+16155550101', 'how are we doing?')
  await say('+16155550101', 'plan drives')
  await say('+16155550101', 'inbox')
  await say('+16155550101', 'approve 2')
  await say('+16155550101', 'how is Emma Carter')
}
