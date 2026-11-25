'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Mark } from './Mark'

const NAV = [
  { href: '/app', label: 'Today' },
  { href: '/app/conversations', label: 'Conversations' },
  { href: '/app/schedule', label: 'Schedule' },
  { href: '/app/students', label: 'Students' },
  { href: '/app/playbook', label: 'Playbook' },
  { href: '/app/activity', label: 'Activity' },
]

export function Rail({ school, owner, inboxCount, sandbox }: { school: string; owner: string; inboxCount: number; sandbox: boolean }) {
  const path = usePathname()
  const router = useRouter()
  async function signOut() {
    await fetch('/api/os/session', { method: 'DELETE' })
    router.push('/app/login')
  }
  return (
    <nav className="rs-rail" aria-label="Control Center">
      <Link href="/app" className="rs-brand"><Mark />Roadsmith</Link>
      <div className="rs-school"><strong>{school}</strong>{owner}</div>
      <div className="rs-menu">
        {NAV.map((n) => {
          const active = n.href === '/app' ? path === '/app' : path.startsWith(n.href)
          return (
            <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}>
              {n.label}
              {n.href === '/app' && inboxCount > 0 ? <span className="rs-count" aria-label={`${inboxCount} need you`}>{inboxCount}</span> : null}
            </Link>
          )
        })}
      </div>
      <div className="rs-rail-foot">
        {sandbox ? <Link href="/sandbox">Open the sandbox phone</Link> : null}
        <button type="button" onClick={signOut}>Sign out</button>
      </div>
    </nav>
  )
}
