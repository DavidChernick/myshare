'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import { Charity } from '@/lib/supabase/types'
import { trackEvent } from '@/lib/events'

interface DonationWithDonor {
  donation_id: string
  amount_cents: number
  message: string | null
  donated_at: string
  donor: {
    full_name: string
  }
}

function CharityDashboardContent() {
  const { user } = useAuth()
  const supabase = createClient()

  const [charity, setCharity] = useState<Charity | null>(null)
  const [donations, setDonations] = useState<DonationWithDonor[]>([])
  const [loading, setLoading] = useState(true)

  // Form state for creating charity
  const [charityName, setCharityName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!user) return

    async function fetchCharityAndDonations() {
      // Fetch charity owned by this user via charity_users junction table
      const { data: charityUserData, error: charityUserError } = await supabase
        .from('charity_users')
        .select('charity_id, charities(*)')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .single()

      if (charityUserError && charityUserError.code !== 'PGRST116') {
        console.error('Error fetching charity:', charityUserError)
      } else if (charityUserData && charityUserData.charities) {
        const charityData = charityUserData.charities as Charity
        setCharity(charityData)
        // Track charity dashboard viewed
        trackEvent(user.id, 'charity_dashboard_viewed', {
          charity_id: charityData.charity_id,
        })

        // Fetch donations for this charity
        const { data: donationsData, error: donationsError } = await supabase
          .from('donations')
          .select(
            `
            donation_id,
            amount_cents,
            message,
            donated_at,
            profiles!donations_donor_user_id_fkey (
              full_name
            )
          `
          )
          .eq('charity_id', charityData.charity_id)
          .order('donated_at', { ascending: false })

        if (donationsError) {
          console.error('Error fetching donations:', donationsError)
        } else {
          const transformedData = (donationsData || []).map((donation: any) => ({
            donation_id: donation.donation_id,
            amount_cents: donation.amount_cents,
            message: donation.message,
            donated_at: donation.donated_at,
            donor: {
              full_name: donation.profiles.full_name,
            },
          }))
          setDonations(transformedData)
        }
      }

      setLoading(false)
    }

    fetchCharityAndDonations()
  }, [user, supabase])

  const handleCreateCharity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setFormError('')
    setFormLoading(true)

    try {
      // Create charity
      const { data: charityData, error: charityError } = await supabase
        .from('charities')
        .insert({
          public_name: charityName,
          description,
          website: website || null,
          status: 'pending_review',
        })
        .select()
        .single()

      if (charityError) throw charityError

      // Link user to charity via charity_users
      const { error: linkError } = await supabase
        .from('charity_users')
        .insert({
          charity_id: charityData.charity_id,
          user_id: user.id,
          role: 'owner',
        })

      if (linkError) throw linkError

      // Track charity profile created
      await trackEvent(user.id, 'charity_profile_created', {
        charity_id: charityData.charity_id,
      })

      setCharity(charityData as Charity)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

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

  const totalDonations = donations.reduce(
    (sum, donation) => sum + donation.amount_cents,
    0
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  // No charity profile yet - show creation form
  if (!charity) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
          <div className="mb-12">
            <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: '#0B1F3A' }}>
              Create your charity profile
            </h1>
            <p className="text-slate-600 leading-relaxed">
              Set up your organization to start receiving donations.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-2xl">
            {formError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCharity} className="space-y-5">
              <div>
                <label
                  htmlFor="charityName"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#0B1F3A' }}
                >
                  Charity name
                </label>
                <input
                  id="charityName"
                  type="text"
                  value={charityName}
                  onChange={(e) => setCharityName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                  placeholder="Your organization name"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#0B1F3A' }}
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400 resize-none"
                  placeholder="Tell donors about your mission..."
                />
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#0B1F3A' }}
                >
                  Website (optional)
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                  placeholder="https://example.org"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full px-6 py-3 text-base font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#0B1F3A' }}
              >
                {formLoading ? 'Creating...' : 'Create profile'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Charity exists but not approved yet
  if (charity.status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
          <div className="bg-white border border-slate-200 rounded-lg p-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-semibold tracking-tight mb-4" style={{ color: '#0B1F3A' }}>
                Pending approval
              </h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Your charity profile for <strong>{charity.public_name}</strong> is under review. You'll be able to receive donations once approved.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-left">
                <h3 className="font-medium mb-3" style={{ color: '#0B1F3A' }}>Your profile</h3>
                <p className="text-slate-600 mb-4 leading-relaxed">{charity.description}</p>
                {charity.website && (
                  <p className="text-sm text-slate-500">{charity.website}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Charity is approved - show donations dashboard
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: '#0B1F3A' }}>
            {charity.public_name}
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Donations received
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-lg p-8">
            <div className="text-sm text-slate-600 mb-2">Total donations</div>
            <div className="text-4xl font-semibold tracking-tight" style={{ color: '#0B1F3A' }}>
              {donations.length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-8">
            <div className="text-sm text-slate-600 mb-2">Total amount</div>
            <div className="text-4xl font-semibold tracking-tight" style={{ color: '#16A34A' }}>
              ${formatAmount(totalDonations)}
            </div>
          </div>
        </div>

        {/* Donations List */}
        {donations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-16">
            <p className="text-slate-600 leading-relaxed">No donations received yet</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {donations.map((donation) => (
              <div key={donation.donation_id} className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold" style={{ color: '#0B1F3A' }}>
                    {donation.donor.full_name}
                  </div>
                  <div className="font-semibold" style={{ color: '#16A34A' }}>
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

export default function CharityDashboardPage() {
  return (
    <AuthGuard>
      <CharityDashboardContent />
    </AuthGuard>
  )
}
