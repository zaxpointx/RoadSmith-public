import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  ONBOARDING_CONFIG,
  processUserReply,
  type OnboardingState,
} from '@/lib/onboarding/config'

// ── Demo session helper ───────────────────────────────────────────
async function getDemoSession(): Promise<{ schoolId: string } | null> {
  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  if (!demoUserCookie?.value) return null
  try {
    const payload = JSON.parse(
      Buffer.from(demoUserCookie.value, 'base64').toString('utf8')
    )
    return payload?.schoolId ? { schoolId: payload.schoolId } : null
  } catch {
    return null
  }
}

// ── Valid onboarding states ───────────────────────────────────────
const VALID_STATES: OnboardingState[] = [
  'started',
  'students_import',
  'instructors_added',
  'session_types_set',
  'complete',
]

function isValidState(s: string): s is OnboardingState {
  return VALID_STATES.includes(s as OnboardingState)
}

// ── POST handler ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const session = await getDemoSession()
  if (!session) {
    return NextResponse.json({ error: 'No demo session' }, { status: 401 })
  }

  const body = await request.json()
  const { currentState, userMessage, onboardingData } = body as {
    currentState?: string
    userMessage?: string
    onboardingData?: Record<string, unknown>
  }

  if (!currentState || !isValidState(currentState)) {
    return NextResponse.json(
      {
        response: ONBOARDING_CONFIG.started.greeting,
        state: 'started',
        suggestions: ONBOARDING_CONFIG.started.suggestions,
        progress: { started: false, students_import: false, instructors_added: false, session_types_set: false, complete: false },
        actions: [],
      },
      { status: 200 }
    )
  }

  // Process the user's message through the state machine
  const result = processUserReply(currentState, userMessage ?? '', onboardingData)
  const nextState = result.nextState

  // Get suggestions for the next state
  const suggestions = ONBOARDING_CONFIG[nextState]?.suggestions ?? []

  // Build progress map
  const stepOrder: OnboardingState[] = [
    'started',
    'students_import',
    'instructors_added',
    'session_types_set',
    'complete',
  ]
  const currentIdx = stepOrder.indexOf(currentState)
  const nextIdx = stepOrder.indexOf(nextState)
  const progress: Record<OnboardingState, boolean> = {
    started: true,
    students_import: nextIdx > 0 || currentIdx >= 1,
    instructors_added: nextIdx > 1 || currentIdx >= 2,
    session_types_set: nextIdx > 2 || currentIdx >= 3,
    complete: nextIdx >= 4 || currentIdx >= 4,
  }

  return NextResponse.json({
    response: result.response,
    state: nextState,
    suggestions,
    progress,
    actions: result.actions ?? [],
  })
}
