import { openSandbox } from '../src/lib/os/db.ts'
import { seedSandbox } from '../src/lib/os/seed.ts'
import { loadSchool, schoolByPhone } from '../src/lib/os/school.ts'
import { findSlots } from '../src/lib/os/scheduling.ts'
import { getService, listCourses } from '../src/lib/os/bookings.ts'
import { snapshot, ownerBrief } from '../src/lib/os/insights.ts'
import { toPoint } from '../src/lib/os/travel.ts'
const db = await openSandbox()
const t0 = Date.now()
await db.tx((q) => seedSandbox(q))
console.log('seeded in', Date.now() - t0, 'ms')
const school = (await schoolByPhone(db, '+16155550100'))!
const ctx = { q: db, school }
const svc = (await getService(ctx, { code: 'LESSON60' }))!
const slots = await findSlots(ctx, { service: svc, pickup: toPoint(36.17, -86.75), limit: 6 })
console.log(slots.map((s) => `${s.label} ${s.instructorName} +${s.addedTravel}m`))
console.log((await listCourses(ctx, { upcomingOnly: true })).map((c) => `${c.title} ${c.seats_taken}/${c.capacity}`))
console.log(await ownerBrief(ctx))
void loadSchool; void snapshot
