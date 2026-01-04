'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { trackEvent } from '@/lib/events'

type Role = 'donor' | 'charity'

export default function OnboardingPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<Role>('donor')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // If not signed in, go to /auth
  useEffect(() => {
    if (!authLoading && !user) router.push('/auth')
  }, [user, authLoading, router])

  // If profile already exists and onboarding is complete, skip this page
  useEffect(() => {
    let cancelled = false
    let hasChecked = false

    async function checkProfile() {
      if (!user || hasChecked) {
        setChecking(false)
        return
      }

      hasChecked = true
      setChecking(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, role, onboarding_completed_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return

      // If RLS blocks this, you'll see it in console and the page will stay usable
      if (error) {
        console.error('[onboarding] profile check error', error)
        setChecking(false)
        return
      }

      // Only redirect if profile exists AND has onboarding_completed_at
      if (data?.onboarding_completed_at) {
        router.replace('/dashboard')
        return
      }

      // Prefill if row exists
      if (data?.first_name) setFirstName(data.first_name)
      if (data?.last_name) setLastName(data.last_name)
      if (data?.role) setRole(data.role as Role)

      setChecking(false)
    }

    checkProfile()

    return () => {
      cancelled = true
    }
  }, [user, supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setLoading(true)

    try {
      const now = new Date().toISOString()

      // Does a profile exist?
      const { data: existing, error: existingErr } = await supabase
        .from('profiles')
        .select('user_id, onboarding_completed_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingErr) throw existingErr

      if (existing?.onboarding_completed_at) {
        router.replace('/dashboard')
        return
      }

      const fullName = `${firstName} ${lastName}`

      if (existing?.user_id) {
        // Update existing row
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            role,
            onboarding_completed_at: now,
          })
          .eq('user_id', user.id)

        if (updateErr) throw updateErr
      } else {
        // Insert new row
        const { error: insertErr } = await supabase.from('profiles').insert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          role,
          onboarding_completed_at: now,
        })

        if (insertErr) throw insertErr
      }

      await trackEvent(user.id, 'onboarding_completed', { role })

      // No window.location, just route
      router.replace('/dashboard')
    } catch (err: any) {
      console.error('[onboarding] submit error', err)
      setError(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-blue-900 mb-2">Welcome to myShare</h1>
          <p className="text-slate-600">Let's set up your account</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-900 mb-1.5">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                placeholder="Jane"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-900 mb-1.5">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                placeholder="Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">I want to...</label>

              <div className="space-y-3">
                <label className="flex items-start p-4 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="donor"
                    checked={role === 'donor'}
                    onChange={() => setRole('donor')}
                    className="mt-0.5 h-4 w-4 text-blue-900 focus:ring-blue-900"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-slate-900">Donate to charities</div>
                    <div className="text-sm text-slate-600">Discover and support causes you care about</div>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="charity"
                    checked={role === 'charity'}
                    onChange={() => setRole('charity')}
                    className="mt-0.5 h-4 w-4 text-blue-900 focus:ring-blue-900"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-slate-900">Receive donations as a charity</div>
                    <div className="text-sm text-slate-600">Create your charity profile and accept donations</div>
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