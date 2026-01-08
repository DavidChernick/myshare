export interface Profile {
  user_id: string
  role: 'donor' | 'charity' | 'admin'
  full_name: string | null
  first_name: string | null
  last_name: string | null
  id_number: string | null
  tax_reference: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  mobile_number: string | null
  email: string | null
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
  registration_number: string | null
  contact_email: string | null
  contact_phone: string | null
  rejection_reason: string | null
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  approved_at: string | null
  photo_url: string | null
  currency: 'USD' | 'ZAR' | 'GBP' | 'EUR'
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

export interface TaxCertificate {
  certificate_id: string
  donor_user_id: string
  charity_id: string
  tax_year: string
  currency: string
  total_amount_cents: number
  certificate_url: string | null
  status: 'pending' | 'available'
  issued_at: string | null
  created_at: string
}
