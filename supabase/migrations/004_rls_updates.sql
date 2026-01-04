-- RLS policy updates to support admin approval workflow
-- Uses admin_users allowlist table + is_admin() function (from 003_admin_allowlist.sql)
--
-- IMPORTANT: This migration only drops SELECT and UPDATE policies
-- INSERT policies are preserved (charities_insert_logged_in, charity_users_insert_self, profiles_insert_own, etc.)

-- ============================================================================
-- CHARITIES TABLE RLS
-- ============================================================================

-- Drop existing select/update policies that conflict
drop policy if exists "charities_select_approved_logged_in" on public.charities;
drop policy if exists "charities_select_approved" on public.charities;
drop policy if exists "charities_select_admin" on public.charities;
drop policy if exists "charities_select_owner" on public.charities;
drop policy if exists "charities_update_admin" on public.charities;
drop policy if exists "charities_update_owner" on public.charities;
drop policy if exists "charities_update_by_manager" on public.charities;

-- SELECT policies for charities
-- EXACTLY 3 policies, no duplicates

-- 1. Public and authenticated users can view approved charities (public listing)
create policy "charities_select_approved"
on public.charities for select
using (status = 'approved');

-- 2. Admins can view all charities (pending_review, rejected, approved, suspended)
create policy "charities_select_admin"
on public.charities for select
to authenticated
using (public.is_admin());

-- 3. Charity owners can view their own charity regardless of status
create policy "charities_select_owner"
on public.charities for select
to authenticated
using (
  exists (
    select 1
    from public.charity_users cu
    where cu.charity_id = charities.charity_id
      and cu.user_id = auth.uid()
  )
);

-- UPDATE policies for charities

-- 1. Admins can update any charity (approve/reject/suspend)
create policy "charities_update_admin"
on public.charities for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 2. Charity owners can update their own charity (edit application and resubmit)
create policy "charities_update_owner"
on public.charities for update
to authenticated
using (
  exists (
    select 1
    from public.charity_users cu
    where cu.charity_id = charities.charity_id
      and cu.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.charity_users cu
    where cu.charity_id = charities.charity_id
      and cu.user_id = auth.uid()
  )
);

-- ============================================================================
-- CHARITY_USERS TABLE RLS
-- ============================================================================

-- Drop existing select policies
drop policy if exists "charity_users_select_admin" on public.charity_users;
drop policy if exists "charity_users_select_own" on public.charity_users;

-- SELECT policies for charity_users

-- 1. Admins can select all charity_users rows (for review pages showing owner info)
create policy "charity_users_select_admin"
on public.charity_users for select
to authenticated
using (public.is_admin());

-- 2. Users can select their own charity_users rows
create policy "charity_users_select_own"
on public.charity_users for select
to authenticated
using (auth.uid() = user_id);

-- ============================================================================
-- PROFILES TABLE RLS
-- ============================================================================

-- Drop existing select policies
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;

-- SELECT policies for profiles

-- 1. Admins can select all profiles (for review pages showing applicant info)
create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_admin());

-- 2. Users can select their own profile
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);
