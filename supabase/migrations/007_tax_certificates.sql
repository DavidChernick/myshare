-- Create tax_certificates table for 18A tax certificates
CREATE TABLE IF NOT EXISTS public.tax_certificates (
  certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES public.charities(charity_id) ON DELETE CASCADE,
  tax_year TEXT NOT NULL, -- Format: "YYYY/YYYY", e.g., "2024/2025"
  currency TEXT NOT NULL DEFAULT 'ZAR',
  total_amount_cents INTEGER NOT NULL,
  certificate_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'available'
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_donor_charity_year UNIQUE(donor_user_id, charity_id, tax_year)
);

-- Add indexes for performance
CREATE INDEX idx_tax_certificates_donor ON public.tax_certificates(donor_user_id);
CREATE INDEX idx_tax_certificates_charity ON public.tax_certificates(charity_id);
CREATE INDEX idx_tax_certificates_year ON public.tax_certificates(tax_year);

-- Enable Row Level Security
ALTER TABLE public.tax_certificates ENABLE ROW LEVEL SECURITY;

-- Donors can view their own certificates
CREATE POLICY "Donors can view own certificates"
ON public.tax_certificates FOR SELECT
USING (auth.uid() = donor_user_id);

-- Note: INSERT/UPDATE/DELETE will be handled by service role only
-- No policies added for these operations to ensure only backend can manage certificates
