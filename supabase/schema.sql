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

-- Anyone (including logged-out visitors) can read PUBLISHED posts only.
-- A post counts as published once published_at is set and is not in the
-- future — this is what makes drafts and scheduled posts invisible to the
-- public while still fully visible to the signed-in owner (next policy).
drop policy if exists "Public can read posts" on public.posts;
create policy "Public can read published posts"
  on public.posts
  for select
  to anon, authenticated
  using (published_at is not null and published_at <= now());

-- The signed-in owner always sees everything — published, draft, or
-- scheduled — so the admin area can list/edit/preview all of it.
drop policy if exists "Authenticated can read all posts" on public.posts;
create policy "Authenticated can read all posts"
  on public.posts
  for select
  to authenticated
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

-- Publishing/scheduling: NULL = draft, a future timestamp = scheduled, a
-- past-or-now timestamp = published. The app sets this value explicitly
-- depending on which button the author clicks (see README.md for the
-- one-time backfill needed when upgrading an existing project).
alter table public.posts add column if not exists published_at timestamptz;

-- Simple counters for the like button and view counter.
alter table public.posts add column if not exists likes_count integer not null default 0;
alter table public.posts add column if not exists views_count integer not null default 0;

-- Atomic increment functions, callable by anyone (including anon visitors).
-- `security definer` lets them update `likes_count`/`views_count` even
-- though the general UPDATE policy above is authenticated-only — safe to
-- expose publicly because each function only ever touches that one
-- counter column, nothing else, so it can't be abused to edit other data.
create or replace function public.increment_post_likes(post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set likes_count = likes_count + 1 where id = post_id;
$$;
grant execute on function public.increment_post_likes(uuid) to anon, authenticated;

create or replace function public.increment_post_views(post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set views_count = views_count + 1 where id = post_id;
$$;
grant execute on function public.increment_post_views(uuid) to anon, authenticated;


-- 2) Table: comments ----------------------------------------------------------
create table if not exists public.comments (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references public.posts(id) on delete cascade,
  author_name        text not null,
  content            text not null,
  is_approved        boolean not null default false,
  created_at         timestamptz not null default now(),
  parent_comment_id  uuid references public.comments(id) on delete cascade
);

-- Upgrading an existing project: add the column if the table already existed.
alter table public.comments add column if not exists parent_comment_id uuid
  references public.comments(id) on delete cascade;

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


-- ============================================================================
-- ONE-TIME MIGRATION — only if you had posts before the drafts/scheduling
-- feature existed. Run this ONCE, by itself, right after the block above.
--
-- It treats every already-existing post (which has no `published_at` yet)
-- as already published at its original creation date, so nothing you've
-- already published quietly turns into an invisible draft.
--
-- Do NOT run this again later — once you start saving real drafts on
-- purpose (published_at left as NULL intentionally), re-running this would
-- incorrectly publish them too, since a real draft and "not migrated yet"
-- look identical at the database level.
-- ============================================================================
-- update public.posts set published_at = created_at where published_at is null;
