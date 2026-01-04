'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import { Charity } from '@/lib/supabase/types'
import { trackEvent } from '@/lib/events'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CharityWithOwner extends Charity {
  owner_name: string | null
  reviewer_name: string | null
}

function AdminCharityReviewContent({ id }: { id: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [charity, setCharity] = useState<CharityWithOwner | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    if (!user) return

    async function fetchCharity() {
      const { data, error } = await supabase
        .from('charities')
        .select(`
          *,
          charity_users!inner(
            user_id,
            profiles(full_name)
          )
        `)
        .eq('charity_id', id)
        .single()

      if (error || !data) {
        setError('Charity not found')
        setLoading(false)
        return
      }

      // Fetch reviewer name if reviewed
      let reviewerName = null
      if (data.reviewed_by) {
        const { data: reviewerData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.reviewed_by)
          .single()

        reviewerName = reviewerData?.full_name || null
      }

      const charityWithOwner: CharityWithOwner = {
        ...data,
        owner_name: data.charity_users[0]?.profiles?.full_name || null,
        reviewer_name: reviewerName,
      }

      setCharity(charityWithOwner)
      setAdminNotes(charityWithOwner.admin_notes || '')
      setLoading(false)
    }

    fetchCharity()
  }, [user, supabase, id])

  const handleApprove = async () => {
    if (!user || !charity) return

    setError('')
    setActionLoading(true)

    try {
      const { error: updateError } = await supabase
        .from('charities')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null, // Clear any previous rejection reason
          admin_notes: adminNotes || null,
        })
        .eq('charity_id', charity.charity_id)

      if (updateError) throw updateError

      // Track event
      await trackEvent(user.id, 'charity_approved', {
        charity_id: charity.charity_id,
      })

      router.push('/admin/charities')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!user || !charity || !rejectionReason.trim()) {
      setError('Rejection reason is required')
      return
    }

    setError('')
    setActionLoading(true)

    try {
      const { error: updateError } = await supabase
        .from('charities')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('charity_id', charity.charity_id)

      if (updateError) throw updateError

      // Track event
      await trackEvent(user.id, 'charity_rejected', {
        charity_id: charity.charity_id,
      })

      router.push('/admin/charities')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
      setShowRejectModal(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (error && !charity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">{error}</div>
      </div>
    )
  }

  if (!charity) return null

  const isPending = charity.status === 'pending_review'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        {/* Back Link */}
        <Link
          href="/admin/charities"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          ← Back to all applications
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-6">
            {/* Logo */}
            {charity.photo_url && (
              <img
                src={charity.photo_url}
                alt={`${charity.public_name} logo`}
                className="w-20 h-20 rounded-lg object-cover border border-slate-200 flex-shrink-0"
              />
            )}

            {/* Title and owner */}
            <div>
              <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: '#0B1F3A' }}>
                {charity.public_name}
              </h1>
              {charity.owner_name && (
                <p className="text-slate-600">
                  Submitted by {charity.owner_name}
                </p>
              )}
            </div>
          </div>
          {getStatusBadge(charity.status)}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Application Details */}
        <div className="bg-white border border-slate-200 rounded-lg p-8 mb-6">
          <h2 className="text-xl font-semibold mb-6" style={{ color: '#0B1F3A' }}>
            Application Details
          </h2>

          <div className="space-y-5">
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Public Display Name</div>
              <div className="text-slate-900">{charity.public_name}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Legal Registered Name</div>
              <div className="text-slate-900">{charity.legal_name || '—'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Registration Number</div>
              <div className="text-slate-900">{charity.registration_number || '—'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Mission & Description</div>
              <div className="text-slate-900 leading-relaxed whitespace-pre-wrap">
                {charity.description || '—'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Website</div>
              {charity.website ? (
                <a
                  href={charity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 hover:underline"
                >
                  {charity.website}
                </a>
              ) : (
                <div className="text-slate-900">—</div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Contact Email</div>
              <div className="text-slate-900">{charity.contact_email || '—'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Contact Phone</div>
              <div className="text-slate-900">{charity.contact_phone || '—'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Submitted</div>
              <div className="text-slate-900">{formatDate(charity.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Admin Notes (always shown for admins) */}
        <div className="bg-white border border-slate-200 rounded-lg p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#0B1F3A' }}>
            Admin Notes (Internal)
          </h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400 resize-none"
            placeholder="Add internal notes about this application..."
            disabled={!isPending}
          />
          <p className="mt-2 text-xs text-slate-500">
            These notes are only visible to admins and will be saved when you approve/reject
          </p>
        </div>

        {/* Admin Actions (only for pending) */}
        {isPending && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#0B1F3A' }}>
              Review Actions
            </h2>
            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-6 py-3 text-base font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#16A34A' }}
              >
                {actionLoading ? 'Processing...' : 'Approve Application'}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-6 py-3 text-base font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700"
              >
                Reject Application
              </button>
            </div>
          </div>
        )}

        {/* Review History (if reviewed) */}
        {!isPending && (
          <div className="bg-white border border-slate-200 rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-6" style={{ color: '#0B1F3A' }}>
              Review History
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Decision</div>
                <div>{getStatusBadge(charity.status)}</div>
              </div>
              {charity.reviewer_name && (
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Reviewed By</div>
                  <div className="text-slate-900">{charity.reviewer_name}</div>
                </div>
              )}
              {charity.reviewed_at && (
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Reviewed At</div>
                  <div className="text-slate-900">{formatDate(charity.reviewed_at)}</div>
                </div>
              )}
              {charity.rejection_reason && (
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Rejection Reason</div>
                  <div className="text-slate-900 bg-red-50 border border-red-200 rounded-lg p-4">
                    {charity.rejection_reason}
                  </div>
                </div>
              )}
              {charity.admin_notes && (
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Admin Notes</div>
                  <div className="text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-4 whitespace-pre-wrap">
                    {charity.admin_notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4" style={{ color: '#0B1F3A' }}>
              Reject Application
            </h3>
            <p className="text-slate-600 mb-4">
              Please provide a reason for rejecting this application. This will be visible to the charity owner.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-slate-400 resize-none mb-4"
              placeholder="Reason for rejection..."
              required
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminCharityReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <AuthGuard>
      <AdminCharityReviewContent id={id} />
    </AuthGuard>
  )
}
