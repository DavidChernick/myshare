'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { trackEvent } from '@/lib/events'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState<'donor' | 'charity'>('donor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setLoading(true)

    try {
      const { error: insertError } = await supabase.from('profiles').insert({
        user_id: user.id,
        full_name: name,
        role,
        onboarding_completed_at: new Date().toISOString(),
      })

      if (insertError) throw insertError

      // Track onboarding completion
      await trackEvent(user.id, 'onboarding_completed', { role })

      // Redirect to dashboard after successful onboarding
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-blue-900 mb-2">Welcome to myShare</h1>
          <p className="text-slate-600">Let's set up your account</p>
        </div>

        {/* Onboarding Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-1.5">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                placeholder="Jane Smith"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">
                I want to...
              </label>
              <div className="space-y-3">
                <label className="flex items-start p-4 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="donor"
                    checked={role === 'donor'}
                    onChange={(e) => setRole(e.target.value as 'donor')}
                    className="mt-0.5 h-4 w-4 text-blue-900 focus:ring-blue-900"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-slate-900">Donate to charities</div>
                    <div className="text-sm text-slate-600">
                      Discover and support causes you care about
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="charity"
                    checked={role === 'charity'}
                    onChange={(e) => setRole(e.target.value as 'charity')}
                    className="mt-0.5 h-4 w-4 text-blue-900 focus:ring-blue-900"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-slate-900">
                      Receive donations as a charity
                    </div>
                    <div className="text-sm text-slate-600">
                      Create your charity profile and accept donations
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 text-white py-2.5 rounded-md font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
