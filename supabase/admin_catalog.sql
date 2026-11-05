-- Catalog tables for the superadmin console.
-- Run AFTER supabase/admin_schema.sql (needs public.is_superadmin()).

create or replace function public.apply_superadmin_crud(table_name text)
returns void
language plpgsql
as $$
begin
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_sa_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_sa_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_sa_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_sa_delete', table_name);
    execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_superadmin())',
        table_name || '_sa_select', table_name
    );
    execute format(
        'create policy %I on public.%I for insert to authenticated with check (public.is_superadmin())',
        table_name || '_sa_insert', table_name
    );
    execute format(
        'create policy %I on public.%I for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin())',
        table_name || '_sa_update', table_name
    );
    execute format(
        'create policy %I on public.%I for delete to authenticated using (public.is_superadmin())',
        table_name || '_sa_delete', table_name
    );
end;
$$;

create table if not exists public.llm_providers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    base_url text,
    is_enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.llm_models (
    id uuid primary key default gen_random_uuid(),
    provider_id uuid references public.llm_providers (id) on delete set null,
    name text not null,
    model_key text not null,
    is_enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.prompt_chains (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.prompt_chain_steps (
    id uuid primary key default gen_random_uuid(),
    chain_id uuid not null references public.prompt_chains (id) on delete cascade,
    step_order integer not null default 1,
    name text not null,
    prompt_template text not null default '',
    model_id uuid references public.llm_models (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.prompt_chain_mix (
    id uuid primary key default gen_random_uuid(),
    name text not null default 'Default mix',
    notes text,
    is_active boolean not null default true,
    updated_at timestamptz not null default now()
);

create table if not exists public.prompt_chain_mix_entries (
    id uuid primary key default gen_random_uuid(),
    mix_id uuid not null references public.prompt_chain_mix (id) on delete cascade,
    chain_id uuid not null references public.prompt_chains (id) on delete cascade,
    weight numeric not null default 1 check (weight >= 0),
    unique (mix_id, chain_id)
);

create table if not exists public.terms (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    title text not null,
    body text not null default '',
    is_published boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.images (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles (id) on delete set null,
    storage_path text not null,
    image_url text not null,
    alt_text text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.generation_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles (id) on delete set null,
    prompt text not null default '',
    chain_id uuid references public.prompt_chains (id) on delete set null,
    model_id uuid references public.llm_models (id) on delete set null,
    status text not null default 'pending',
    created_at timestamptz not null default now()
);

create table if not exists public.generation_examples (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    prompt text not null default '',
    output_text text not null default '',
    image_url text,
    model_id uuid references public.llm_models (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.llm_responses (
    id uuid primary key default gen_random_uuid(),
    request_id uuid references public.generation_requests (id) on delete cascade,
    model_id uuid references public.llm_models (id) on delete set null,
    content text not null default '',
    token_count integer,
    latency_ms integer,
    created_at timestamptz not null default now()
);

create table if not exists public.allowed_signup_domains (
    id uuid primary key default gen_random_uuid(),
    domain text not null unique,
    notes text,
    created_at timestamptz not null default now()
);

create table if not exists public.whitelisted_emails (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    notes text,
    created_at timestamptz not null default now()
);

insert into public.prompt_chain_mix (name, notes, is_active)
select 'Default mix', 'Traffic mix across prompt chains', true
where not exists (select 1 from public.prompt_chain_mix);

select public.apply_superadmin_crud('llm_providers');
select public.apply_superadmin_crud('llm_models');
select public.apply_superadmin_crud('prompt_chains');
select public.apply_superadmin_crud('prompt_chain_steps');
select public.apply_superadmin_crud('prompt_chain_mix');
select public.apply_superadmin_crud('prompt_chain_mix_entries');
select public.apply_superadmin_crud('terms');
select public.apply_superadmin_crud('images');
select public.apply_superadmin_crud('generation_requests');
select public.apply_superadmin_crud('generation_examples');
select public.apply_superadmin_crud('llm_responses');
select public.apply_superadmin_crud('allowed_signup_domains');
select public.apply_superadmin_crud('whitelisted_emails');

insert into storage.buckets (id, name, public)
values ('studio-images', 'studio-images', true)
on conflict (id) do update set public = true;

drop policy if exists "studio_images_public_read" on storage.objects;
drop policy if exists "studio_images_superadmin_insert" on storage.objects;
drop policy if exists "studio_images_superadmin_update" on storage.objects;
drop policy if exists "studio_images_superadmin_delete" on storage.objects;

create policy "studio_images_public_read"
    on storage.objects for select
    to public
    using (bucket_id = 'studio-images');

create policy "studio_images_superadmin_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'studio-images' and public.is_superadmin());

create policy "studio_images_superadmin_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'studio-images' and public.is_superadmin())
    with check (bucket_id = 'studio-images' and public.is_superadmin());

create policy "studio_images_superadmin_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'studio-images' and public.is_superadmin());
