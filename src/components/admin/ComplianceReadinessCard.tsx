import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { FormDefinitionHelpButton } from './FormDefinitionsPanel'
import type { TeenDriverFormId } from '@/lib/compliance/tennessee-teen-driver-forms'

type Rollup = {
  id: string
  name: string
  ready: number
  needsInfo: number
  blocked: number
}

const FORM_IDS: TeenDriverFormId[] = ['SF-1010', 'SF-1256', 'SF-0259']

export default function ComplianceReadinessCard({ rollups }: { rollups: Rollup[] }) {
  return (
    <section className="dash-card">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Tennessee</p>
          <h2 className="dash-section-title">Compliance forms</h2>
        </div>
        <ShieldCheck style={{ width: 16, height: 16, color: 'var(--admin-text-muted)' }} />
      </div>
      <div className="dash-compliance-grid">
        {rollups.map((form) => {
          const formId = FORM_IDS.find((id) => id === form.id) ?? form.id
          return (
            <div key={form.id} className="dash-compliance-item">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <div className="dash-compliance-label" style={{ marginBottom: 0 }}>
                  {form.name}
                </div>
                <FormDefinitionHelpButton
                  formId={formId as TeenDriverFormId}
                  size="sm"
                  label="?"
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <span className="dash-pill dash-pill-green">
                  <CheckCircle2 style={{ width: 10, height: 10 }} />
                  {form.ready}
                </span>
                {form.needsInfo > 0 && (
                  <span className="dash-pill dash-pill-amber">
                    <AlertTriangle style={{ width: 10, height: 10 }} />
                    {form.needsInfo}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
