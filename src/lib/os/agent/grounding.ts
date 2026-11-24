/**
 * Grounding check: before a model-written text goes to a customer, every
 * clock time, dollar amount and link in it must appear in the evidence the
 * model was given this turn (tool results, the school playbook, the
 * conversation context). This is what stops an agent from "inventing"
 * availability, prices or payment links even if the prompt is ignored.
 */

function normTime(h: string, m: string | undefined, ap: string): string {
  return `${Number(h)}:${m ?? '00'} ${ap.replace(/\./g, '').toUpperCase()}`
}

const TIME_RE = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s?(a\.?m\.?|p\.?m\.?)(?![a-z])/gi
const MONEY_RE = /\$\s?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?/g
const URL_RE = /https?:\/\/[^\s)"'<>]+/g

export function extractTimes(text: string): string[] {
  return [...text.matchAll(TIME_RE)].map((m) => normTime(m[1], m[2], m[3]))
}

export function extractMoney(text: string): number[] {
  return [...text.matchAll(MONEY_RE)].map((m) => Number(m[1].replace(/,/g, '')) * 100 + Number(m[2] ?? 0))
}

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:!?]+$/, ''))
}

/** Times from evidence also count in 24h form ("15:30" -> "3:30 PM"). */
function evidenceTimes(evidence: string): Set<string> {
  const out = new Set(extractTimes(evidence))
  for (const m of evidence.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)) {
    const h = Number(m[1])
    out.add(`${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`)
  }
  return out
}

export interface GroundingResult { ok: boolean; issues: string[] }

export function checkGrounding(reply: string, evidence: string): GroundingResult {
  const issues: string[] = []
  const times = evidenceTimes(evidence)
  for (const t of extractTimes(reply)) if (!times.has(t)) issues.push(`time "${t}"`)
  const money = new Set(extractMoney(evidence))
  for (const c of extractMoney(reply)) if (!money.has(c)) issues.push(`amount $${(c / 100).toFixed(2)}`)
  const urls = extractUrls(evidence)
  for (const u of extractUrls(reply)) if (!urls.some((e) => e === u || e.startsWith(u))) issues.push(`link ${u}`)
  return { ok: issues.length === 0, issues: [...new Set(issues)] }
}
