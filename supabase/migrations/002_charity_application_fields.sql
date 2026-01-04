-- Add fields needed for charity application and admin review workflow
-- These fields support the full application submission and approval process

alter table public.charities
  add column if not exists registration_number text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists rejection_reason text,
  add column if not exists admin_notes text,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz;

-- Optional indexes for performance
-- Index on status for filtering pending/approved/rejected applications
create index if not exists idx_charities_status on public.charities(status);

-- Index on created_at for sorting applications by submission date
create index if not exists idx_charities_created_at on public.charities(created_at desc);

-- Index on reviewed_at for admin audit trails
create index if not exists idx_charities_reviewed_at on public.charities(reviewed_at desc) where reviewed_at is not null;
