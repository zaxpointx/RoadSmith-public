/**
 * Travel model. Driving lessons are not haircuts: the instructor has to get
 * from one pickup to the next. Without a maps provider, Roadsmith estimates
 * drive time from straight-line distance with a road factor, and treats any
 * location it cannot place with a deliberately conservative fixed buffer.
 */
import type { Playbook } from './playbook.ts'
import type { School } from './school.ts'

export type Point = { lat: number; lng: number } | null
export type Located = { lat: number | null; lng: number | null; quality: 'exact' | 'approximate' | 'unknown'; zone?: string; outOfArea?: boolean }

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Minutes to drive from a to b, rounded up to 5. Unknown endpoints get the conservative buffer. */
export function travelMinutes(a: Point, b: Point, pb: Playbook): number {
  const t = pb.travel
  if (!a || !b) return t.unknown_location_min
  const km = haversineKm(a, b) * t.road_factor
  if (km < 0.2) return 0
  const raw = (km / t.avg_speed_kmh) * 60 + t.buffer_min
  return Math.ceil(raw / 5) * 5
}

/**
 * Place an address without an external geocoder: match the ZIP code against
 * the school's service zones. The result is "approximate" (zone centre); an
 * unknown ZIP is flagged so scheduling uses the conservative buffer.
 */
export function locateAddress(address: string, school: School): Located {
  const zips = address.match(/\b\d{5}\b/g) ?? []
  const zones = school.playbook.service_area.zones
  for (const zip of zips.reverse()) {
    const z = zones.find((zz) => zz.zips.includes(zip))
    if (z) return { lat: z.lat, lng: z.lng, quality: 'approximate', zone: z.name }
  }
  const lower = address.toLowerCase()
  const byName = zones.find((z) => lower.includes(z.name.toLowerCase()))
  if (byName) return { lat: byName.lat, lng: byName.lng, quality: 'approximate', zone: byName.name }
  return { lat: null, lng: null, quality: 'unknown', outOfArea: zips.length > 0 && zones.length > 0 }
}

export function toPoint(lat: unknown, lng: unknown): Point {
  return lat == null || lng == null ? null : { lat: Number(lat), lng: Number(lng) }
}
