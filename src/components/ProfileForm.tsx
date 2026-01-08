'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/supabase/types'

interface ProfileFormProps {
  userId: string
  profile: Profile | null
  onSaveSuccess?: () => void
}

export function ProfileForm({ userId, profile, onSaveSuccess }: ProfileFormProps) {
  const supabase = createClient()

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [email, setEmail] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [taxReference, setTaxReference] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Prefill form with existing data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setMobileNumber(profile.mobile_number || '')
      setEmail(profile.email || '')
      setIdNumber(profile.id_number || '')
      setTaxReference(profile.tax_reference || '')
      setAddressLine1(profile.address_line1 || '')
      setAddressLine2(profile.address_line2 || '')
      setCity(profile.city || '')
      setProvince(profile.province || '')
      setPostalCode(profile.postal_code || '')
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const fullName = `${firstName} ${lastName}`.trim()

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: fullName || null,
          mobile_number: mobileNumber || null,
          email: email || null,
          id_number: idNumber || null,
          tax_reference: taxReference || null,
          address_line1: addressLine1 || null,
          address_line2: addressLine2 || null,
          city: city || null,
          province: province || null,
          postal_code: postalCode || null,
        })
        .eq('user_id', userId)

      if (updateError) throw updateError

      setSuccess(true)
      if (onSaveSuccess) onSaveSuccess()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('[profile-form] save error', err)
      setError(err?.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Settings saved successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Personal Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium mb-2"
                style={{ color: '#0B1F3A' }}
              >
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                placeholder="Jane"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium mb-2"
                style={{ color: '#0B1F3A' }}
              >
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
              style={{ color: '#0B1F3A' }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="mobileNumber"
              className="block text-sm font-medium mb-2"
              style={{ color: '#0B1F3A' }}
            >
              Mobile Number
            </label>
            <input
              id="mobileNumber"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
              placeholder="+27 12 345 6789"
            />
          </div>
        </div>

        {/* Tax Information */}
        <div className="space-y-5 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Tax Information
          </h3>

          <div>
            <label
              htmlFor="idNumber"
              className="block text-sm font-medium mb-2"
              style={{ color: '#0B1F3A' }}
            >
              ID Number
            </label>
            <input
              id="idNumber"
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
              placeholder="e.g., 9001015009087"
            />
            <p className="mt-1 text-xs text-slate-500">
              Your South African ID number (optional)
            </p>
          </div>

          <div>
            <label
              htmlFor="taxReference"
              className="block text-sm font-medium mb-2"
              style={{ color: '#0B1F3A' }}
            >
              Tax Reference Number
            </label>
            <input
              id="taxReference"
              type="text"
              value={taxReference}
              onChange={(e) => setTaxReference(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
              placeholder="e.g., 0123456789"
            />
            <p className="mt-1 text-xs text-slate-500">
              For tax certificate purposes (optional)
            </p>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-5 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Address
          </h3>

          <div>
            <label
              htmlFor="addressLine1"
              className="block text-sm font-medium mb-2"
              style={{ color: '#0B1F3A' }}
            >
              Address Line 1
            </label>
            <input
              id="addressLine1"
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
              placeholder="123 Main Street"
            />
          </div>

          <div>
            <label
              htmlFor="addressLine2"
              className="block text-sm font-medium mb-2"
              style={{ color: '#0B1F3A' }}
            >
              Address Line 2
            </label>
            <input
              id="addressLine2"
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
              placeholder="Apartment, suite, unit, etc."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium mb-2"
                style={{ color: '#0B1F3A' }}
              >
                City
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                placeholder="Cape Town"
              />
            </div>

            <div>
              <label
                htmlFor="province"
                className="block text-sm font-medium mb-2"
                style={{ color: '#0B1F3A' }}
              >
                Province
              </label>
              <input
                id="province"
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                placeholder="Western Cape"
              />
            </div>

            <div>
              <label
                htmlFor="postalCode"
                className="block text-sm font-medium mb-2"
                style={{ color: '#0B1F3A' }}
              >
                Postal Code
              </label>
              <input
                id="postalCode"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
                placeholder="8001"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 text-base font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#0B1F3A' }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
