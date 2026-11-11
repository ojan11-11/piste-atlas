-- Piste Atlas v0.11: title/comments are optional; highlight ratings are optional 1–5 stars.
-- The overall rating remains mandatory. Existing reviews remain valid and unmodified.

alter table public.piste_reviews
  alter column title drop not null,
  alter column body drop not null;

alter table public.piste_reviews
  drop constraint if exists piste_reviews_title_check,
  drop constraint if exists piste_reviews_body_check;

alter table public.piste_reviews
  add constraint piste_reviews_title_check
    check (title is null or (char_length(btrim(title)) between 1 and 100)),
  add constraint piste_reviews_body_check
    check (body is null or (char_length(btrim(body)) between 1 and 2000));

alter table public.piste_reviews
  add column if not exists highlights jsonb not null default '{}'::jsonb;

-- Validates category keys and values inside the database (not just in browser JavaScript).
create or replace function public.piste_valid_review_highlights(payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when pg_catalog.jsonb_typeof(payload) is distinct from 'object' then false
    else not exists (
      select 1
      from pg_catalog.jsonb_each(payload) as h(category, stars)
      where h.category <> all (array[
        'food', 'lifts', 'expert_terrain', 'beginner_terrain',
        'intermediate_terrain', 'terrain_parks', 'rentals', 'housing',
        'hotels', 'town', 'restaurants', 'grooming',
        'apres_ski', 'value'
      ]::text[])
      or pg_catalog.jsonb_typeof(h.stars) <> 'number'
      or h.stars::text !~ '^[1-5]$'
    )
  end;
$$;

alter table public.piste_reviews
  drop constraint if exists piste_reviews_highlights_check;
alter table public.piste_reviews
  add constraint piste_reviews_highlights_check
    check (public.piste_valid_review_highlights(highlights));

grant insert (highlights), update (highlights) on public.piste_reviews to authenticated;

comment on column public.piste_reviews.highlights is
  'Optional category 1–5 star ratings; e.g. lifts, beginner/expert terrain, rentals, hotels, town, food and restaurants.';

-- Existing row-level policies and client ownership constraints remain unchanged.
