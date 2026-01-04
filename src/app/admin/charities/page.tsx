'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import { Charity } from '@/lib/supabase/types'
import Link from 'next/link'

interface CharityWithOwner extends Charity {
  owner_name: string | null
}

function AdminCharitiesContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const [charities, setCharities] = useState<CharityWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    if (!user) return

    async function fetchCharities() {
      const { data, error } = await supabase
        .from('charities')
        .select(`
          *,
          charity_users!inner(
            user_id,
            profiles(full_name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching charities:', error)
      } else {
        // Transform data to include owner name
        const transformedData = (data || []).map((charity: any) => ({
          ...charity,
          owner_name: charity.charity_users[0]?.profiles?.full_name || null,
        }))
        setCharities(transformedData)
      }

      setLoading(false)
    }

    fetchCharities()
  }, [user, supabase])

  const filteredCharities = statusFilter === 'all'
    ? charities
    : charities.filter(c => c.status === statusFilter)

  const pendingCount = charities.filter(c => c.status === 'pending_review').length
  const approvedCount = charities.filter(c => c.status === 'approved').length
  const rejectedCount = charities.filter(c => c.status === 'rejected').length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string, text: string, label: string }> = {
      pending_review: { bg: '#FEF3C7', text: '#92400E', label: 'Pending Review' },
      approved: { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
      rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
      suspended: { bg: '#E5E7EB', text: '#374151', label: 'Suspended' },
    }

    const style = styles[status] || { bg: '#F3F4F6', text: '#6B7280', label: status }

    return (
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {style.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: '#0B1F3A' }}>
            Charity Applications
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Review and manage charity applications
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Total</div>
            <div className="text-3xl font-semibold" style={{ color: '#0B1F3A' }}>
              {charities.length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Pending</div>
            <div className="text-3xl font-semibold" style={{ color: '#92400E' }}>
              {pendingCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Approved</div>
            <div className="text-3xl font-semibold" style={{ color: '#065F46' }}>
              {approvedCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Rejected</div>
            <div className="text-3xl font-semibold" style={{ color: '#991B1B' }}>
              {rejectedCount}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {(['all', 'pending_review', 'approved', 'rejected'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === filter
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter === 'all' ? 'All' : filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Charities List */}
        {filteredCharities.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
            <p className="text-slate-600">
              No {statusFilter === 'all' ? '' : statusFilter.replace('_', ' ')} charities found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCharities.map((charity) => (
              <Link
                key={charity.charity_id}
                href={`/admin/charities/${charity.charity_id}`}
                className="block bg-white border border-slate-200 rounded-lg p-6 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: '#0B1F3A' }}>
                      {charity.public_name}
                    </h3>
                    {charity.owner_name && (
                      <p className="text-sm text-slate-500">
                        Submitted by {charity.owner_name}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(charity.status)}
                </div>

                {charity.description && (
                  <p className="text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                    {charity.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>Submitted {formatDate(charity.created_at)}</span>
                  {charity.registration_number && (
                    <span>Reg: {charity.registration_number}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminCharitiesPage() {
  return (
    <AuthGuard>
      <AdminCharitiesContent />
    </AuthGuard>
  )
}
