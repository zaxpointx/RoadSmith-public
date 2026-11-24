/**
 * Database access for the Roadsmith operating system.
 *
 * Two backends, one SQL dialect (PostgreSQL):
 *  - sandbox: PGlite (Postgres compiled to WASM) persisted under `.roadsmith/`,
 *    seeded with synthetic schools. Used when DATABASE_URL is not set.
 *  - production: a real Postgres (Supabase) reached with DATABASE_URL.
 *
 * Every domain function receives a `Q` (query runner) so the same code runs
 * inside or outside a transaction.
 */
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export type Row = Record<string, unknown>
export interface Q {
  query<T = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
}
export interface Db extends Q {
  tx<T>(fn: (q: Q) => Promise<T>): Promise<T>
  kind: 'sandbox' | 'postgres'
}

const MIGRATION = 'supabase/migrations/20261124000000_roadsmith_os.sql'

type Holder = { db?: Promise<Db> }
const holder = globalThis as unknown as { __roadsmithDb?: Holder }
holder.__roadsmithDb ??= {}

export function isSandbox(): boolean {
  return !process.env.DATABASE_URL
}

/** Shared database for the running app. */
export function getDb(): Promise<Db> {
  const h = holder.__roadsmithDb!
  h.db ??= (isSandbox() ? openSandbox(process.env.ROADSMITH_SANDBOX_DIR ?? path.join(process.cwd(), '.roadsmith', 'sandbox-db')) : openPostgres()).catch((err) => {
    h.db = undefined
    throw err
  })
  return h.db
}

/** A fresh database (in memory unless a directory is given). Used by tests and the reset action. */
export async function openSandbox(dataDir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite')
  const { btree_gist } = await import('@electric-sql/pglite/contrib/btree_gist')
  if (dataDir) await mkdir(dataDir, { recursive: true })
  const pg = new PGlite({ dataDir, extensions: { btree_gist } })
  await pg.waitReady
  // PGlite runs one statement at a time; serialise transactions so callers
  // can't interleave queries from different requests inside a transaction.
  let chain: Promise<unknown> = Promise.resolve()
  const db: Db = {
    kind: 'sandbox',
    async query<T>(sql: string, params: unknown[] = []) {
      await chain.catch(() => {})
      const r = await pg.query<T>(sql, params)
      return { rows: r.rows }
    },
    tx<T>(fn: (q: Q) => Promise<T>): Promise<T> {
      const run = chain.catch(() => {}).then(() =>
        pg.transaction(async (t) => fn({ query: async <R>(sql: string, params: unknown[] = []) => ({ rows: (await t.query<R>(sql, params)).rows }) })),
      )
      chain = run.catch(() => {})
      return run
    },
  }
  const exists = await pg.query<{ t: string | null }>(`select to_regclass('rs.schools')::text as t`)
  if (!exists.rows[0]?.t) {
    await pg.exec(await readFile(path.join(process.cwd(), MIGRATION), 'utf8'))
  }
  return db
}

async function openPostgres(): Promise<Db> {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
  return {
    kind: 'postgres',
    async query<T>(sql: string, params: unknown[] = []) {
      const r = await pool.query(sql, params)
      return { rows: r.rows as T[] }
    },
    async tx<T>(fn: (q: Q) => Promise<T>) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        const out = await fn({ query: async <R>(sql: string, params: unknown[] = []) => ({ rows: (await client.query(sql, params)).rows as R[] }) })
        await client.query('commit')
        return out
      } catch (err) {
        await client.query('rollback').catch(() => {})
        throw err
      } finally {
        client.release()
      }
    },
  }
}

export async function one<T = Row>(q: Q, sql: string, params: unknown[] = []): Promise<T | null> {
  const { rows } = await q.query<T>(sql, params)
  return rows[0] ?? null
}

export async function many<T = Row>(q: Q, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await q.query<T>(sql, params)).rows
}

/** Postgres error code helper (exclusion / unique violations). */
export function pgCode(err: unknown): string | undefined {
  return typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : undefined
}
