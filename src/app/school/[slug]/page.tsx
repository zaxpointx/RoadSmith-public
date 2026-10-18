'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Car, Clock, Phone, MapPin, Mail, Star, BookOpen, ArrowRight } from 'lucide-react'

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}m`
}

function iconForName(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('road test')) return <Car className="w-5 h-5" />
  if (lower.includes('traffic')) return <Car className="w-5 h-5" />
  return <BookOpen className="w-5 h-5" />
}

type PublicSchoolData = {
  school: { name: string; state: string; phone: string | null }
  profile?: { tagline?: string | null; city?: string | null; state?: string | null; about?: string | null; address?: string | null; zip?: string | null; email?: string | null }
  session_types?: Array<{ id: string; name: string; description?: string | null; duration_minutes: number; price_cents: number; deposit_cents: number; tca_hours_credit?: number | null; color?: string | null }>
}

// Star rating display
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 star-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className="w-4 h-4" fill={i <= Math.round(rating) ? 'var(--accent-secondary)' : 'none'} stroke={i <= Math.round(rating) ? 'var(--accent-secondary)' : 'var(--text-muted)'} />
      ))}
      <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-primary)' }}>{rating.toFixed(1)}</span>
    </div>
  )
}

export default function SchoolPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg-base)' }} />}>
      <SchoolContent />
    </Suspense>
  )
}

function SchoolContent() {
  const params = useSearchParams()
  const slug = params.get('slug') ?? params.get('school')
  const [school, setSchool] = useState<PublicSchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    async function load() {
      try {
        const res = await fetch(`/api/schools/${slug}`)
        if (!res.ok) throw new Error('School not found')
        const data = await res.json()
        setSchool(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'School not found')
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (!slug) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-surface)', backgroundImage: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--success), transparent 94%) 0%, transparent 60%)' }}>
        <div className="bg-circle w-96 h-96 -top-20 -left-20" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--success), transparent 90%) 0%, transparent 70%)' }} />
        <div className="bg-circle w-64 h-64 bottom-20 -right-10" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--admin-accent-secondary), transparent 80%) 0%, transparent 70%)' }} />
        <div className="text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'color-mix(in srgb, var(--status-blue), transparent 88%)', border: '1px solid color-mix(in srgb, var(--status-blue), transparent 70%)' }}>
            <Car className="w-8 h-8" style={{ color: 'var(--status-blue)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>School not found</h1>
          <p style={{ color: 'var(--text-secondary)' }}>No school with that URL exists.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-surface)', backgroundImage: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--success), transparent 94%) 0%, transparent 60%)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: 'color-mix(in srgb, var(--success), transparent 70%)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading school...</p>
        </div>
      </div>
    )
  }

  if (error || !school) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-surface)', backgroundImage: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--success), transparent 94%) 0%, transparent 60%)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>School not found</h1>
          <p style={{ color: 'var(--text-secondary)' }}>This school doesn&apos;t exist or their page is not set up yet.</p>
        </div>
      </div>
    )
  }

  // Instructors — pulled from seeded data (synthetic demo identities)
  const instructors = [
    { name: 'Demo Instructor A', initials: 'DA', sessions: 412, rating: 4.9 },
    { name: 'Jim Woofter', initials: 'JW', sessions: 287, rating: 4.8 },
  ]
  const reviews = [
    { name: 'Demo Reviewer', text: 'Absolutely the best driving school. The instructor was patient and thorough.', rating: 5 },
    { name: 'Priya K.', text: 'Passed my road test on the first try. Highly recommend!', rating: 5 },
    { name: 'Diego R.', text: 'Great experience from booking to completion. Very professional.', rating: 4 },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-surface)', backgroundImage: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--success), transparent 94%) 0%, transparent 60%)', color: 'var(--text-primary)' }}>
      {/* Background decorative circles */}
      <div className="bg-circle w-[600px] h-[600px] -top-48 -left-48" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--success), transparent 92%) 0%, transparent 70%)' }} />
      <div className="bg-circle w-[400px] h-[400px] top-80 -right-32" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--success), transparent 95%) 0%, transparent 70%)' }} />

      {/* Hero Header */}
      <div className="relative z-10 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-center">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, var(--success), #22C55E)' }}>
            <span className="text-white font-bold text-xl">DC</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: 'var(--text-primary)' }}>{school.school.name}</h1>
          {school.profile?.tagline && (
            <p className="text-base mb-4" style={{ color: 'var(--text-secondary)' }}>{school.profile.tagline}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
            {school.profile?.city && (
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <MapPin className="w-3.5 h-3.5" />{school.profile.city}, {school.school.state}
              </span>
            )}
            {school.school.phone && (
              <a href={`tel:${school.school.phone}`} className="flex items-center gap-1.5 transition-colors hover:text-white action-link" style={{ color: 'var(--success)' }}>
                <Phone className="w-3.5 h-3.5" />{school.school.phone}
              </a>
            )}
          </div>
          {/* CTA pill */}
          <div className="mt-6">
            <Link href={`/book?school=${slug}`}
              className="btn-glow inline-flex items-center gap-2 px-8 py-4 text-base">
              Book a Lesson <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 relative z-10 space-y-10">

        {/* About */}
        {school.profile?.about && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, var(--success), #22C55E)' }} />
              About Us
            </h2>
            <div className="glass-card">
              <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{school.profile.about}</p>
            </div>
          </section>
        )}

        {/* Lesson Types */}
        {school.session_types && school.session_types.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, var(--success), #22C55E)' }} />
              Lessons & Services
            </h2>
            <div className="space-y-3 book-service-list">
              {school.session_types.map((type) => (
                <div key={type.id} className="glass-card">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--success), transparent 90%)', color: 'var(--success)' }}>
                      {iconForName(type.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{type.name}</span>
                          {type.tca_hours_credit && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--success), transparent 88%)', color: 'var(--success)', border: '1px solid color-mix(in srgb, var(--success), transparent 80%)' }}>
                              {type.tca_hours_credit}h TCA credit
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{formatPrice(type.price_cents)}</div>
                          {type.deposit_cents > 0 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatPrice(type.deposit_cents)} deposit</div>}
                        </div>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{type.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Clock className="w-3.5 h-3.5" />{formatDuration(type.duration_minutes)}
                        </span>
                        <Link href={`/book?school=${slug}&type=${type.id}`}
                          className="btn-pill text-sm font-semibold px-6 py-3"
                          style={{ background: 'var(--success)', color: '#000000' }}>
                          Book Now →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Instructors */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, var(--success), #22C55E)' }} />
            Our Instructors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {instructors.map((inst) => (
              <div key={inst.name} className="glass-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--success), #22C55E)', color: 'var(--text-primary)' }}>
                  {inst.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{inst.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={inst.rating} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{inst.sessions} sessions</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews / Testimonials */}
        {reviews.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, var(--success), #22C55E)' }} />
              What Students Say
            </h2>
            <div className="space-y-3">
              {reviews.map((review, i: number) => (
                <div key={i} className="glass-card" style={{ padding: '20px' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--success), transparent 88%)', color: 'var(--success)', border: '1px solid color-mix(in srgb, var(--success), transparent 80%)' }}>
                      {review.name.split(' ')[0][0]}{review.name.split(' ')[1]?.[0] ?? ''}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{review.name}</span>
                        <div className="flex items-center gap-0.5 star-rating">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className="w-3 h-3" fill={s <= review.rating ? 'var(--accent-secondary)' : 'none'} stroke={s <= review.rating ? 'var(--accent-secondary)' : 'var(--text-muted)'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>&ldquo;{review.text}&rdquo;</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, var(--success), #22C55E)' }} />
            Contact Us
          </h2>
          <div className="glass-card">
            <div className="space-y-3.5">
              {school.profile?.address && (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} />
                  <span>{school.profile.address}, {school.profile.city} {school.profile.zip}</span>
                </div>
              )}
              {school.profile?.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.profile.address + ' ' + school.profile.city + ' ' + (school.profile.state || 'TN') + ' ' + (school.profile.zip || ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-white transition-colors action-link"
                  style={{ color: 'var(--success)', textDecoration: 'none' }}
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>View on Google Maps →</span>
                </a>
              )}
              {school.school.phone && (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} />
                  <a href={`tel:${school.school.phone}`} className="hover:text-white transition-colors action-link" style={{ color: 'var(--status-blue)' }}>{school.school.phone}</a>
                </div>
              )}
              {school.profile?.email && (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} />
                  <a href={`mailto:${school.profile.email}`} className="hover:text-white transition-colors action-link" style={{ color: 'var(--status-blue)' }}>{school.profile.email}</a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Book CTA */}
        <section className="text-center py-6">
          <div className="glass-card py-10">
            <div className="text-3xl mb-3">🚗</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Ready to get started?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Schedule your first lesson online in minutes.</p>
            <Link href={`/book?school=${slug}`}
              className="btn-glow inline-flex items-center gap-2 px-8 py-4 text-base">
              Book a Lesson <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm pt-6 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
          Powered by <span style={{ color: 'var(--success)' }}>Roadsmith</span>
        </footer>
      </div>

      <style>{`
        .btn-glow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, var(--success), #22C55E);
          color: #000000;
          font-weight: 700;
          font-size: 14px;
          border-radius: 999px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .btn-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(74,222,128,0.35);
        }
        @media (max-width: 640px) {
          .btn-glow { width: 100% !important; justify-content: center !important; }
          .glass-card { padding: 24px 20px !important; }
        }
        .glass-card {
          background: var(--glass-bg, rgba(255,255,255,0.03));
          backdrop-filter: var(--glass-blur, blur(24px));
          -webkit-backdrop-filter: var(--glass-blur, blur(24px));
          border: 1px solid var(--glass-border, rgba(255,255,255,0.06));
          border-radius: 24px;
          padding: 24px;
          box-shadow: var(--glass-shadow, 0 4px 24px rgba(0,0,0,0.4));
        }
      `}</style>
    </div>
  )
}
