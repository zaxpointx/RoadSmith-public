import '../../os.css'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Mark } from '@/components/os/Mark'
import { EnterSandbox } from '@/components/os/EnterSandbox'
import { getSession } from '@/lib/os/auth'
import { isSandbox } from '@/lib/os/db'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sign in — Roadsmith' }

export default async function LoginPage() {
  if (await getSession()) redirect('/app')
  const sandbox = isSandbox()
  return (
    <div className="rs" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <main className="rs-panel" style={{ maxWidth: 460, width: '100%', padding: 28 }}>
        <Link href="/" className="rs-brand" style={{ color: 'var(--ink)', padding: 0 }}><Mark />Roadsmith</Link>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '22px 0 8px' }}>Control Center</h1>
        {sandbox ? (
          <>
            <p style={{ color: 'var(--ink-2)', marginBottom: 18 }}>This is the local sandbox: a fictional school (Larkspur Driving School) with synthetic students. You&apos;ll sign in as its owner, Maya Torres. No real texts, payments or emails are sent.</p>
            <EnterSandbox />
            <p className="rs-help" style={{ marginTop: 14 }}>Prefer to start as a parent? <Link href="/sandbox">Open the sandbox phone</Link> and text the school.</p>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--ink-2)', marginBottom: 18 }}>Sign in with the email address the school has on file for you. We&apos;ll email you a one-time link.</p>
            <Link className="rs-btn rs-btn--go" href="/login?next=/app">Email me a sign-in link</Link>
          </>
        )}
      </main>
    </div>
  )
}
