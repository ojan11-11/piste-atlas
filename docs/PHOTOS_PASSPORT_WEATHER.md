# Piste Atlas — Photography, passport, rankings, maps and forecasts

This release extends the GitHub Pages app with three progressive-enhancement files: atlas-photos.js, atlas-extras.js, atlas-extras.css. The additive database migration is supabase/003_photos_rankings.sql.

## Licensed editorial photographs

Eight original seed resort profiles use hand-picked, resort-specific candidate images on Wikimedia Commons. Other resorts may use a Wikidata P18 image when available. Every image must pass a Commons imageinfo license check before being displayed; accepted licenses include CC BY, CC BY-SA, CC0 and public-domain. The site displays the creator, original file link and license link. It does not scrape random resort websites or copy third-party photos to its repo. Resorts without a suitable photo retain the original mountain illustration.

Discovery-card images lazy-load near the viewport; profile heroes load eagerly. Gallery images load lazily. Imagery and the remote source may become unavailable. Wikimedia Commons creators and license terms must always be respected, including applicable share-alike rules for image adaptations.

## Mountain passport and rankings

My mountains displays private visit records, distinct states/provinces and countries, and milestones at 1, 5, 10, 25, 50 and 100 resorts. Summed resort vertical drop, if shown, is not a measured personal skiing statistic.

Rankings aggregate only published reviews' optional per-category 1–5 star ratings in a security-invoker view. A mountain needs at least three category ratings to enter a category leaderboard; empty rankings are expected early on.

## Interactive terrain map

Each resort with coordinates has an on-demand Leaflet/OSM map. A second, explicit user click loads approximately 4.5 km of nearby OpenStreetMap downhill piste and aerialway geometry using Overpass. Coverage may be incomplete and endpoints may be rate limited; no live terrain-open status or safety guidance is implied. Use official resort maps for skiing.

OSM copyright attribution must remain visible. Standard community-hosted OSM tiles are appropriate only for modest, compliant interactive usage. Read https://operations.osmfoundation.org/policies/tiles/ before scaling; switch to a dedicated tile plan for high traffic. Never hotlink OpenSkiMap's prohibited tile service.

## Powder Finder / weather

The Powder Finder sorts modeled snowfall totals (inches) over today + two or six more calendar days at up to 24 source-reviewed resorts with coordinates. Profile forecasts include Fahrenheit temperature. All values are approximate resort-center forecasts, not measured summit snowfall or lift/trail operation reports.

Source: https://open-meteo.com/ . The free API is permitted for NONCOMMERCIAL use only, subject to usage limits and CC BY 4.0 attribution. A commercial API license or other compliant provider is required before the site is monetized. Finder responses are cached for 30 minutes in the page session.

## Community photo uploads: owner rights and moderation

Bucket piste-community-photos is private, with JPEG/PNG/WebP uploads limited to 5 MB. Authenticated users can only upload under their own UID prefix, and must expressly confirm sharing rights. A record in public.piste_photos starts with pending status. Public readers can see approved photos only; owners may also see their own pending images. Private media is served with limited-time signed URLs. Approval is restricted to Supabase administrators; there is NO user approval policy.

Admin moderation workflow:
1. In Supabase Dashboard, inspect pending image objects and table records for resort relevance, copyright and privacy.
2. SQL to list pending records:
   SELECT id, resort_id, user_id, caption, storage_path, created_at FROM public.piste_photos WHERE status='pending' ORDER BY created_at;
3. After verifying an upload, an authorized admin may execute this SQL with the actual submission ID:
   UPDATE public.piste_photos SET status='approved', moderated_at=now() WHERE id='<SUBMISSION_UUID>' AND status='pending';
4. For rejected material, mark rejected, and remove the private file via the Storage administrative interface under an appropriate retention/takedown policy.

The pilot does not have a staff moderation dashboard, per-user upload rate limits or automated content screening yet. Set those up before opening community uploads to a large audience. Be prepared to process rights complaints and takedown requests.

## Tests

Run:
  node --check app.js
  node --check atlas-photos.js
  node --check atlas-extras.js
  node --check community.js
  node test.mjs

Also keep all existing OpenSkiData, directory and account test scripts in the CI suite. Browser-verify external image metadata, map tiles and Overpass, weather provider availability, login, uploads, pending privacy, approval, and public image display.

For a large audience, use a curated photo-admin panel, a permitted commercial forecast service, scalable map tiles and cached mountain trail geometry.
