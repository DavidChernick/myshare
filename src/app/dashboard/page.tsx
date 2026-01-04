'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'

function DashboardRedirect() {
  const { user } = useAuth()
  const { profile, loading } = useProfile(user?.id)
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (profile?.role === 'donor') {
      router.push('/dashboard/donor')
    } else if (profile?.role === 'charity') {
      router.push('/dashboard/charity')
    }
  }, [profile, loading, router])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-600">Loading dashboard...</div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardRedirect />
    </AuthGuard>
  )
}
