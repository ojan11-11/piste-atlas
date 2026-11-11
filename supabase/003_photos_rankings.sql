-- Piste Atlas phase 2: optional category rankings and moderated community photography.
-- Public rankings include only published reviews; submitted photos remain private until approved.
create table if not exists public.piste_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resort_id text not null check (resort_id ~ '^[A-Za-z0-9._-]{3,160}$'),
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  caption text check (caption is null or char_length(btrim(caption)) between 1 and 160),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  constraint piste_photo_owner_path check (split_part(storage_path, '/', 1) = user_id::text)
);
create index if not exists piste_photos_resort_approved_idx
  on public.piste_photos(resort_id, created_at desc) where status = 'approved';
create index if not exists piste_photos_owner_idx on public.piste_photos(user_id, created_at desc);
alter table public.piste_photos enable row level security;
revoke all on public.piste_photos from anon,authenticated;
grant select on public.piste_photos to anon,authenticated;
grant insert (user_id,resort_id,storage_path,caption) on public.piste_photos to authenticated;
grant delete on public.piste_photos to authenticated;
drop policy if exists "piste approved or own photos readable" on public.piste_photos;
create policy "piste approved or own photos readable" on public.piste_photos
  for select to anon,authenticated
  using (status='approved' or user_id=(select auth.uid()));
drop policy if exists "piste submit own photo" on public.piste_photos;
create policy "piste submit own photo" on public.piste_photos
  for insert to authenticated with check (user_id=(select auth.uid()) and status='pending');
drop policy if exists "piste delete own pending photo" on public.piste_photos;
create policy "piste delete own pending photo" on public.piste_photos
  for delete to authenticated using (user_id=(select auth.uid()) and status='pending');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('piste-community-photos','piste-community-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "piste photo owner uploads" on storage.objects;
create policy "piste photo owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id='piste-community-photos'
    and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "piste photo access controlled" on storage.objects;
create policy "piste photo access controlled" on storage.objects
  for select to anon,authenticated
  using (bucket_id='piste-community-photos'
    and ((storage.foldername(name))[1]=(select auth.uid())::text
      or exists(select 1 from public.piste_photos p
         where p.storage_path=name and p.status='approved')));
drop policy if exists "piste owner removes their photo file" on storage.objects;
create policy "piste owner removes their photo file" on storage.objects
  for delete to authenticated
  using (bucket_id='piste-community-photos'
    and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace view public.piste_category_rankings with (security_invoker=true) as
select r.resort_id, x.key as category,
  round(avg((x.value #>> '{}')::numeric),2) as average_rating,
  count(*)::integer as rating_count
from public.piste_reviews r
cross join lateral jsonb_each(r.highlights) as x(key,value)
where r.status='published' and jsonb_typeof(x.value)='number'
  and x.key in ('food','lifts','expert_terrain','beginner_terrain',
  'intermediate_terrain','terrain_parks','rentals','housing','hotels',
  'town','restaurants','grooming','apres_ski','value')
group by r.resort_id,x.key;
revoke all on public.piste_category_rankings from public;
grant select on public.piste_category_rankings to anon,authenticated;
comment on table public.piste_photos is 'Private pending submissions, approved public community resort photos; moderation performed by trusted admin';
