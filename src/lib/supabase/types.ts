export interface Profile {
  user_id: string
  role: 'donor' | 'charity' | 'admin'
  full_name: string | null
  onboarding_completed_at: string | null
  marketing_source: string | null
  created_at: string
}

export interface Charity {
  charity_id: string
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended'
  legal_name: string | null
  public_name: string
  description: string | null
  website: string | null
  created_at: string
  approved_at: string | null
}

export interface CharityUser {
  charity_id: string
  user_id: string
  role: 'owner' | 'admin' | 'viewer'
  created_at: string
}

export interface Donation {
  donation_id: string
  donor_user_id: string
  charity_id: string
  amount_cents: number
  currency: string
  status: 'created' | 'payment_pending' | 'paid' | 'failed' | 'refunded'
  donated_at: string
  message: string | null
}

export interface Event {
  id: string
  user_id: string | null
  event_name: string
  metadata: Record<string, any> | null
  created_at: string
}
