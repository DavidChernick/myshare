-- Verify and fix profiles RLS policies
-- This ensures users can INSERT and SELECT their own profile

-- Check current policies
-- You can see them in Supabase UI under Authentication > Policies

-- Drop any conflicting policies
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_insert_logged_in" on public.profiles;

-- Create INSERT policy - users can create their own profile
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = user_id);

-- Verify SELECT policies exist (from migration 004)
-- If they don't exist, create them:

-- This allows users to select their own profile (should already exist from migration 004)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
    and tablename = 'profiles'
    and policyname = 'profiles_select_own'
  ) then
    create policy "profiles_select_own"
    on public.profiles for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

-- UPDATE policy for users to update their own profile
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
