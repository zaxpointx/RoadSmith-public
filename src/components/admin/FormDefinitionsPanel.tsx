'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileSignature,
  GraduationCap,
  HelpCircle,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import type { TeenDriverFormId } from '@/lib/compliance/tennessee-teen-driver-forms'

// ── Visual tokens — match the admin command / glass design system ─────
const GLASS_BG = 'var(--glass-bg)'
const GLASS_BORDER = 'var(--glass-border)'
const GLASS_BLUR = 'var(--glass-blur)'
const TEXT = 'var(--admin-text)'
const TEXT_SECONDARY = 'var(--admin-text-secondary)'
const TEXT_MUTED = 'var(--admin-text-muted)'
const ACCENT = 'var(--admin-accent)'

type FormDefinition = {
  id: TeenDriverFormId
  name: string
  /** One-line subtitle used in the picker and panel header */
  summary: string
  /** What the form legally is / its source */
  whatItIs: string
  /** Who signs / fills the form */
  whoFills: string
  /** When in the teen driver workflow it is required */
  whenNeeded: string
  /** Tennessee code / DMV rule driving the requirement */
  legalRequirement: string
  /** Common mistakes instructors should watch for */
  commonMistakes: string[]
  /** Quick checklist of fields the system tracks for readiness */
  readinessFields: string[]
  /** Iconic lucide component for the form header */
  icon: typeof BookOpen
  /** Accent color key */
  accent: 'green' | 'blue' | 'amber'
}

const FORM_DEFINITIONS: Record<TeenDriverFormId, FormDefinition> = {
  'SF-1010': {
    id: 'SF-1010',
    name: 'Certificate of Compulsory School Attendance',
    summary: 'Confirms the teen is enrolled in and attending school.',
    whatItIs:
      'A Tennessee Department of Safety form that certifies a minor is meeting the state\'s compulsory school attendance requirement. It must be issued by the teen\'s school and presented to the driver services center when applying for a permit or intermediate license.',
    whoFills:
      'Signed by a school official (counselor, registrar, or attendance secretary) on school letterhead. The student does not fill it out — the school does. Roadsmith keeps the certificate on file and provides it to the family.',
    whenNeeded:
      'Before the student\'s first visit to a Tennessee Driver Services Center to obtain an instruction permit, and again when upgrading to an intermediate license if the previous certificate is more than 30 days old.',
    legalRequirement:
      'Required under Tennessee Code Annotated § 49-6-3003 (compulsory attendance) and recognized by the Tennessee Department of Safety and Homeland Security for the teen driver license process.',
    commonMistakes: [
      'Date is missing or is more than 30 days old when the student visits the DMV',
      'Form is not signed by an authorized school official (e.g. only a parent or instructor signed)',
      'School seal or letterhead is missing — most DMV offices will reject it',
      'Student legal name on the form does not match the birth certificate / Social Security card',
      'Form is from a non-Tennessee school and has not been verified for in-state attendance',
    ],
    readinessFields: [
      'Student legal name on file',
      'Date of birth on file',
      'School enrollment date recorded',
    ],
    icon: GraduationCap,
    accent: 'green',
  },
  'SF-1256': {
    id: 'SF-1256',
    name: 'Certification of 50 Hours Behind the Wheel',
    summary: 'Parent / instructor certification of 50 driving hours, 10 at night.',
    whatItIs:
      'A Tennessee Department of Safety affidavit certifying that a minor has completed at least 50 hours of behind-the-wheel supervised driving, including 10 hours driven at night. It is the parent\'s or legal guardian\'s sworn statement of supervised practice, supported by a log of hours.',
    whoFills:
      'Filled out by the parent or legal guardian who actually supervised the driving. The instructor may provide a behind-the-wheel hour log, but the form itself is signed by the parent/guardian under penalty of perjury. The Roadsmith team helps collect the supporting log and reviews the totals.',
    whenNeeded:
      'Required when the student is ready to take the Tennessee road test for the intermediate license, OR when the student is applying for a license without a road test at 17+ with sufficient hours. Roadsmith blocks this form until total and night-hour thresholds are met.',
    legalRequirement:
      'Mandated by Tennessee Code Annotated § 55-50-312 for intermediate license applicants under 18. The minimum is 50 hours total, with at least 10 night hours, before a road test waiver or licensing can proceed.',
    commonMistakes: [
      'Total hours are under 50 — Roadsmith will block generation until the threshold is met',
      'Night hours are under 10 — these must be logged between sunset and sunrise',
      'Parent/guardian did not sign, or signed in the wrong place',
      'Date range is implausible (e.g. 50 hours in 2 days) — courts and DMV treat this as suspect',
      'Permit number missing — the form must reference the student\'s valid instruction permit',
      'Supervising driver license number not recorded on the log',
    ],
    readinessFields: [
      'Permit number recorded',
      'At least 50 total driving hours logged',
      'At least 10 night hours logged',
    ],
    icon: Clock,
    accent: 'blue',
  },
  'SF-0259': {
    id: 'SF-0259',
    name: 'Minor / Teenage Affidavit and Cancellation',
    summary: 'Parent or guardian financial responsibility affidavit for a minor driver.',
    whatItIs:
      'A Tennessee Department of Safety affidavit signed by a parent or legal guardian accepting financial responsibility for a minor who is being issued a driver license. By signing, the adult agrees to be jointly liable for any damages caused by the minor driver and acknowledges the right to cancel the minor\'s license at any time.',
    whoFills:
      'Signed by the parent or legal guardian named on the teen\'s permit application. The student does not sign. Roadsmith confirms that the parent/guardian contact on file matches who is signing, and stores the signed copy for the school record.',
    whenNeeded:
      'Required before a Tennessee intermediate license can be issued to any minor under 18, regardless of whether the teen completed a Roadsmith course. Roadsmith needs the parent/guardian contact and permit number on file before this form can be generated.',
    legalRequirement:
      'Required under Tennessee Code Annotated § 55-50-303 (parental consent and financial responsibility) for any driver license issued to a minor. The form is also the legal mechanism a parent uses to cancel the minor\'s license at any time.',
    commonMistakes: [
      'Parent/guardian name on the form does not match the parent contact we have on file',
      'No contact email on file — Roadsmith cannot deliver the signed copy to the family',
      'Permit number missing — must match the student\'s active Tennessee instruction permit',
      'Form is signed by the student instead of the parent/guardian',
      'Guardian relationship is not established — a non-parent must provide guardianship documentation',
    ],
    readinessFields: [
      'Parent / guardian contact on file',
      'Valid permit number on file',
    ],
    icon: FileSignature,
    accent: 'amber',
  },
}

