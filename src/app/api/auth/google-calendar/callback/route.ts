import { NextResponse } from 'next/server'

/**
 * GET /api/auth/google-calendar/callback
 *
 * ROA-18: Stub OAuth callback for Google Calendar.
 *
 * Google's consent screen redirects back to this route with `code` and
 * `state`. For the stub:
 *   - If `error` is present (user denied, etc.), show a friendly message.
 *   - If credentials are not yet configured, show a clear
 *     "OAuth not yet configured" page so the UI flow is end-to-end
 *     testable even before secrets are added.
 *   - When credentials are configured, the full token exchange will be
 *     wired here (exchange code -> tokens, persist to DB, mark school as
 *     connected). For now, we acknowledge the callback and tell the
 *     admin what's next.
 *
 * Returns a small HTML page (not a JSON redirect) so the user lands
 * somewhere readable regardless of which entry point started the flow.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function html(body: string, title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        background: #0b0d0a;
        color: #e8eae5;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        max-width: 520px;
        width: 100%;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        background: rgba(23,26,20,0.9);
        box-shadow: 0 18px 50px rgba(0,0,0,0.4);
        padding: 28px;
      }
      .eyebrow {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #9aa39b;
        margin: 0 0 8px;
      }
      h1 { font-size: 22px; margin: 0 0 12px; }
      p { color: #c9cfc7; line-height: 1.5; margin: 0 0 12px; }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        background: rgba(255,255,255,0.06);
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 13px;
      }
      .actions { margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
      a.button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 999px;
        font-weight: 700;
        text-decoration: none;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        color: #e8eae5;
      }
      a.button.primary {
        background: #a3e635;
        color: #10120e;
        border-color: transparent;
      }
      ul { color: #c9cfc7; padding-left: 20px; }
      li { margin-bottom: 6px; }
    </style>
  </head>
  <body>
    <main class="card">${body}</main>
  </body>
</html>`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI

  const settingsHref = '/school-admin/settings'
  const homeHref = '/school-admin'

  // Case 1: Google returned an error (denied, cancelled, etc.)
  if (errorParam) {
    return new NextResponse(
      html(
        `
        <p class="eyebrow">Google Calendar</p>
        <h1>Connection cancelled</h1>
        <p>Google returned an error and the connection was not completed.</p>
        <p><code>${escapeHtml(errorParam)}</code>${errorDescription ? ` &mdash; ${escapeHtml(errorDescription)}` : ''}</p>
        <div class="actions">
          <a class="button primary" href="${settingsHref}">Back to settings</a>
        </div>
      `,
        'Google Calendar connection cancelled'
      ),
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  // Case 2: No credentials configured. Stub state.
  if (!clientId || !clientSecret || !redirectUri) {
    return new NextResponse(
      html(
        `
        <p class="eyebrow">Google Calendar</p>
        <h1>OAuth not yet configured</h1>
        <p>
          Roadsmith received the redirect from Google, but the OAuth credentials
          aren't set on this deployment yet. The integration shell is wired up and
          waiting for credentials to go live.
        </p>
        <p>To finish wiring, add these environment variables:</p>
        <ul>
          <li><code>GOOGLE_CALENDAR_CLIENT_ID</code></li>
          <li><code>GOOGLE_CALENDAR_CLIENT_SECRET</code></li>
          <li><code>GOOGLE_CALENDAR_REDIRECT_URI</code> &mdash; should match this URL</li>
        </ul>
        <p>Once they're set, the &ldquo;Connect Google Calendar&rdquo; button will hand off to Google's consent screen and Roadsmith will complete the handshake on the way back.</p>
        <div class="actions">
          <a class="button primary" href="${settingsHref}">Back to settings</a>
          <a class="button" href="${homeHref}">Dashboard</a>
        </div>
      `,
        'Google Calendar OAuth not yet configured'
      ),
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  // Case 3: Credentials are configured, but token exchange isn't wired yet.
  // The full implementation will: validate state, POST to Google's token
  // endpoint, persist refresh_token against the school, mark connected.
  if (!code || !state) {
    return new NextResponse(
      html(
        `
        <p class="eyebrow">Google Calendar</p>
        <h1>Connection incomplete</h1>
        <p>The callback was reached without an authorization code or state. Please restart the connection from settings.</p>
        <div class="actions">
          <a class="button primary" href="${settingsHref}">Back to settings</a>
        </div>
      `,
        'Google Calendar connection incomplete'
      ),
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  return new NextResponse(
    html(
      `
      <p class="eyebrow">Google Calendar</p>
      <h1>Almost connected</h1>
      <p>Roadsmith received the authorization code from Google. Token exchange and persistence will be wired in the next pass &mdash; credentials are configured and the shell is live.</p>
      <div class="actions">
        <a class="button primary" href="${settingsHref}">Back to settings</a>
        <a class="button" href="${homeHref}">Dashboard</a>
      </div>
    `,
      'Google Calendar OAuth pending'
    ),
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
  )
}
