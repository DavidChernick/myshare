'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'
import { ProfileForm } from '@/components/ProfileForm'
import { useRouter } from 'next/navigation'

function DonorSettingsContent() {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const router = useRouter()

  // Redirect non-donors
  useEffect(() => {
    if (!profileLoading && profile && profile.role !== 'donor') {
      router.replace('/dashboard')
    }
  }, [profile, profileLoading, router])

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: '#0B1F3A' }}>
            Settings
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Manage your personal information and tax details
          </p>
        </div>

        {user && <ProfileForm userId={user.id} profile={profile} />}
      </div>
    </div>
  )
}

export default function DonorSettingsPage() {
  return (
    <AuthGuard>
      <DonorSettingsContent />
    </AuthGuard>
  )
}
