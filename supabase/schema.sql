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

-- Editing and deleting existing posts — same authenticated-only rule.
drop policy if exists "Authenticated can update posts" on public.posts;
create policy "Authenticated can update posts"
  on public.posts
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated can delete posts" on public.posts;
create policy "Authenticated can delete posts"
  on public.posts
  for delete
  to authenticated
  using (true);

-- Tags/categories: a simple text array (e.g. '{"سفر","يوميات"}'), rather
-- than a separate categories table — plenty for a single-author blog and
-- avoids an extra join for every listing query.
alter table public.posts add column if not exists tags text[] not null default '{}';


-- 2) Table: comments ----------------------------------------------------------
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  author_name  text not null,
  content      text not null,
  is_approved  boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.comments enable row level security;

-- Visitors only ever see approved comments...
drop policy if exists "Public can read approved comments" on public.comments;
create policy "Public can read approved comments"
  on public.comments
  for select
  to anon, authenticated
  using (is_approved = true);

-- ...but the signed-in owner sees everything, to moderate pending ones.
-- (Both SELECT policies apply to `authenticated` and are OR'd together by
-- Postgres, so a signed-in user matches this broader one regardless.)
drop policy if exists "Authenticated can read all comments" on public.comments;
create policy "Authenticated can read all comments"
  on public.comments
  for select
  to authenticated
  using (true);

-- Anyone can submit a comment, but it is forced to start unapproved —
-- `with check` is enforced server-side, so a visitor cannot self-approve
-- even by calling the API directly with is_approved: true in the payload.
drop policy if exists "Public can insert comments" on public.comments;
create policy "Public can insert comments"
  on public.comments
  for insert
  to anon, authenticated
  with check (is_approved = false);

-- Only the owner can approve (update) or remove (delete) comments.
drop policy if exists "Authenticated can update comments" on public.comments;
create policy "Authenticated can update comments"
  on public.comments
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated can delete comments" on public.comments;
create policy "Authenticated can delete comments"
  on public.comments
  for delete
  to authenticated
  using (true);


-- 3) Storage bucket: blog-images ---------------------------------------------
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

-- Deleting a post's cover image from Storage when the post itself is deleted.
drop policy if exists "Authenticated can delete blog images" on storage.objects;
create policy "Authenticated can delete blog images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blog-images');
