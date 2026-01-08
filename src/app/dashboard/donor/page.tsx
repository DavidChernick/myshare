'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'
import { ProfileForm } from '@/components/ProfileForm'
import { getFirstName } from '@/lib/utils/names'
import { formatAmount as formatCurrency } from '@/lib/utils/currency'
import { TaxCertificate } from '@/lib/supabase/types'
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

interface CertificateWithCharity extends TaxCertificate {
  charity: {
    public_name: string
    photo_url: string | null
  }
}

type Tab = 'overview' | 'donations' | 'certificates' | 'profile'

function DonorDashboardContent() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [donations, setDonations] = useState<DonationWithCharity[]>([])
  const [certificates, setCertificates] = useState<CertificateWithCharity[]>([])
  const [loading, setLoading] = useState(true)
  const [certificatesLoading, setCertificatesLoading] = useState(false)

  // Filter state for Donations tab
  const [filterCharity, setFilterCharity] = useState('')
  const [filterYear, setFilterYear] = useState('')

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

  // Fetch certificates when tab is active
  useEffect(() => {
    if (activeTab === 'certificates' && user && certificates.length === 0) {
      fetchCertificates()
    }
  }, [activeTab, user])

  async function fetchCertificates() {
    if (!user) return

    setCertificatesLoading(true)

    const { data, error } = await supabase
      .from('tax_certificates')
      .select(
        `
        *,
        charities (
          public_name,
          photo_url
        )
      `
      )
      .eq('donor_user_id', user.id)
      .order('tax_year', { ascending: false })

    if (error) {
      console.error('Error fetching certificates:', error)
    } else {
      const transformed = (data || []).map((cert: any) => ({
        ...cert,
        charity: {
          public_name: cert.charities.public_name,
          photo_url: cert.charities.photo_url,
        },
      }))
      setCertificates(transformed)
    }

    setCertificatesLoading(false)
  }

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
  const uniqueCharities = new Set(donations.map(d => d.charity.charity_id)).size

  // SA Tax year total (March 1 - Feb end)
  function getTaxYearDonations() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    let startDate, endDate
    if (month < 3) {
      startDate = new Date(year - 1, 2, 1)
      endDate = new Date(year, 1, 29)
    } else {
      startDate = new Date(year, 2, 1)
      endDate = new Date(year + 1, 1, 29)
    }

    return donations.filter(d => {
      const donatedDate = new Date(d.donated_at)
      return donatedDate >= startDate && donatedDate <= endDate
    })
  }

  const taxYearDonations = getTaxYearDonations()
  const taxYearTotal = taxYearDonations.reduce((sum, d) => sum + d.amount_cents, 0)

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

  // Filtering for Donations tab
  const uniqueCharityOptions = Array.from(new Set(donations.map(d => d.charity.charity_id)))
    .map(id => {
      const donation = donations.find(d => d.charity.charity_id === id)
      return { id, name: donation?.charity.public_name || '' }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const uniqueYears = Array.from(new Set(donations.map(d => new Date(d.donated_at).getFullYear())))
    .sort((a, b) => b - a)

  const filteredDonations = donations.filter(d => {
    if (filterCharity && d.charity.charity_id !== filterCharity) return false
    if (filterYear && new Date(d.donated_at).getFullYear().toString() !== filterYear) return false
    return true
  })

  // CSV Export
  function exportToCSV() {
    const headers = 'Date,Charity,Amount,Currency,Message\n'
    const rows = filteredDonations.map(d =>
      `${formatDate(d.donated_at)},"${d.charity.public_name}",${formatCurrency(d.amount_cents, d.currency)},${d.currency},"${(d.message || '').replace(/"/g, '""')}"`
    ).join('\n')

    const csvContent = headers + rows
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `donations-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'donations' as Tab, label: 'Donations' },
    { id: 'certificates' as Tab, label: 'Tax Certificates' },
    { id: 'profile' as Tab, label: 'Profile' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: '#0B1F3A' }}>
            Welcome back, {getFirstName(profile)}
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Manage your donations and tax information
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
                style={activeTab === tab.id ? { color: '#0B1F3A' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
            <div className="text-slate-600">Loading...</div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white border border-slate-200 rounded-lg p-8">
                    <div className="text-sm text-slate-600 mb-2">Total Donated</div>
                    <div className="text-3xl font-semibold tracking-tight" style={{ color: '#16A34A' }}>
                      {formatCurrency(totalDonated, donations[0]?.currency || 'USD')}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-8">
                    <div className="text-sm text-slate-600 mb-2">Tax Year Total</div>
                    <div className="text-3xl font-semibold tracking-tight" style={{ color: '#16A34A' }}>
                      {formatCurrency(taxYearTotal, donations[0]?.currency || 'USD')}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-8">
                    <div className="text-sm text-slate-600 mb-2">Donations</div>
                    <div className="text-3xl font-semibold tracking-tight" style={{ color: '#0B1F3A' }}>
                      {donationsCount}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-8">
                    <div className="text-sm text-slate-600 mb-2">Charities Supported</div>
                    <div className="text-3xl font-semibold tracking-tight" style={{ color: '#0B1F3A' }}>
                      {uniqueCharities}
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                  {/* Top Charities */}
                  <div className="bg-white border border-slate-200 rounded-lg p-8">
                    <h2 className="text-lg font-semibold mb-6" style={{ color: '#0B1F3A' }}>
                      Top Charities
                    </h2>
                    <div className="space-y-4">
                      {topCharities.length === 0 ? (
                        <p className="text-slate-600 text-sm">No donations yet</p>
                      ) : (
                        topCharities.map((charity, index) => {
                          // Different shades of green for each charity
                          const greenShades = ['#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0']
                          const barColor = greenShades[index % greenShades.length]

                          return (
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
                                      backgroundColor: barColor,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="w-20 text-sm font-medium text-right" style={{ color: '#0B1F3A' }}>
                                {formatCurrency(charity.amount, donations[0]?.currency || 'USD')}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Donations */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4" style={{ color: '#0B1F3A' }}>
                    Recent Donations
                  </h2>
                  {donations.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
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
                      {donations.slice(0, 5).map((donation) => (
                        <div key={donation.donation_id} className="p-6">
                          <div className="flex items-start gap-4">
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
                  )}
                </div>
              </div>
            )}

            {/* Donations Tab */}
            {activeTab === 'donations' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium mb-2" style={{ color: '#0B1F3A' }}>
                        Filter by Charity
                      </label>
                      <select
                        value={filterCharity}
                        onChange={(e) => setFilterCharity(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                      >
                        <option value="">All Charities</option>
                        {uniqueCharityOptions.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium mb-2" style={{ color: '#0B1F3A' }}>
                        Filter by Year
                      </label>
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                      >
                        <option value="">All Years</option>
                        {uniqueYears.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setFilterCharity('')
                        setFilterYear('')
                      }}
                      className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
                      style={{ color: '#0B1F3A' }}
                    >
                      Clear Filters
                    </button>

                    <button
                      onClick={exportToCSV}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                      style={{ backgroundColor: '#16A34A' }}
                    >
                      Export CSV
                    </button>
                  </div>

                  <div className="mt-4 text-sm text-slate-600">
                    Showing {filteredDonations.length} of {donations.length} donations
                  </div>
                </div>

                {/* Donations List */}
                {filteredDonations.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
                    <p className="text-slate-600">No donations match your filters</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                    {filteredDonations.map((donation) => (
                      <div key={donation.donation_id} className="p-6">
                        <div className="flex items-start gap-4">
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
                )}
              </div>
            )}

            {/* Tax Certificates Tab */}
            {activeTab === 'certificates' && (
              <div>
                {certificatesLoading ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
                    <div className="text-slate-600">Loading certificates...</div>
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
                    <h3 className="text-xl font-semibold mb-4" style={{ color: '#0B1F3A' }}>
                      No tax certificates available yet
                    </h3>
                    <p className="text-slate-600 leading-relaxed max-w-md mx-auto">
                      Tax certificates (Section 18A) are issued annually for eligible donations to registered charities.
                      They will appear here once processed by the charities you've supported.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certificates.map((cert) => (
                      <div key={cert.certificate_id} className="bg-white border border-slate-200 rounded-lg p-6">
                        <div className="flex items-start gap-6">
                          {/* Charity Logo */}
                          {cert.charity.photo_url ? (
                            <img
                              src={cert.charity.photo_url}
                              alt={`${cert.charity.public_name} logo`}
                              className="w-16 h-16 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
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

                          {/* Certificate Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold" style={{ color: '#0B1F3A' }}>
                                  {cert.charity.public_name}
                                </h3>
                                <p className="text-sm text-slate-600">Tax Year: {cert.tax_year}</p>
                              </div>
                              <span
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: cert.status === 'available' ? '#D1FAE5' : '#FEF3C7',
                                  color: cert.status === 'available' ? '#065F46' : '#92400E',
                                }}
                              >
                                {cert.status === 'available' ? 'Available' : 'Pending'}
                              </span>
                            </div>
                            <div className="text-2xl font-semibold mb-4" style={{ color: '#16A34A' }}>
                              {formatCurrency(cert.total_amount_cents, cert.currency)}
                            </div>
                            {cert.status === 'available' && cert.certificate_url && (
                              <button
                                onClick={() => window.open(cert.certificate_url!, '_blank')}
                                className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                                style={{ backgroundColor: '#0B1F3A' }}
                              >
                                Download Certificate
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && user && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-2" style={{ color: '#0B1F3A' }}>
                    Profile & Tax Details
                  </h2>
                  <p className="text-slate-600">
                    Update your personal information and tax details for certificate purposes
                  </p>
                </div>
                <ProfileForm userId={user.id} profile={profile} />
              </div>
            )}
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
