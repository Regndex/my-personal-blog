-- ============================================================================
-- Personal Blog — Supabase schema
-- Run this once in your project's SQL Editor (Supabase Dashboard -> SQL Editor
-- -> New query -> paste -> Run).
-- ============================================================================

-- 1) Table: posts ------------------------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  image_url   text,
  video_url   text,
  created_at  timestamptz not null default now()
);

-- Row Level Security: locked down by default, opened up explicitly below.
alter table public.posts enable row level security;

-- Anyone (including logged-out visitors) can read posts.
drop policy if exists "Public can read posts" on public.posts;
create policy "Public can read posts"
  on public.posts
  for select
  to anon, authenticated
  using (true);

-- Only a signed-in user can publish. Pair this with disabling public
-- sign-ups (see README.md) — otherwise anyone could call auth.signUp()
-- directly and become "authenticated" themselves, sidestepping this.
drop policy if exists "Public can insert posts" on public.posts;
drop policy if exists "Authenticated can insert posts" on public.posts;
create policy "Authenticated can insert posts"
  on public.posts
  for insert
  to authenticated
  with check (true);


-- 2) Storage bucket: blog-images ---------------------------------------------
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Public read access, so the uploaded cover images can be displayed on the
-- site via their public URL.
drop policy if exists "Public can view blog images" on storage.objects;
create policy "Public can view blog images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

-- Only a signed-in user can upload — mirrors the posts policy above.
drop policy if exists "Public can upload blog images" on storage.objects;
drop policy if exists "Authenticated can upload blog images" on storage.objects;
create policy "Authenticated can upload blog images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'blog-images');
