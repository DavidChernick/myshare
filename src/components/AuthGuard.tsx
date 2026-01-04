'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const PUBLIC_PATHS = new Set(['/auth', '/onboarding', '/charities'])

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = PUBLIC_PATHS.has(pathname) || pathname.startsWith('/charities/')

  useEffect(() => {
    if (isPublic) return
    if (authLoading) return

    // Only redirect to auth if not logged in
    if (!user && pathname !== '/auth') {
      router.replace('/auth')
    }
  }, [isPublic, authLoading, user, router, pathname])

  // Public pages render normally
  if (isPublic) return <>{children}</>

  // Loading state for protected pages
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  // If not logged in, block render
  if (!user) return null

  // User is logged in, let the page handle the rest
  return <>{children}</>
}