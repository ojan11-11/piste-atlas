-- Photo curation: one administrator-selected, approved community image per resort.
-- Authenticated members retain INSERT-only rights for photo rows; no update
-- grant exists to set the featured flag or moderation status.
alter table public.piste_photos
  add column if not exists is_featured boolean not null default false;
alter table public.piste_photos
  drop constraint if exists piste_featured_requires_approval;
alter table public.piste_photos
  add constraint piste_featured_requires_approval check (not is_featured or status='approved');
create unique index if not exists piste_one_featured_photo_per_resort
  on public.piste_photos(resort_id) where is_featured;
comment on column public.piste_photos.is_featured is
  'Admin-only cover selection; visible to public only when photo is approved';
