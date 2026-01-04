'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Charity } from '@/lib/supabase/types'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { getFirstName } from '@/lib/utils/names'
import { trackEvent } from '@/lib/events'

export default function CharitiesPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const [charities, setCharities] = useState<Charity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchCharities() {
      setLoading(true)

      const { data, error } = await supabase
        .from('charities')
        .select('charity_id, public_name, description, website, status, created_at, photo_url')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      console.log('CHARITIES DEBUG', { data, error })

      if (!cancelled) {
        if (error) {
          console.error('Error fetching charities:', error)
          setCharities([])
        } else {
          setCharities((data || []) as Charity[])
        }
        setLoading(false)
      }
    }

    fetchCharities()

    // Optional tracking
    trackEvent(user?.id || null, 'charities_list_viewed')

    return () => {
      cancelled = true
    }
  }, [user?.id]) // keep deps simple

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        {user && (
          <div className="mb-8">
            <h2 className="text-2xl font-medium text-slate-700">
              Welcome back, {getFirstName(profile)}
            </h2>
          </div>
        )}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-4" style={{ color: '#0B1F3A' }}>
            Charities
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Browse verified organizations and support causes you care about.
          </p>
        </div>

        {charities.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
            <p className="text-slate-600 mb-2">No charities available yet</p>
            <p className="text-sm text-slate-500">Check back soon as organizations join our platform</p>
          </div>
        ) : (
          <div className="space-y-4">
            {charities.map((charity) => (
              <Link
                key={charity.charity_id}
                href={`/charities/${charity.charity_id}`}
                className="block bg-white border border-slate-200 rounded-lg p-8 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-6">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    {charity.photo_url ? (
                      <img
                        src={charity.photo_url}
                        alt={`${charity.public_name} logo`}
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B1F3A' }}>
                      {charity.public_name}
                    </h3>

                    {charity.description && (
                      <p className="text-slate-600 leading-relaxed mb-4 line-clamp-2">
                        {charity.description}
                      </p>
                    )}

                    {charity.website && <div className="text-sm text-slate-500">{charity.website}</div>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}