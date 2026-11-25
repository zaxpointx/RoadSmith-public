import '../../os.css'
import Link from 'next/link'
import { Rail } from '@/components/os/Rail'
import { requireSession } from '@/lib/os/center'
import { one } from '@/lib/os/db'
import { now } from '@/lib/os/clock'
import { fmtWhen } from '@/lib/os/time'
import { activeEngine } from '@/lib/os/agent/router'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Control Center — Roadsmith' }

export default async function CenterLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession()
  const inbox = (await one<{ n: number }>(s.db, `select count(*)::int as n from rs.inbox where school_id = $1 and status = 'open'`, [s.school.id]))!.n
  return (
    <div className="rs">
      {s.school.is_sandbox ? (
        <div className="rs-sandbox-bar" role="note">
          <span><strong>Sandbox</strong> — synthetic school, nothing leaves this machine.</span>
          <span>Sandbox time: {fmtWhen(now(), s.school.timezone)}</span>
          <span>Assistant: {activeEngine() === 'claude' ? 'Claude' : 'built-in interpreter (no AI key set)'}</span>
          <Link href="/sandbox">Text the school from the sandbox phone</Link>
        </div>
      ) : null}
      <div className="rs-shell">
        <Rail school={s.school.name} owner={s.staff.name} inboxCount={inbox} sandbox={s.school.is_sandbox} />
        <main className="rs-main" id="main">{children}</main>
      </div>
    </div>
  )
}
