'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'
import { getFirstName } from '@/lib/utils/names'
import { formatAmount as formatCurrency } from '@/lib/utils/currency'
import Link from 'next/link'

interface DonationWithCharity {
  donation_id: string
  amount_cents: number
  currency: string
  message: string | null
  donated_at: string
  charity: {
    charity_id: string
    public_name: string
    photo_url: string | null
  }
}

function DonorDashboardContent() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
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
          currency,
          message,
          donated_at,
          charities (
            charity_id,
            public_name,
            photo_url
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
          currency: donation.currency || 'USD',
          message: donation.message,
          donated_at: donation.donated_at,
          charity: {
            charity_id: donation.charities.charity_id,
            public_name: donation.charities.public_name,
            photo_url: donation.charities.photo_url,
          },
        }))
        setDonations(transformedData)
      }

      setLoading(false)
    }

    fetchDonations()
  }, [user, supabase])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Calculate analytics
  const totalDonated = donations.reduce((sum, d) => sum + d.amount_cents, 0)
  const donationsCount = donations.length

  // Get unique charities
  const uniqueCharities = new Set(donations.map(d => d.charity.charity_id)).size

  // Top charities by amount
  const charityTotals: Record<string, { name: string; amount: number }> = {}
  donations.forEach((d) => {
    const charityId = d.charity.charity_id
    if (!charityTotals[charityId]) {
      charityTotals[charityId] = {
        name: d.charity.public_name,
        amount: 0,
      }
    }
    charityTotals[charityId].amount += d.amount_cents
  })

  const topCharities = Object.values(charityTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const maxCharityAmount = topCharities[0]?.amount || 1

  // Donations by month (last 6 months)
  const monthlyTotals: Record<string, number> = {}
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  donations.forEach((d) => {
    const date = new Date(d.donated_at)
    if (date >= sixMonthsAgo) {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + d.amount_cents
    }
  })

  // Generate last 6 months array
  const monthsData: { month: string; label: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short' })
    monthsData.push({
      month: monthKey,
      label: monthLabel,
      amount: monthlyTotals[monthKey] || 0,
    })
  }

  const maxMonthlyAmount = Math.max(...monthsData.map(m => m.amount), 1)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        <div className="mb-12">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-4xl font-semibold tracking-tight" style={{ color: '#0B1F3A' }}>
              Welcome back, {getFirstName(profile)}
            </h1>
            <Link
              href="/dashboard/donor/settings"
              className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              style={{ color: '#0B1F3A' }}
            >
              Settings
            </Link>
          </div>
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
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border border-slate-200 rounded-lg p-8">
                <div className="text-sm text-slate-600 mb-2">Total Donated</div>
                <div className="text-4xl font-semibold tracking-tight" style={{ color: '#16A34A' }}>
                  {formatCurrency(totalDonated, donations[0]?.currency || 'USD')}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-8">
                <div className="text-sm text-slate-600 mb-2">Donations</div>
                <div className="text-4xl font-semibold tracking-tight" style={{ color: '#0B1F3A' }}>
                  {donationsCount}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-8">
                <div className="text-sm text-slate-600 mb-2">Charities Supported</div>
                <div className="text-4xl font-semibold tracking-tight" style={{ color: '#0B1F3A' }}>
                  {uniqueCharities}
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Donations by Month */}
              <div className="bg-white border border-slate-200 rounded-lg p-8">
                <h2 className="text-lg font-semibold mb-6" style={{ color: '#0B1F3A' }}>
                  Donations by Month
                </h2>
                <div className="space-y-4">
                  {monthsData.map(({ month, label, amount }) => (
                    <div key={month} className="flex items-center gap-3">
                      <div className="w-12 text-sm text-slate-600 font-medium">{label}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(amount / maxMonthlyAmount) * 100}%`,
                            backgroundColor: '#16A34A',
                          }}
                        />
                      </div>
                      <div className="w-20 text-sm font-medium text-right" style={{ color: '#0B1F3A' }}>
                        {formatCurrency(amount, donations[0]?.currency || 'USD')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Charities by Amount */}
              <div className="bg-white border border-slate-200 rounded-lg p-8">
                <h2 className="text-lg font-semibold mb-6" style={{ color: '#0B1F3A' }}>
                  Top Charities
                </h2>
                <div className="space-y-4">
                  {topCharities.length === 0 ? (
                    <p className="text-slate-600 text-sm">No donations yet</p>
                  ) : (
                    topCharities.map((charity, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: '#0B1F3A' }}>
                            {charity.name}
                          </div>
                          <div className="bg-slate-100 rounded-full h-6 mt-1 relative overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(charity.amount / maxCharityAmount) * 100}%`,
                                backgroundColor: '#16A34A',
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-sm font-medium text-right" style={{ color: '#0B1F3A' }}>
                          {formatCurrency(charity.amount, donations[0]?.currency || 'USD')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Donation History */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4" style={{ color: '#0B1F3A' }}>
                Donation History
              </h2>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
              {donations.map((donation) => (
                <div key={donation.donation_id} className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Charity Logo */}
                    {donation.charity.photo_url ? (
                      <img
                        src={donation.charity.photo_url}
                        alt={`${donation.charity.public_name} logo`}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-slate-400"
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

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          href={`/charities/${donation.charity.charity_id}`}
                          className="text-lg font-semibold hover:underline"
                          style={{ color: '#0B1F3A' }}
                        >
                          {donation.charity.public_name}
                        </Link>
                        <div className="text-lg font-semibold ml-4 flex-shrink-0" style={{ color: '#0B1F3A' }}>
                          {formatCurrency(donation.amount_cents, donation.currency)}
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
                  </div>
                </div>
              ))}
            </div>
          </>
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
