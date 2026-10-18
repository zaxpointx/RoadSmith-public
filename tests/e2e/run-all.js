/**
 * E2E Test Runner — The Driving Center SaaS
 * Run: node tests/e2e/run-all.js
 *
 * Uses native fetch (Node.js 18+). No extra dependencies.
 */

const BASE = process.env.TEST_URL || 'http://localhost:3000'

const tests = [
  {
    name: 'GET /api/health',
    fn: async () => {
      const res = await fetch(`${BASE}/api/health`)
      const body = await res.json()
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
      console.log('  ✓ health check OK')
    }
  },
  {
    name: 'GET /api/schools (unauthenticated — should 400)',
    fn: async () => {
      const res = await fetch(`${BASE}/api/schools`)
      if (res.status === 200) throw new Error('Unauthenticated /api/schools returned 200 — must be 401/403')
      console.log('  ✓ /api/schools auth-guarded OK')
    }
  },
  {
    name: 'POST /api/schools (empty body — should 400)',
    fn: async () => {
      const res = await fetch(`${BASE}/api/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const body = await res.json()
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}: ${JSON.stringify(body)}`)
      if (!body.error?.includes('schoolName') && !body.error?.includes('required')) {
        throw new Error(`Expected 'required fields' error, got: ${body.error}`)
      }
      console.log('  ✓ /api/schools validates required fields OK')
    }
  },
  {
    name: 'POST /api/schools (DEMO_MODE — creates school)',
    fn: async () => {
      const res = await fetch(`${BASE}/api/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: 'Test School E2E',
          ownerName: 'Test Owner',
          email: `e2e-test-${Date.now()}@test.com`,
          phone: '555-0100',
          state: 'TN'
        })
      })
      const body = await res.json()
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(body)}`)
      if (!body.schoolId) throw new Error(`No schoolId in response: ${JSON.stringify(body)}`)
      if (!body.slug) throw new Error(`No slug in response: ${JSON.stringify(body)}`)
      console.log(`  ✓ School created: ${body.schoolId} (${body.slug})`)
      return { schoolId: body.schoolId, slug: body.slug }
    }
  }
]

async function runAll() {
  let passed = 0, failed = 0
  const results = []

  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `)
    try {
      const extra = await test.fn()
      passed++
      results.push({ name: test.name, status: 'PASS', extra })
    } catch (err) {
      failed++
      results.push({ name: test.name, status: 'FAIL', error: err.message })
      console.error(`✗ FAIL: ${err.message}`)
    }
  }

  console.log(`\n─── Results: ${passed} passed, ${failed} failed ───`)
  process.exit(failed > 0 ? 1 : 0)
}

runAll()