const FORM_ORDER: TeenDriverFormId[] = ['SF-1010', 'SF-1256', 'SF-0259']

function accentVars(accent: FormDefinition['accent']) {
  if (accent === 'green') return { color: ACCENT, soft: 'color-mix(in srgb, var(--admin-accent), transparent 80%)' }
  if (accent === 'amber') return { color: '#fbbf24', soft: 'color-mix(in srgb, #f59e0b, transparent 85%)' }
  return { color: 'var(--status-blue)', soft: 'color-mix(in srgb, var(--status-blue), transparent 88%)' }
}

type FormDefinitionsPanelProps = {
  /** Open with a specific form preselected. If omitted, opens the picker. */
  initialFormId?: TeenDriverFormId | null
  open: boolean
  onClose: () => void
}

export default function FormDefinitionsPanel({ initialFormId, open, onClose }: FormDefinitionsPanelProps) {
  const [activeId, setActiveId] = useState<TeenDriverFormId | null>(initialFormId ?? null)

  useEffect(() => {
    if (open) queueMicrotask(() => setActiveId(initialFormId ?? null))
  }, [open, initialFormId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const active = activeId ? FORM_DEFINITIONS[activeId] : null

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tennessee teen driver form definitions"
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'color-mix(in srgb, var(--bg-base), transparent 30%)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px', height: '100%',
          background: 'color-mix(in srgb, var(--text-primary), transparent 94%)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderLeft: `1px solid ${GLASS_BORDER}`,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.35)',
          animation: 'form-def-panel-in 0.22s ease-out',
        }}
      >
        {/* Header */}
        <header
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '22px 24px 16px',
            borderBottom: `1px solid ${GLASS_BORDER}`,
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: TEXT_MUTED, margin: 0,
              }}
            >
              TN form definitions
            </p>
            <h2
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 19, fontWeight: 600, color: TEXT,
                margin: '4px 0 0', lineHeight: 1.25,
              }}
            >
              {active ? active.name : 'What each Tennessee teen driver form means'}
            </h2>
            {active && (
              <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: '6px 0 0', lineHeight: 1.45 }}>
                {active.summary}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close form definitions"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'transparent',
              border: `1px solid ${GLASS_BORDER}`,
              color: TEXT_SECONDARY, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Form picker tabs */}
        <nav
          style={{
            display: 'flex', gap: 8, padding: '14px 24px',
            borderBottom: `1px solid ${GLASS_BORDER}`,
            flexWrap: 'wrap',
          }}
          aria-label="Pick a form"
        >
          {FORM_ORDER.map((id) => {
            const form = FORM_DEFINITIONS[id]
            const isActive = activeId === id
            const Icon = form.icon
            const a = accentVars(form.accent)
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveId(id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 10,
                  fontSize: 12, fontWeight: 600,
                  background: isActive ? a.soft : GLASS_BG,
                  border: `1px solid ${isActive ? a.color : GLASS_BORDER}`,
                  color: isActive ? a.color : TEXT_SECONDARY,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {id}
              </button>
            )
          })}
        </nav>

        {/* Body */}
        <div
          style={{
            flex: 1, overflowY: 'auto', minHeight: 0,
            padding: '20px 24px 28px',
            marginRight: '-8px', paddingRight: '32px',
          }}
        >
          {active ? <FormDefinitionBody form={active} /> : <FormPickerOverview onPick={setActiveId} />}
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${GLASS_BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12,
            fontSize: 11, color: TEXT_MUTED,
          }}
        >
          <span>
            Press <kbd
              style={{
                padding: '1px 6px', borderRadius: 4,
                border: `1px solid ${GLASS_BORDER}`,
                background: GLASS_BG, fontSize: 10, fontFamily: 'inherit',
              }}
            >Esc</kbd> to close
          </span>
          <span>Source: TN Dept. of Safety &amp; Homeland Security</span>
        </footer>
      </aside>

      <style jsx>{`
        @keyframes form-def-panel-in {
          from { transform: translateX(24px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function FormPickerOverview({
  onPick,
}: {
  onPick: (id: TeenDriverFormId) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.5 }}>
        Three Tennessee forms drive the teen driver license workflow. Pick one to see what it is,
        who fills it out, when it is needed, and the common mistakes that block readiness.
      </p>
      {FORM_ORDER.map((id) => {
        const form = FORM_DEFINITIONS[id]
        const Icon = form.icon
        const a = accentVars(form.accent)
        return (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            style={{
              textAlign: 'left',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: 14, borderRadius: 12,
              background: GLASS_BG,
              backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
              border: `1px solid ${GLASS_BORDER}`,
              color: TEXT, cursor: 'pointer',
              transition: 'border-color 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = a.color
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = GLASS_BORDER
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: a.soft, color: a.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon style={{ width: 18, height: 18 }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 600 }}>
                  {form.name}
                </span>
                <span
                  style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 999,
                    background: a.soft, color: a.color,
                  }}
                >
                  {form.id}
                </span>
              </div>
              <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: '4px 0 0', lineHeight: 1.5 }}>
                {form.summary}
              </p>
            </div>
          </button>
        )
      })}

      <div
        style={{
          marginTop: 6, padding: 14, borderRadius: 12,
          background: `color-mix(in srgb, ${ACCENT}, transparent 90%)`,
          border: `1px solid color-mix(in srgb, ${ACCENT}, transparent 70%)`,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}
      >
        <ShieldCheck style={{ width: 16, height: 16, color: ACCENT, flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: TEXT, margin: 0, lineHeight: 1.5 }}>
          These explanations summarize the forms as they apply to a Tennessee teen driver school.
          Always confirm the latest revisions on the official TN Department of Safety site before
          filing.
        </p>
      </div>
    </div>
  )
}

function FormDefinitionBody({ form }: { form: FormDefinition }) {
  const Icon = form.icon
  const a = accentVars(form.accent)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Hero */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: 14, borderRadius: 12,
          background: GLASS_BG,
          backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
          border: `1px solid ${GLASS_BORDER}`,
        }}
      >
        <div
          style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: a.soft, color: a.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon style={{ width: 20, height: 20 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: a.color,
            }}
          >
            {form.id} — Tennessee form
          </div>
          <div
            style={{
              fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600,
              color: TEXT, marginTop: 2, lineHeight: 1.3,
            }}
          >
            {form.name}
          </div>
        </div>
      </div>

      <DefinitionSection title="What it is" body={form.whatItIs} />
      <DefinitionSection
        title="Who fills it out"
        body={form.whoFills}
        icon={<User style={{ width: 13, height: 13, color: a.color }} />}
      />
      <DefinitionSection
        title="When it is needed"
        body={form.whenNeeded}
        icon={<Clock style={{ width: 13, height: 13, color: a.color }} />}
      />
      <DefinitionSection
        title="Legal requirement"
        body={form.legalRequirement}
        icon={<BookOpen style={{ width: 13, height: 13, color: a.color }} />}
      />

      {/* Common mistakes */}
      <section>
        <SectionHeader
          icon={<AlertTriangle style={{ width: 13, height: 13, color: '#fca5a5' }} />}
          title="Common mistakes"
          tone="red"
        />
        <ul
          style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
        >
          {form.commonMistakes.map((m) => (
            <li
              key={m}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                background: 'color-mix(in srgb, #f87171, transparent 92%)',
                border: '1px solid color-mix(in srgb, #f87171, transparent 80%)',
                fontSize: 12, color: TEXT, lineHeight: 1.5,
              }}
            >
              <AlertTriangle
                style={{ width: 13, height: 13, color: '#fca5a5', flexShrink: 0, marginTop: 2 }}
              />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Readiness fields */}
      <section>
        <SectionHeader
          icon={<CheckCircle2 style={{ width: 13, height: 13, color: a.color }} />}
          title="Readiness fields we track"
          tone="muted"
        />
        <ul
          style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          {form.readinessFields.map((f) => (
            <li
              key={f}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8,
                background: GLASS_BG,
                border: `1px solid ${GLASS_BORDER}`,
                fontSize: 12, color: TEXT, lineHeight: 1.4,
              }}
            >
              <CheckCircle2 style={{ width: 12, height: 12, color: a.color, flexShrink: 0 }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function DefinitionSection({
  title,
  body,
  icon,
}: {
  title: string
  body: string
  icon?: React.ReactNode
}) {
  return (
    <section>
      <SectionHeader icon={icon} title={title} tone="muted" />
      <p
        style={{
          fontSize: 13, color: TEXT, lineHeight: 1.55, margin: 0,
          padding: '10px 12px', borderRadius: 10,
          background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`,
        }}
      >
        {body}
      </p>
    </section>
  )
}

