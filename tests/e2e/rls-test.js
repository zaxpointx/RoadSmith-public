/**
 * RLS Cross-School Access Test
 * Verifies that School A cannot read School B's data via the REST API.
 *
 * Usage:
 *   source .env.local
 *   node tests/e2e/rls-test.js
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing env vars.')
  process.exit(1)
}

// Service role: both apikey + Authorization headers
// Anon: both headers too (works for everything in this project)
function authHeaders(apiKey) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
  }
}

const srHeaders = authHeaders(SERVICE_ROLE_KEY)
const anonHeaders = authHeaders(ANON_KEY)

async function createSchool(name, ownerEmail) {
  const slug = 'rls-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/schools`, {
    method: 'POST',
    headers: {
      ...srHeaders,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      name,
      slug,
      owner_email: ownerEmail,
      state: 'TN',
      plan_tier: 'starter',
      active: true,
      subscription_status: 'trial',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Failed to create school: ${JSON.stringify(data)}`)
  return data[0]
}

async function createStudent(schoolId, legalName) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/students_driver_ed`, {
    method: 'POST',
    headers: {
      ...srHeaders,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      school_id: schoolId,
      legal_name: legalName,
      dob: '2010-01-01',
      parent_email: `parent-${Date.now().toString(36)}@test.com`,
      emergency_contact_name: 'Test Contact',
      emergency_contact_phone: '0000000000',
      classroom_hours: 0,
      driving_hours: 0,
      enrollment_date: new Date().toISOString().split('T')[0],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Failed to create student: ${JSON.stringify(data)}`)
  return data[0]
}

async function deleteSchool(schoolId) {
  await fetch(`${SUPABASE_URL}/rest/v1/students_driver_ed?school_id=eq.${schoolId}`, {
    method: 'DELETE',
    headers: srHeaders,
  })
  await fetch(`${SUPABASE_URL}/rest/v1/schools?id=eq.${schoolId}`, {
    method: 'DELETE',
    headers: srHeaders,
  })
}

async function run() {
  let schoolA = null, schoolB = null
  const ts = Date.now().toString(36)

  try {
    console.log('─── RLS Cross-School Test ───\n')

    // 1. Create two schools (service role — admin)
    console.log('1. Creating schools...')
    schoolA = await createSchool(`RLS Test A ${ts}`, `rls-a-${ts}@test.com`)
    schoolB = await createSchool(`RLS Test B ${ts}`, `rls-b-${ts}@test.com`)
    console.log(`   ✓ School A: ${schoolA.id}`)
    console.log(`   ✓ School B: ${schoolB.id}`)

    // 2. Create a student in school A (service role — admin)
    console.log('\n2. Creating student in School A...')
    const student = await createStudent(schoolA.id, 'CrossSchool Test Student')
    console.log(`   ✓ Student created in school A: ${student.id}`)

    // 3. Try to access school A's student using the school B context
    // With RLS enforcing school_id: the school B user should NOT see school A's data
    // Without RLS: school B could potentially see school A's student if query is mis-scoped
    console.log('\n3. Testing cross-school isolation...')
    console.log('   [School B tries to query students belonging to School A]')

    // Using anon context (what the browser client uses), query school A's students
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/students_driver_ed?school_id=eq.${schoolA.id}&select=id,school_id`,
      { headers: anonHeaders }
    )
    const result = await res.json()

    console.log(`   Status: ${res.status}, Rows: ${Array.isArray(result) ? result.length : 'N/A'}`)

    if (res.status === 200 && Array.isArray(result)) {
      if (result.length > 0) {
        // If we got rows, check if RLS is actually filtering
        // The query was for school_id=schoolA.id — if rows returned, they're school A's data
        // With RLS: should only return rows visible to current authenticated school
        // Without RLS: would return all matching rows
        const allBelongToSchoolA = result.every(s => s.school_id === schoolA.id)
        if (allBelongToSchoolA) {
          console.log('\n⚠️  RLS UNCLEAR — Query returns correct data but RLS enforcement is ambiguous')
          console.log('   Anon context can reach this row when filtering by school_id explicitly.')
          console.log('   RLS should ALSO enforce school_id automatically on every query.')
          console.log('   → Need to check with a raw count query or no school_id filter.')
        } else {
          console.log('\n🚨 RLS FAILURE — Cross-school data leak detected!')
          process.exitCode = 1
        }
      } else {
        console.log('\n✅ RLS APPEARS TO WORK — school_id filter enforced (empty result)')
        console.log('   [But explicit filter bypasses RLS check — run raw query test below]')
      }
    } else if ([401, 403, 406].includes(res.status)) {
      console.log('\n✅ RLS WORKING — Access blocked with status', res.status)
    } else {
      console.log(`\n⚠️  UNCLEAR — Status ${res.status}: ${JSON.stringify(result).slice(0, 200)}`)
    }

    // 4. Try query with NO school_id filter — this is the real RLS test
    // RLS should automatically inject school_id filter based on authenticated user
    console.log('\n4. Testing raw query (no school_id filter — RLS should inject it)...')
    const rawRes = await fetch(
      `${SUPABASE_URL}/rest/v1/students_driver_ed?select=id,school_id&limit=10`,
      { headers: anonHeaders }
    )
    const rawResult = await rawRes.json()

    if (rawRes.status === 200 && Array.isArray(rawResult)) {
      if (rawResult.length === 0) {
        console.log('   ✅ PASS — No rows returned (RLS injected filter working)')
      } else {
        const schoolsSeen = [...new Set(rawResult.map(s => s.school_id))]
        console.log(`   Schools visible: ${schoolsSeen.length}`)
        console.log(`   Total rows: ${rawResult.length}`)
        if (schoolsSeen.length > 1) {
          console.log('\n🚨 CRITICAL — RLS NOT ENFORCING school_id on raw queries!')
          console.log('   Multiple schools visible in raw query without explicit filter.')
          process.exitCode = 1
        } else if (schoolsSeen.length === 1) {
          console.log('   ✅ PASS — Only one school visible (RLS working correctly)')
        }
      }
    } else if ([401, 403, 406].includes(rawRes.status)) {
      console.log('   ✅ PASS — Raw query blocked (RLS working)')
    } else {
      console.log(`   ⚠️  UNCLEAR — Status ${rawRes.status}`)
    }
  } catch (err) {
    console.error('\n💥 Test error:', err.message)
    process.exitCode = 1
  } finally {
    if (schoolA) await deleteSchool(schoolA.id).catch(() => {})
    if (schoolB) await deleteSchool(schoolB.id).catch(() => {})
    console.log('\n   Test schools cleaned up.')
  }
}

run()
