/**
 * Unit tests for src/lib/agent/signed-request.ts (ROA-98).
 * Run: node --test tests/unit/signed-request.test.mjs
 *
 * Exercises the auth gate directly so the test does not need the Next.js
 * runtime. The TypeScript source is transpiled on import using Node 22
 * built-in strip-types via --experimental-strip-types.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { isSignedCronRequest } from "../../src/lib/agent/signed-request.ts"

test("returns ok for matching bearer with sufficient secret", () => {
  const saved = process.env.CRON_SECRET
  process.env.CRON_SECRET = "a".repeat(32)
  try {
    const req = new Request("http://localhost/x", {
      headers: { authorization: `Bearer ${"a".repeat(32)}` },
    })
    assert.deepEqual(isSignedCronRequest(req), { ok: true })
  } finally {
    process.env.CRON_SECRET = saved
  }
})

test("returns no_header when Authorization is missing", () => {
  const saved = process.env.CRON_SECRET
  process.env.CRON_SECRET = "a".repeat(32)
  try {
    const req = new Request("http://localhost/x")
    assert.deepEqual(isSignedCronRequest(req), { ok: false, reason: "no_header" })
  } finally {
    process.env.CRON_SECRET = saved
  }
})

test("returns no_header when Authorization is malformed", () => {
  const saved = process.env.CRON_SECRET
  process.env.CRON_SECRET = "a".repeat(32)
  try {
    const req = new Request("http://localhost/x", {
      headers: { authorization: "NoBearerPrefix" },
    })
    assert.deepEqual(isSignedCronRequest(req), { ok: false, reason: "no_header" })
  } finally {
    process.env.CRON_SECRET = saved
  }
})

test("returns mismatch when bearer differs at same length", () => {
  const saved = process.env.CRON_SECRET
  process.env.CRON_SECRET = "a".repeat(32)
  try {
    const req = new Request("http://localhost/x", {
      headers: { authorization: "Bearer " + "b".repeat(32) },
    })
    assert.deepEqual(isSignedCronRequest(req), { ok: false, reason: "mismatch" })
  } finally {
    process.env.CRON_SECRET = saved
  }
})

test("returns missing_secret when CRON_SECRET is unset", () => {
  const saved = process.env.CRON_SECRET
  delete process.env.CRON_SECRET
  try {
    const req = new Request("http://localhost/x", {
      headers: { authorization: "Bearer anything" },
    })
    assert.deepEqual(isSignedCronRequest(req), { ok: false, reason: "missing_secret" })
  } finally {
    process.env.CRON_SECRET = saved
  }
})

test("returns short_secret when CRON_SECRET is too short", () => {
  const saved = process.env.CRON_SECRET
  process.env.CRON_SECRET = "short"
  try {
    const req = new Request("http://localhost/x", {
      headers: { authorization: "Bearer short" },
    })
    assert.deepEqual(isSignedCronRequest(req), { ok: false, reason: "short_secret" })
  } finally {
    process.env.CRON_SECRET = saved
  }
})

test("returns mismatch when bearer is a different length", () => {
  const saved = process.env.CRON_SECRET
  process.env.CRON_SECRET = "a".repeat(32)
  try {
    const req = new Request("http://localhost/x", {
      headers: { authorization: "Bearer short" },
    })
    assert.deepEqual(isSignedCronRequest(req), { ok: false, reason: "mismatch" })
  } finally {
    process.env.CRON_SECRET = saved
  }
})
