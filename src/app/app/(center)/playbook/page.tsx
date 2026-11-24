import { requireSession } from '@/lib/os/center'
import { many } from '@/lib/os/db'
import { fmtMoney } from '@/lib/os/time'
import { displayPhone } from '@/lib/os/util'
import { PlaybookEditor } from '@/components/os/PlaybookEditor'
import { activeEngine } from '@/lib/os/agent/router'
import { AGENT_MODEL } from '@/lib/os/agent/claude'
import { deliveryMode } from '@/lib/os/messaging'
import { paymentProvider } from '@/lib/os/payments'
import type { Service } from '@/lib/os/scheduling'

export default async function PlaybookPage() {
  const s = await requireSession()
  const services = await many<Service>(s.db, `select * from rs.services where school_id = $1 order by kind desc, price_cents`, [s.school.id])
  const engine = activeEngine()
  const sms = deliveryMode(s.school)
  const pay = paymentProvider(s.school.is_sandbox)
  const status = [
    { name: 'Text messaging', state: sms === 'twilio' ? 'Twilio' : 'Sandbox', ok: sms === 'twilio',
      note: sms === 'twilio' ? `Texts to ${displayPhone(s.school.agent_phone)} are answered live.` : 'Texts stay on this machine and appear in the sandbox phone. Connecting Twilio needs an account, a number and US A2P 10DLC registration.' },
    { name: 'Payments', state: pay === 'stripe' ? 'Stripe' : 'Test checkout', ok: pay === 'stripe',
      note: pay === 'stripe' ? 'Payment links open Stripe Checkout; bookings confirm from the signed webhook.' : 'Payment links open a labelled test checkout. No card is charged. Add Stripe keys to take real payments.' },
    { name: 'Conversation engine', state: engine === 'claude' ? 'Claude' : 'Built-in interpreter', ok: engine === 'claude',
      note: engine === 'claude' ? `Model ${AGENT_MODEL}. Every time, price and link in a reply is checked against records before sending.` : 'No Anthropic API key is set, so replies come from a rule-based interpreter that handles common requests and passes the rest to you. Set ANTHROPIC_API_KEY for natural conversation.' },
    { name: 'Drive times', state: 'Estimated', ok: false, note: 'Travel between pickups is estimated from distance by ZIP-code zone, with extra padding for addresses that can\'t be placed. A maps provider is not connected.' },
  ]
  return (
    <>
      <header className="rs-page-head"><div><h1>Playbook</h1><p>Everything the assistant knows about {s.school.name}, and the limits it works within.</p></div></header>
      <div className="rs-grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <PlaybookEditor initial={s.school.playbook} />
        <div className="rs-stack">
          <section className="rs-panel" aria-labelledby="svc">
            <div className="rs-panel-head"><div><h2 id="svc">What you sell</h2><p>Prices the assistant quotes and charges.</p></div></div>
            <div className="rs-panel-body">
              <ul className="rs-status">
                {services.map((sv) => (
                  <li key={sv.id}><strong>{sv.name}</strong><span>{sv.price_cents ? fmtMoney(sv.price_cents, s.school.currency) : 'Included'}</span>
                    <p>{sv.kind === 'lesson' ? `${sv.duration_min} min${sv.pickup ? ', home pickup' : ''}` : 'Class'}{sv.deposit_cents ? ` · ${fmtMoney(sv.deposit_cents, s.school.currency)} deposit` : ''}{sv.min_age_years ? ` · ${sv.min_age_years}+` : ''}</p></li>
                ))}
              </ul>
              <p className="rs-help">Changing prices and adding services is done by Roadsmith support during setup for now.</p>
            </div>
          </section>
          <section className="rs-panel" aria-labelledby="conn">
            <div className="rs-panel-head"><div><h2 id="conn">Connections</h2><p>What is live and what is simulated.</p></div></div>
            <div className="rs-panel-body">
              <ul className="rs-status">
                {status.map((x) => <li key={x.name}><strong>{x.name}</strong><span className={x.ok ? 'rs-tag rs-tag--go' : 'rs-tag rs-tag--amber'}>{x.state}</span><p>{x.note}</p></li>)}
              </ul>
            </div>
          </section>
          <section className="rs-panel" aria-labelledby="area">
            <div className="rs-panel-head"><div><h2 id="area">Service area</h2><p>Pickups are placed by ZIP code.</p></div></div>
            <div className="rs-panel-body" style={{ fontSize: 14 }}>
              {s.school.playbook.service_area.zones.map((z) => <div key={z.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>{z.name}</span><span style={{ color: 'var(--muted)' }}>{z.zips.join(', ')}</span></div>)}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
