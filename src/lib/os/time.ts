/** Time-zone helpers. All instants are stored in UTC; schools think in local time. */

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number }
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const fmtCache = new Map<string, Intl.DateTimeFormat>()

function partsFmt(tz: string) {
  let f = fmtCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short',
    })
    fmtCache.set(tz, f)
  }
  return f
}

export function zonedParts(d: Date, tz: string): Parts {
  const p: Record<string, string> = {}
  for (const x of partsFmt(tz).formatToParts(d)) p[x.type] = x.value
  return {
    year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute, weekday: WD[p.weekday] ?? 0,
  }
}

/** Convert a wall-clock time in `tz` to a UTC instant (handles DST). */
export function zonedToUtc(dateStr: string, minutesAfterMidnight: number, tz: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, 0, minutesAfterMidnight)
  let ts = guess
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(ts), tz)
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    ts = ts - (asUtc - guess)
  }
  return new Date(ts)
}

export function localDate(d: Date, tz: string): string {
  const p = zonedParts(d, tz)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function localMinutes(d: Date, tz: string): number {
  const p = zonedParts(d, tz)
  return p.hour * 60 + p.minute
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}

export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** "3:30 PM" */
export function fmtTime(d: Date, tz: string): string {
  return d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
}

/** "Tue, Nov 25" */
export function fmtDay(d: Date, tz: string): string {
  return d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Tue, Nov 25 at 3:30 PM" */
export function fmtWhen(d: Date, tz: string): string {
  return `${fmtDay(d, tz)} at ${fmtTime(d, tz)}`
}

export function fmtDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
}

export function fmtMoney(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100)
}

export function minutesLabel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

export function asDate(v: unknown): Date {
  return v instanceof Date ? v : new Date(String(v))
}

/** Date column → 'YYYY-MM-DD' regardless of driver representation. */
export function asDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}
