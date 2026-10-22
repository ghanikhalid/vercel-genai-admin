-- =============================================================================
-- PRISM POP — SUPERADMIN DATABASE MIGRATION & RLS POLICIES
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================================

-- 1. Add the `is_superadmin` boolean column to `public.profiles`
alter table public.profiles
    add column if not exists is_superadmin boolean not null default false;

-- 2. Bootstrap your account(s) as Superadmin so you are not locked out!
-- (Updates the project owner profile rows to is_superadmin = true)
update public.profiles
set is_superadmin = true
where id in (
    'c93ee310-c0d4-41e6-9cd2-711125ab35d9', -- Ghani Khalid
    'c3661aaf-67c2-41fa-8bb0-c6c28c32df8b', -- Abdul Ghani
    '7bbcb74e-24e8-492e-b32c-f37af8fe35eb'  -- Abdul Ghani
);

-- 3. Helper function to check if the current authenticated user is a superadmin
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
as $$
    select coalesce(
        (select is_superadmin from public.profiles where id = auth.uid()),
        false
    );
$$;

-- 4. Allow superadmins to update any profile (e.g. granting/revoking superadmin)
drop policy if exists "profiles_update_superadmin" on public.profiles;
create policy "profiles_update_superadmin"
    on public.profiles for update
    to authenticated
    using (public.is_superadmin())
    with check (public.is_superadmin());

-- 5. Allow superadmins full CRUD on `public.captioned_images` (AI Generated Media)
drop policy if exists "captioned_images_insert_superadmin" on public.captioned_images;
drop policy if exists "captioned_images_update_superadmin" on public.captioned_images;
drop policy if exists "captioned_images_delete_superadmin" on public.captioned_images;

create policy "captioned_images_insert_superadmin"
    on public.captioned_images for insert
    to authenticated
    with check (public.is_superadmin() or auth.uid() = user_id);

create policy "captioned_images_update_superadmin"
    on public.captioned_images for update
    to authenticated
    using (public.is_superadmin() or auth.uid() = user_id)
    with check (public.is_superadmin() or auth.uid() = user_id);

create policy "captioned_images_delete_superadmin"
    on public.captioned_images for delete
    to authenticated
    using (public.is_superadmin() or auth.uid() = user_id);

-- 6. Allow superadmins to read all `public.daily_meme_fortunes` for telemetry
drop policy if exists "daily_meme_fortunes_select_superadmin" on public.daily_meme_fortunes;
create policy "daily_meme_fortunes_select_superadmin"
    on public.daily_meme_fortunes for select
    to authenticated
    using (public.is_superadmin() or auth.uid() = user_id);
