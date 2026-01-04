'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/events'
import Link from 'next/link'

interface DonationFormProps {
  charityId: string
  charityName: string
}

export function DonationForm({ charityId, charityName }: DonationFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [donateStartedTracked, setDonateStartedTracked] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setLoading(true)

    try {
      const amountDollars = parseFloat(amount)
      if (isNaN(amountDollars) || amountDollars <= 0) {
        throw new Error('Please enter a valid amount')
      }

      const amountCents = Math.round(amountDollars * 100)

      const { error: insertError } = await supabase.from('donations').insert({
        donor_user_id: user.id,
        charity_id: charityId,
        amount_cents: amountCents,
        message: message || null,
        status: 'paid',
      })

      if (insertError) throw insertError

      // Track donate succeeded event
      await trackEvent(user.id, 'donate_succeeded', {
        charity_id: charityId,
        amount_cents: amountCents,
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAmountFocus = () => {
    if (!donateStartedTracked && user) {
      trackEvent(user.id, 'donate_started', { charity_id: charityId })
      setDonateStartedTracked(true)
    }
  }

  if (!user) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8">
        <h2 className="text-2xl font-semibold tracking-tight mb-4" style={{ color: '#0B1F3A' }}>
          Make a donation
        </h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Sign in to support this charity.
        </p>
        <Link
          href="/auth"
          className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white rounded-lg"
          style={{ backgroundColor: '#16A34A' }}
        >
          Sign in to donate
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8">
        <div className="mb-6">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="#16A34A"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-3 text-center" style={{ color: '#0B1F3A' }}>
          Donation complete
        </h2>
        <p className="text-slate-600 text-center leading-relaxed">
          Thank you for supporting {charityName}.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-8">
      <h2 className="text-2xl font-semibold tracking-tight mb-6" style={{ color: '#0B1F3A' }}>
        Make a donation
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2" style={{ color: '#0B1F3A' }}>
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
              $
            </span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={handleAmountFocus}
              required
              className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400"
              style={{ focusRingColor: '#16A34A' }}
              placeholder="25.00"
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2" style={{ color: '#0B1F3A' }}>
            Message (optional)
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400 resize-none"
            placeholder="Add a message..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 text-base font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#16A34A' }}
        >
          {loading ? 'Processing...' : 'Donate'}
        </button>

        <p className="text-xs text-slate-500 text-center">
          Simulated donation for MVP testing
        </p>
      </form>
    </div>
  )
}
