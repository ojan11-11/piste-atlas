-- Piste Atlas community MVP. Run once in a separate Supabase project's SQL editor.
-- No passwords, email addresses, or secret keys are stored in these tables.
-- Public resort IDs are stable strings from data/resorts.js / OpenSkiData.

create extension if not exists pgcrypto;

create table if not exists public.piste_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.piste_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  resort_id text not null check (resort_id ~ '^[a-zA-Z0-9._-]{3,160}$'),
  visited_on date,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, resort_id)
);

create index if not exists piste_visits_resort_idx on public.piste_visits(resort_id);

create table if not exists public.piste_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resort_id text not null check (resort_id ~ '^[a-zA-Z0-9._-]{3,160}$'),
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(btrim(title)) between 3 and 100),
  body text not null check (char_length(btrim(body)) between 20 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint piste_review_one_per_user_per_resort unique (user_id,resort_id)
);

create index if not exists piste_reviews_public_by_resort_idx
  on public.piste_reviews(resort_id,created_at desc) where status = 'published';
create index if not exists piste_reviews_by_user_idx on public.piste_reviews(user_id,created_at desc);

create table if not exists public.piste_review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.piste_reviews(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','misinformation','other')),
  created_at timestamptz not null default now(),
  unique (review_id,reporter_id)
);
create index if not exists piste_reports_by_review_idx on public.piste_review_reports(review_id);

-- Database, not client, controls timestamps.
create or replace function public.piste_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end
$$;
drop trigger if exists piste_profiles_touch on public.piste_profiles;
create trigger piste_profiles_touch before update on public.piste_profiles
  for each row execute function public.piste_touch_updated_at();
drop trigger if exists piste_visits_touch on public.piste_visits;
create trigger piste_visits_touch before update on public.piste_visits
  for each row execute function public.piste_touch_updated_at();
drop trigger if exists piste_reviews_touch on public.piste_reviews;
create trigger piste_reviews_touch before update on public.piste_reviews
  for each row execute function public.piste_touch_updated_at();

alter table public.piste_profiles enable row level security;
alter table public.piste_visits enable row level security;
alter table public.piste_reviews enable row level security;
alter table public.piste_review_reports enable row level security;

revoke all on public.piste_profiles, public.piste_visits, public.piste_reviews, public.piste_review_reports from anon,authenticated;

-- Public display names and published reviews are public; visit histories stay PRIVATE.
grant select on public.piste_profiles to anon,authenticated;
grant insert (user_id,display_name), update (display_name) on public.piste_profiles to authenticated;
grant select,delete on public.piste_visits to authenticated;
grant insert (user_id,resort_id,visited_on,note),update (visited_on,note) on public.piste_visits to authenticated;
grant select on public.piste_reviews to anon,authenticated;
grant insert (user_id,resort_id,rating,title,body),update (rating,title,body),delete on public.piste_reviews to authenticated;
grant select on public.piste_review_reports to authenticated;
grant insert (review_id,reporter_id,reason) on public.piste_review_reports to authenticated;

drop policy if exists "piste profiles viewable" on public.piste_profiles;
create policy "piste profiles viewable" on public.piste_profiles
 for select to anon,authenticated using (true);
drop policy if exists "piste user creates their profile" on public.piste_profiles;
create policy "piste user creates their profile" on public.piste_profiles
 for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "piste user edits their profile" on public.piste_profiles;
create policy "piste user edits their profile" on public.piste_profiles
 for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "piste own visits read" on public.piste_visits;
create policy "piste own visits read" on public.piste_visits
 for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "piste own visits add" on public.piste_visits;
create policy "piste own visits add" on public.piste_visits
 for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "piste own visits edit" on public.piste_visits;
create policy "piste own visits edit" on public.piste_visits
 for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "piste own visits delete" on public.piste_visits;
create policy "piste own visits delete" on public.piste_visits
 for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "piste public reviews read" on public.piste_reviews;
create policy "piste public reviews read" on public.piste_reviews
 for select to anon,authenticated using (status='published' or user_id = (select auth.uid()));
drop policy if exists "piste own reviews add" on public.piste_reviews;
create policy "piste own reviews add" on public.piste_reviews
 for insert to authenticated with check (user_id = (select auth.uid()) and status = 'published');
drop policy if exists "piste own reviews edit" on public.piste_reviews;
create policy "piste own reviews edit" on public.piste_reviews
 for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "piste own reviews delete" on public.piste_reviews;
create policy "piste own reviews delete" on public.piste_reviews
 for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "piste own review reports read" on public.piste_review_reports;
create policy "piste own review reports read" on public.piste_review_reports
 for select to authenticated using (reporter_id = (select auth.uid()));
drop policy if exists "piste report published review" on public.piste_review_reports;
create policy "piste report published review" on public.piste_review_reports
 for insert to authenticated with check (
   reporter_id = (select auth.uid()) and exists (
    select 1 from public.piste_reviews r
    where r.id = review_id and r.status='published' and r.user_id <> (select auth.uid())
   )
 );

-- The aggregate counts only published reviews, regardless of the viewer's account.
create or replace view public.piste_resort_rating_summaries
with (security_invoker = true) as
 select resort_id, count(*)::integer as review_count,
        round(avg(rating)::numeric, 2) as average_rating
 from public.piste_reviews
 where status='published'
 group by resort_id;
grant select on public.piste_resort_rating_summaries to anon,authenticated;

comment on table public.piste_visits is 'Private account-owned visited mountains';
comment on table public.piste_reviews is 'Public resort reviews; admins may hide abusive rows in status';
comment on table public.piste_review_reports is 'Private abuse reports for moderator review';
