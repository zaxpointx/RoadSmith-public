import { NextResponse } from 'next/server'
import { resolveSchoolAdminContext } from '@/lib/school-admin/auth'

/**
 * GET /api/auth/google-calendar
 *
 * ROA-18: Stub OAuth flow for Google Calendar.
 * Initiates the OAuth redirect to Google's consent screen. If credentials
 * are not yet configured, returns a 503 with instructions instead of
 * redirecting, so the UI can show a clear "not yet wired" state.
 *
 * Required env vars (see .env.example):
 *   GOOGLE_CALENDAR_CLIENT_ID
 *   GOOGLE_CALENDAR_CLIENT_SECRET
 *   GOOGLE_CALENDAR_REDIRECT_URI
 *
 * Once credentials are set, this route will 302 to the Google consent URL
 * with the appropriate scope (https://www.googleapis.com/auth/calendar.events)
 * and state tied to the requesting school.
 */

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

function buildGoogleAuthUrl(params: {
  clientId: string
  redirectUri: string
  state: string
}) {
  const url = new URL(GOOGLE_AUTH_BASE)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('scope', SCOPES.join(' '))
  url.searchParams.set('state', params.state)
  return url.toString()
}

export async function GET(request: Request) {
  // 1. Require an authenticated school admin before kicking off OAuth.
  const context = await resolveSchoolAdminContext(request)
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check whether credentials are configured.
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error: 'oauth_not_configured',
        message:
          'Google Calendar OAuth credentials are not yet configured. Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI to enable.',
      },
      { status: 503 }
    )
  }

  // 3. State encodes the school so the callback can route correctly.
  const statePayload = {
    schoolId: context.schoolId,
    userId: context.userId,
    issuedAt: Date.now(),
  }
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url')

  const authorizeUrl = buildGoogleAuthUrl({ clientId, redirectUri, state })
  return NextResponse.redirect(authorizeUrl)
}
