'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import Link from 'next/link'

interface DonationWithCharity {
  donation_id: string
  amount_cents: number
  message: string | null
  donated_at: string
  charity: {
    charity_id: string
    public_name: string
  }
}

function DonorDashboardContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const [donations, setDonations] = useState<DonationWithCharity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchDonations() {
      const { data, error } = await supabase
        .from('donations')
        .select(
          `
          donation_id,
          amount_cents,
          message,
          donated_at,
          charities (
            charity_id,
            public_name
          )
        `
        )
        .eq('donor_user_id', user.id)
        .order('donated_at', { ascending: false })

      if (error) {
        console.error('Error fetching donations:', error)
      } else {
        // Transform the data to match our interface
        const transformedData = (data || []).map((donation: any) => ({
          donation_id: donation.donation_id,
          amount_cents: donation.amount_cents,
          message: donation.message,
          donated_at: donation.donated_at,
          charity: {
            charity_id: donation.charities.charity_id,
            public_name: donation.charities.public_name,
          },
        }))
        setDonations(transformedData)
      }

      setLoading(false)
    }

    fetchDonations()
  }, [user, supabase])

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: '#0B1F3A' }}>
            Your donations
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Track your giving history
          </p>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
            <div className="text-slate-600">Loading...</div>
          </div>
        ) : donations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-16">
            <p className="text-slate-600 mb-6 leading-relaxed">
              You haven't made any donations yet.
            </p>
            <Link
              href="/charities"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white rounded-lg"
              style={{ backgroundColor: '#16A34A' }}
            >
              Browse charities
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {donations.map((donation) => (
              <div key={donation.donation_id} className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/charities/${donation.charity.charity_id}`}
                    className="text-lg font-semibold hover:underline"
                    style={{ color: '#0B1F3A' }}
                  >
                    {donation.charity.public_name}
                  </Link>
                  <div className="text-lg font-semibold" style={{ color: '#0B1F3A' }}>
                    ${formatAmount(donation.amount_cents)}
                  </div>
                </div>
                {donation.message && (
                  <p className="text-slate-600 mb-2 leading-relaxed">
                    {donation.message}
                  </p>
                )}
                <div className="text-sm text-slate-500">
                  {formatDate(donation.donated_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DonorDashboardPage() {
  return (
    <AuthGuard>
      <DonorDashboardContent />
    </AuthGuard>
  )
}
