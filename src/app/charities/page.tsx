'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Charity } from '@/lib/supabase/types'
import { useAuth } from '@/hooks/useAuth'
import { trackEvent } from '@/lib/events'
import Link from 'next/link'

export default function CharitiesPage() {
  const { user } = useAuth()
  const [charities, setCharities] = useState<Charity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchCharities() {
      const { data, error} = await supabase
        .from('charities')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching charities:', error)
      } else {
        setCharities((data || []) as Charity[])
      }
      setLoading(false)
    }

    fetchCharities()

    // Track charities list viewed event
    trackEvent(user?.id || null, 'charities_list_viewed')
  }, [user, supabase])

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
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-4" style={{ color: '#0B1F3A' }}>
            Charities
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Browse verified organizations and support causes you care about.
          </p>
        </div>

        {/* Charities List */}
        {charities.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
            <p className="text-slate-600 mb-2">No charities available yet</p>
            <p className="text-sm text-slate-500">
              Check back soon as organizations join our platform
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {charities.map((charity) => (
              <Link
                key={charity.charity_id}
                href={`/charities/${charity.charity_id}`}
                className="block bg-white border border-slate-200 rounded-lg p-8 hover:border-slate-300 transition-colors"
              >
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B1F3A' }}>
                  {charity.public_name}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4 line-clamp-2">
                  {charity.description}
                </p>
                {charity.website && (
                  <div className="text-sm text-slate-500">
                    {charity.website}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
