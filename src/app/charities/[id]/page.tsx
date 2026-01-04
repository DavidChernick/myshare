'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Charity } from '@/lib/supabase/types'
import { useAuth } from '@/hooks/useAuth'
import { trackEvent } from '@/lib/events'
import { DonationForm } from './DonationForm'

export default function CharityDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { user } = useAuth()
  const [charity, setCharity] = useState<Charity | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchCharity() {
      const { data, error } = await supabase
        .from('charities')
        .select('*')
        .eq('charity_id', params.id)
        .eq('status', 'approved')
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setCharity(data as Charity)
        // Track charity viewed event
        trackEvent(user?.id || null, 'charity_viewed', { charity_id: params.id })
      }
      setLoading(false)
    }

    fetchCharity()
  }, [params.id, user, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  if (notFound || !charity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Charity not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Charity Info */}
          <div>
            <h1 className="text-4xl font-semibold tracking-tight mb-6" style={{ color: '#0B1F3A' }}>
              {charity.public_name}
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed whitespace-pre-wrap">
              {charity.description}
            </p>
            {charity.website && (
              <div className="text-sm">
                <span className="text-slate-500">Website: </span>
                <a
                  href={charity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 hover:underline"
                >
                  {charity.website}
                </a>
              </div>
            )}
          </div>

          {/* Donation Form */}
          <DonationForm charityId={charity.charity_id} charityName={charity.public_name} />
        </div>
      </div>
    </div>
  )
}
