'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Car } from 'lucide-react'

/**
 * /book/[slug] — resolves school slug to school_id, then redirects to
 * the main booking flow with the school_id pre-loaded.
 *
 * Simple v1: the redirect URL keeps the booking flow DRY.
 * Future: inline the full booking flow for URL cleanliness.
 */
export default function BookWithSlugPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return

    async function resolve() {
      try {
        const res = await fetch(`/api/schools/lookup?slug=${encodeURIComponent(slug)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error ?? 'School not found')
          setLoading(false)
          return
        }
        const school = await res.json()
        // Redirect to the main booking page with the resolved school_id
        router.replace(`/book?school=${school.id}`)
      } catch {
        setError('Failed to load school')
        setLoading(false)
      }
    }

    resolve()
  }, [slug, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D12', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.06) 0%, transparent 60%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
            <Car className="w-8 h-8" style={{ color: '#4ADE80' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>School not found</h1>
          <p className="text-sm" style={{ color: '#94A3B8' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D12', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.06) 0%, transparent 60%)' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(74,222,128,0.3)', borderTopColor: 'transparent' }} />
        <p style={{ color: '#94A3B8' }}>Loading school...</p>
      </div>
    </div>
  )
}
