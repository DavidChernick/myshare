-- Migration 006: Add user profile fields and charity photos/currency
-- Adds fields for donor tax information, addresses, and charity photos/currency

-- ============================================================================
-- PROFILES TABLE - Add personal and tax information fields
-- ============================================================================

-- Add name fields (split from full_name)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add donor tax information fields (all optional)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS tax_reference TEXT;

-- Add address fields (all optional)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add contact fields (all optional)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mobile_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Migrate existing full_name data to first_name and last_name
-- Split on first space: everything before = first_name, everything after = last_name
UPDATE public.profiles
SET
  first_name = CASE
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0
    THEN split_part(full_name, ' ', 1)
    ELSE full_name
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL AND full_name IS NOT NULL;

-- ============================================================================
-- CHARITIES TABLE - Add photo and currency fields
-- ============================================================================

-- Add photo URL field (Supabase Storage URL)
ALTER TABLE public.charities
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add currency field (defaults to ZAR)
ALTER TABLE public.charities
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ZAR';

-- Add constraint to ensure currency is one of the supported values
ALTER TABLE public.charities
ADD CONSTRAINT charities_currency_check
CHECK (currency IN ('USD', 'ZAR', 'GBP', 'EUR'));

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON COLUMN public.profiles.first_name IS 'User first name (for personalized greetings)';
COMMENT ON COLUMN public.profiles.last_name IS 'User last name';
COMMENT ON COLUMN public.profiles.id_number IS 'South African ID number (for tax certificates)';
COMMENT ON COLUMN public.profiles.tax_reference IS 'Tax reference number (for tax certificates)';
COMMENT ON COLUMN public.profiles.address_line1 IS 'Address line 1';
COMMENT ON COLUMN public.profiles.address_line2 IS 'Address line 2 (optional)';
COMMENT ON COLUMN public.profiles.city IS 'City';
COMMENT ON COLUMN public.profiles.province IS 'Province/State';
COMMENT ON COLUMN public.profiles.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.profiles.mobile_number IS 'Mobile phone number';
COMMENT ON COLUMN public.profiles.email IS 'Email address';
COMMENT ON COLUMN public.charities.photo_url IS 'URL to charity logo/photo in Supabase Storage';
COMMENT ON COLUMN public.charities.currency IS 'Currency charity accepts for donations (USD, ZAR, GBP, EUR)';
