'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const router = useRouter()

  useEffect(() => {
    if (authLoading || profileLoading) return

    if (!user) {
      router.push('/auth')
      return
    }

    if (!profile?.onboarding_completed_at) {
      router.push('/onboarding')
      return
    }
  }, [user, profile, authLoading, profileLoading, router])

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  if (!user || !profile?.onboarding_completed_at) {
    return null
  }

  return <>{children}</>
}
