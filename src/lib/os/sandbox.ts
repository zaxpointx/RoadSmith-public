/** Sandbox lifecycle: first-run seeding, reset, and the time-travel control. */
import { getDb, isSandbox, one, type Db } from './db.ts'
import { clockOffsetMs, loadClock, setClockOffset } from './clock.ts'
import { seedSandbox } from './seed.ts'

const g = globalThis as unknown as { __rsReady?: Promise<Db> }

/** The app database, seeded on first use in the sandbox. */
export function ready(): Promise<Db> {
  g.__rsReady ??= (async () => {
    const db = await getDb()
    await loadClock(db)
    if (isSandbox()) {
      const has = await one<{ n: number }>(db, `select count(*)::int as n from rs.schools`)
      if (!has?.n) await db.tx((q) => seedSandbox(q))
    }
    return db
  })().catch((err) => {
    g.__rsReady = undefined
    throw err
  })
  return g.__rsReady
}

export async function resetSandbox(): Promise<void> {
  if (!isSandbox()) throw new Error('Reset is only available in the sandbox.')
  const db = await ready()
  await db.tx(async (q) => {
    await q.query(`delete from rs.schools`)
    await q.query(`delete from rs.settings where key = 'clock'`)
    await setClockOffset(q, 0)
    await seedSandbox(q)
  })
}

export async function advanceClock(minutes: number): Promise<number> {
  if (!isSandbox()) throw new Error('Time travel is only available in the sandbox.')
  const db = await ready()
  const next = clockOffsetMs() + minutes * 60000
  await setClockOffset(db, next)
  return next
}
