-- Superadmin role + privilege lock. Run once in the Supabase SQL Editor.
-- After this, only existing superadmins (or this SQL editor) can grant the flag.

alter table public.profiles
    add column if not exists is_superadmin boolean not null default false;

-- Known owners only. Anyone who self-promoted is revoked.
update public.profiles
set is_superadmin = (
    id in (
        'c93ee310-c0d4-41e6-9cd2-711125ab35d9',
        'c3661aaf-67c2-41fa-8bb0-c6c28c32df8b',
        '7bbcb74e-24e8-492e-b32c-f37af8fe35eb'
    )
);

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select coalesce(
        (select is_superadmin from public.profiles where id = auth.uid()),
        false
    );
$$;

create or replace function public.protect_superadmin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        if new.is_superadmin is true
           and auth.uid() is not null
           and not public.is_superadmin() then
            raise exception 'Only superadmins can grant superadmin access';
        end if;
        return new;
    end if;

    if new.is_superadmin is not distinct from old.is_superadmin then
        return new;
    end if;

    -- Dashboard SQL / service role have no JWT user.
    if auth.uid() is null then
        return new;
    end if;

    if public.is_superadmin() then
        return new;
    end if;

    raise exception 'Only superadmins can change superadmin access';
end;
$$;

drop trigger if exists protect_superadmin_flag on public.profiles;
create trigger protect_superadmin_flag
    before insert or update of is_superadmin
    on public.profiles
    for each row
    execute function public.protect_superadmin_flag();

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = id and coalesce(is_superadmin, false) = false);

drop policy if exists "profiles_update_superadmin" on public.profiles;
create policy "profiles_update_superadmin"
    on public.profiles for update
    to authenticated
    using (public.is_superadmin())
    with check (public.is_superadmin());

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

drop policy if exists "daily_meme_fortunes_select_superadmin" on public.daily_meme_fortunes;
create policy "daily_meme_fortunes_select_superadmin"
    on public.daily_meme_fortunes for select
    to authenticated
    using (public.is_superadmin() or auth.uid() = user_id);
