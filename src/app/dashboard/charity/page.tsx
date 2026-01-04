'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'
import { Charity } from '@/lib/supabase/types'
import { trackEvent } from '@/lib/events'
import { Currency, formatAmount as formatCurrency } from '@/lib/utils/currency'
import { getFirstName } from '@/lib/utils/names'
import { uploadCharityPhoto, validateImageFile } from '@/lib/supabase/storage'

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
  const { profile } = useProfile(user?.id)
  const supabase = createClient()

  const [charity, setCharity] = useState<Charity | null>(null)
  const [donations, setDonations] = useState<DonationWithDonor[]>([])
  const [loading, setLoading] = useState(true)

  // Form state for creating charity
  const [publicName, setPublicName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [currency, setCurrency] = useState<Currency>('ZAR')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validationError = validateImageFile(file)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setPhotoFile(file)
    setFormError('')

    // Generate preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCreateCharity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setFormError('')
    setFormLoading(true)

    try {
      // First create the charity to get charity_id
      const { data: charityData, error: charityError } = await supabase
        .from('charities')
        .insert({
          public_name: publicName,
          legal_name: legalName,
          registration_number: registrationNumber,
          description,
          website: website || null,
          contact_email: contactEmail,
          contact_phone: contactPhone || null,
          currency,
          status: 'pending_review',
        })
        .select()
        .single()

      if (charityError) throw charityError

      // Upload photo if one was selected
      let photoUrl: string | null = null
      if (photoFile && charityData) {
        try {
          photoUrl = await uploadCharityPhoto(charityData.charity_id, photoFile)

          // Update charity with photo URL
          const { error: updateError } = await supabase
            .from('charities')
            .update({ photo_url: photoUrl })
            .eq('charity_id', charityData.charity_id)

          if (updateError) {
            console.error('Error updating photo URL:', updateError)
            // Don't throw - charity is created, just photo upload failed
          }
        } catch (photoError: any) {
          console.error('Error uploading photo:', photoError)
          // Don't throw - charity is created, just photo upload failed
        }
      }

      // Link user to charity via charity_users
      const { error: linkError } = await supabase
        .from('charity_users')
        .insert({
          charity_id: charityData.charity_id,
          user_id: user.id,
          role: 'owner',
        })

      if (linkError) throw linkError

      // Track charity application submitted
      await trackEvent(user.id, 'charity_application_submitted', {
        charity_id: charityData.charity_id,
      })

      setCharity(charityData as Charity)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
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

            <form onSubmit={handleCreateCharity} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Basic Information</h3>

                <div>
                  <label
                    htmlFor="publicName"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#0B1F3A' }}
                  >
                    Public Display Name *
                  </label>
                  <input
                    id="publicName"
                    type="text"
                    value={publicName}
                    onChange={(e) => setPublicName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                    placeholder="Your organization's public name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#0B1F3A' }}
                  >
                    Mission & Description *
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={5}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400 resize-none"
                    placeholder="Tell donors about your mission and what your organization does..."
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

                <div>
                  <label
                    htmlFor="currency"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#0B1F3A' }}
                  >
                    Currency *
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                  >
                    <option value="ZAR">South African Rand (R)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GBP">British Pound (£)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    The currency you'll accept for donations
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="photo"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#0B1F3A' }}
                  >
                    Logo / Photo (optional)
                  </label>
                  <input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    JPEG, PNG, or WebP. Max 5MB.
                  </p>
                  {photoPreview && (
                    <div className="mt-4">
                      <img
                        src={photoPreview}
                        alt="Logo preview"
                        className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Legal Info */}
              <div className="space-y-5 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Legal Information</h3>

                <div>
                  <label
                    htmlFor="legalName"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#0B1F3A' }}
                  >
                    Legal Registered Name *
                  </label>
                  <input
                    id="legalName"
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                    placeholder="Official registered name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="registrationNumber"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#0B1F3A' }}
                  >
                    Registration Number (PBO/NPO) *
                  </label>
                  <input
                    id="registrationNumber"
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                    placeholder="e.g., PBO 930012345"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Your official charity registration number
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-5 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Contact Information</h3>

                <div>
                  <label
                    htmlFor="contactEmail"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#0B1F3A' }}
                  >
                    Contact Email *
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                    placeholder="contact@yourcharity.org"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contactPhone"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#0B1F3A' }}
                  >
                    Contact Phone (optional)
                  </label>
                  <input
                    id="contactPhone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                    placeholder="+27 12 345 6789"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full px-6 py-3 text-base font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#0B1F3A' }}
              >
                {formLoading ? 'Submitting application...' : 'Submit for review'}
              </button>

              <p className="text-xs text-slate-500 text-center">
                Your application will be reviewed by our team before approval
              </p>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Charity exists but not approved yet
  if (charity.status !== 'approved') {
    const isRejected = charity.status === 'rejected'

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
          <div className="bg-white border border-slate-200 rounded-lg p-16">
            <div className="max-w-2xl mx-auto">
              {/* Status Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium mb-4"
                  style={{
                    backgroundColor: isRejected ? '#FEE2E2' : '#FEF3C7',
                    color: isRejected ? '#991B1B' : '#92400E'
                  }}>
                  {isRejected ? 'Application Rejected' : 'Pending Approval'}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4" style={{ color: '#0B1F3A' }}>
                  {isRejected ? 'Application Not Approved' : 'Under Review'}
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  {isRejected
                    ? 'Your charity application was not approved.'
                    : `Your charity profile for ${charity.public_name} is under review. You'll be able to receive donations once approved.`
                  }
                </p>
              </div>

              {/* Rejection Reason */}
              {isRejected && charity.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                  <h3 className="font-medium mb-2" style={{ color: '#991B1B' }}>Reason for rejection</h3>
                  <p className="text-slate-700 leading-relaxed">{charity.rejection_reason}</p>
                </div>
              )}

              {/* Application Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <h3 className="font-medium mb-4" style={{ color: '#0B1F3A' }}>Your Application</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-900">Public Name:</span>
                    <span className="text-slate-600 ml-2">{charity.public_name}</span>
                  </div>
                  {charity.legal_name && (
                    <div>
                      <span className="font-medium text-slate-900">Legal Name:</span>
                      <span className="text-slate-600 ml-2">{charity.legal_name}</span>
                    </div>
                  )}
                  {charity.registration_number && (
                    <div>
                      <span className="font-medium text-slate-900">Registration Number:</span>
                      <span className="text-slate-600 ml-2">{charity.registration_number}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-slate-900">Description:</span>
                    <p className="text-slate-600 mt-1 leading-relaxed">{charity.description}</p>
                  </div>
                  {charity.website && (
                    <div>
                      <span className="font-medium text-slate-900">Website:</span>
                      <span className="text-slate-600 ml-2">{charity.website}</span>
                    </div>
                  )}
                  {charity.contact_email && (
                    <div>
                      <span className="font-medium text-slate-900">Contact Email:</span>
                      <span className="text-slate-600 ml-2">{charity.contact_email}</span>
                    </div>
                  )}
                  {charity.contact_phone && (
                    <div>
                      <span className="font-medium text-slate-900">Contact Phone:</span>
                      <span className="text-slate-600 ml-2">{charity.contact_phone}</span>
                    </div>
                  )}
                </div>
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
            Welcome back, {getFirstName(profile)}
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Managing {charity.public_name}
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
              {formatCurrency(totalDonations, charity.currency)}
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
                    {formatCurrency(donation.amount_cents, charity.currency)}
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
