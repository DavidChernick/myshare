-- Admin allowlist table
-- This table acts as a simple allowlist of admin users
-- Avoids chicken-and-egg RLS issues that occur when checking profiles.role='admin'
-- inside RLS policies (since profiles itself is behind RLS)

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Enable RLS on admin_users table
alter table public.admin_users enable row level security;

-- Admins can view themselves in the admin_users table
-- This allows admins to verify their own admin status
create policy "admin_users_select_self"
on public.admin_users for select
to authenticated
using (auth.uid() = user_id);

-- Helper function to check if current user is an admin
-- Uses the admin_users allowlist table instead of profiles.role
-- SECURITY DEFINER allows this function to bypass RLS when querying admin_users
-- search_path is locked down for security (prevents schema injection attacks)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

-- Grant execute permission to authenticated users
grant execute on function public.is_admin() to authenticated;