function SectionHeader({
  title,
  icon,
  tone,
}: {
  title: string
  icon?: React.ReactNode
  tone: 'muted' | 'red'
}) {
  return (
    <h3
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: tone === 'red' ? '#fca5a5' : TEXT_MUTED,
        margin: '0 0 8px',
      }}
    >
      {icon}
      {title}
    </h3>
  )
}

// ── Reusable trigger button — drop next to a form name to open the panel ─────

type HelpIconButtonProps = {
  formId: TeenDriverFormId
  size?: 'sm' | 'md'
  variant?: 'subtle' | 'filled'
  label?: string
}

export function FormDefinitionHelpButton({
  formId,
  size = 'sm',
  variant = 'subtle',
  label,
}: HelpIconButtonProps) {
  const [open, setOpen] = useState(false)
  const dim = size === 'sm' ? 24 : 30
  const iconSize = size === 'sm' ? 12 : 14

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label={`What is ${formId}?`}
        title={label ?? `What is ${formId}?`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: dim, padding: label ? '0 10px' : 0,
          width: label ? undefined : dim,
          borderRadius: 999,
          background: variant === 'filled'
            ? 'color-mix(in srgb, var(--admin-accent), transparent 80%)'
            : 'transparent',
          border: `1px solid ${variant === 'filled' ? 'color-mix(in srgb, var(--admin-accent), transparent 60%)' : GLASS_BORDER}`,
          color: variant === 'filled' ? ACCENT : TEXT_SECONDARY,
          cursor: 'pointer', flexShrink: 0,
          fontSize: 11, fontWeight: 600,
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = ACCENT
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--admin-accent), transparent 50%)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = variant === 'filled' ? ACCENT : TEXT_SECONDARY
          e.currentTarget.style.borderColor = variant === 'filled'
            ? 'color-mix(in srgb, var(--admin-accent), transparent 60%)'
            : GLASS_BORDER
        }}
      >
        <HelpCircle style={{ width: iconSize, height: iconSize }} />
        {label && <span>{label}</span>}
      </button>

      <FormDefinitionsPanel
        open={open}
        initialFormId={formId}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

// Re-export for convenience so the compliance page can also open the panel
// in picker mode (no preselected form) if it ever wants a single "?" trigger.
export { FORM_DEFINITIONS as TN_FORM_DEFINITIONS }
