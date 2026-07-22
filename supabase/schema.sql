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
create policy "Public can read posts"
  on public.posts
  for select
  to anon, authenticated
  using (true);

-- Anyone can publish a post. This matches the brief (the Admin Panel has no
-- login screen), but it means the /admin route is only "hidden", not
-- protected — see the security note in README.md before deploying publicly.
create policy "Public can insert posts"
  on public.posts
  for insert
  to anon, authenticated
  with check (true);


-- 2) Storage bucket: blog-images ---------------------------------------------
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Public read access, so the uploaded cover images can be displayed on the
-- site via their public URL.
create policy "Public can view blog images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

-- Public upload access, mirroring the open "insert posts" policy above.
create policy "Public can upload blog images"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'blog-images');
