import '../os.css'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mark } from '@/components/os/Mark'
import { SandboxPhone } from '@/components/os/SandboxPhone'
import { sandboxEnabled } from '@/lib/os/sandbox-api'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sandbox phone — Roadsmith', robots: { index: false } }

export default function SandboxPage() {
  if (!sandboxEnabled()) notFound()
  return (
    <div className="rs">
      <header className="rs-topbar">
        <Link href="/" className="rs-brand"><Mark />Roadsmith</Link>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 640 }}>Text a fictional driving school as a parent, student, instructor or the owner. Everything here is synthetic and stays on this machine.</p>
        <Link href="/app" className="rs-btn rs-btn--sm">Control Center</Link>
      </header>
      <SandboxPhone />
    </div>
  )
}
