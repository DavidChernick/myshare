'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'

export function Header() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="text-xl font-semibold tracking-tight" style={{ color: '#0B1F3A' }}>
            myShare
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <Link
              href="/charities"
              className={`text-sm font-medium transition-colors ${
                pathname === '/charities'
                  ? 'text-[#0B1F3A]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Charities
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    pathname?.startsWith('/dashboard')
                      ? 'text-[#0B1F3A]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth"
                  className="text-sm font-medium text-white px-5 py-2 rounded-md transition-colors"
                  style={{ backgroundColor: '#0B1F3A' }}
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
