# Piste Atlas — Ski Resort Discovery MVP

An **independent North American ski resort directory + discovery and comparison site**.

This first build is a **working static web application** with **eight sourced seed resorts**, not a claim to cover every U.S. and Canadian resort yet.

## Open it

No installation or build is required:

1. Open `index.html` in Chrome, Safari, Firefox, or Edge; **or**
2. From this directory, run `python3 -m http.server 8080`, then open `http://localhost:8080`.

## Current features

- Search by resort, town, state/province, country, or ski pass.
- Country, Epic/Ikon, terrain-percentage, skiable-acres, and annual-snowfall filters.
- Sort by size, snowfall, vertical drop, or name.
- Working overview with approximate geographically positioned resort pins (schematic backdrop).
- Eight mountain profiles with statistics, terrain distributions where verified, official trail map links, ticket links, and source notes.
- Compare up to four resorts side by side, including missing-data disclosure.
- Save favorite resorts in **this browser only** (localStorage; no cloud account).
- Responsive for phone, tablet, and desktop.
- Source-oriented PostgreSQL starter schema in `sql/schema.sql`.

## Deploy on GitHub Pages

1. Create a new repository (suggested: `piste-atlas`).
2. Upload `index.html`, `app.js`, `styles.css`, `assets/`, `data/`, and `sql/` with the same folder structure.
3. In **Settings → Pages**, choose **Deploy from a branch**, `main`, `/(root)`, then save.
4. Open the website URL shown in Pages settings once deployment succeeds.

Routes use hash navigation, so they work on GitHub Pages without server-side configuration. There are no npm dependencies, API keys, cookies, authentication, paid services, or third-party map tiles in this build.

## Data boundaries

- All seed data is in `data/resorts.js` (also exported as `data/resorts.seed.json` and `data/resorts.seed.csv` with `node tools/export-seed.mjs`). Its recorded sources are resort-published mountain-stat pages (and Ikon/Epic pass operator pages for pass affiliation).
- Values marked `null` were **not verified**. The UI shows “Not verified” rather than substituting a guessed number.
- Annual snowfall averages are not current snowfall reports. Resorts may measure them differently.
- The three-group terrain bars may aggregate a resort's more detailed difficulty convention. U.S./Canadian trail ratings are not standardized across resorts.
- For vertical drop, the source is either a reported resort figure or the difference between reported summit and base (recorded in the resort's `notes`).
- `ticketUrl` is a link to the resort ticket page; it is **not a verified daily price** and its path should be checked before publication as resort sites can change.
- Trail maps link to official pages; no copyrighted resort map artwork is embedded in the prototype.
- The map backdrop is an **illustrative schematic**, not a navigable or exact cartographic boundary map. Marker positioning is calculated from approximate resort coordinates. Production should use properly licensed GIS geometry and an interactive map renderer.
- Mountain art is locally rendered SVG/CSS illustration, not photography or trail-map imagery.
- This app currently has no scraper, reservation system, weather or live lift-condition feeds.

## Initial mountain source references (reviewed 2026-11-03)

- Big Sky: https://www.bigskyresort.com/mountain-info
- Vail: https://www.vail.com/the-mountain/about-the-mountain/mountain-info.aspx
- Whistler Blackcomb: https://www.whistlerblackcomb.com/the-mountain/about-the-mountain/mountain-info.aspx
- Park City: https://www.parkcitymountain.com/the-mountain/about-the-mountain/mountain-info.aspx
- Jackson Hole: https://www.jacksonhole.com/mountain-stats
- Lake Louise: https://www.skilouise.com/explore-winter/winter-ski-ride/mountain-stats/
- Lake Louise terrain: https://www.skilouise.com/faq
- Killington: https://killington.com/mountain-stats
- Tremblant: https://www.tremblant.ca/mountain-village/mountain-info/tremblant-statistics
- Ikon destinations: https://www.ikonpass.com/en/destinations
- Epic-operated resorts: https://www.epicpass.com/regions/partner-resorts.aspx
- Geographic expansion candidate: https://www.openskidata.org/ (ODbL; follow attribution and share-alike rules)

## Next build steps

1. **Exhaustive resort directory:** Import OpenSkiData ski-area metadata, filter operating and lift-served downhill facilities for US/CA, deduplicate combined resorts/independent bases, and manually reconcile status. Avoid counting Nordic-only centers as downhill resorts.
2. **Production database:** Move curated fields into PostgreSQL/Supabase using `sql/schema.sql`. Add source-level provenance and review tooling.
3. **Interactive map:** Replace illustrative overview with OSM/MapLibre geographic vector tiles under a compliant license and tile-hosting plan. Do not hotlink OpenSkiMap tiles (their direct tile usage is disallowed).
4. **Ticket price collection:** Build compliant official APIs/partnerships/structured data capture, with price observations for visit date, purchase date, age, ticket type, and USD/CAD currency. If reliable live pricing is unavailable, retain official outbound links.
5. **Snow/weather:** Historical snowfall series separate from annual resort claims, plus forecast source and freshness metadata.
6. **Publishing:** Build a content review/admin panel, automation with source checks, SEO metadata, public corrections workflow, and performance monitoring.

## Data quality checklist

Never publish a scraped or third-party claim without recording its source and date. Track discrepancies in lift counts (surface lifts, carpets, gondolas), terrain classification methodology, acreage boundaries, vertical definitions, snowfall measuring points, currency and ticket type, and combined-resort boundaries (e.g., Killington vs. Pico).

## Detailed planning document

See [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) for the sitemap, visual design system, data-ingestion architecture, phased development roadmap, and acceptance criteria.

## Smoke tests

Run `node test.mjs` to test core HTML rendering and navigation/compare state without requiring network or dependencies.


## OpenSkiData directory integration (v0.3)

Piste Atlas now supports a **separate ODbL geographic discovery layer** generated from [OpenSkiData](https://www.openskidata.org/) while retaining the eight existing resort-sourced profiles in `data/resorts.js`. The OpenSkiData snapshot (`data/resorts.openskidata.js`) contains only US/Canada locations with downhill activity and mapped lifts; explicitly inactive and Nordic-only areas are excluded. These flags **do not guarantee a resort is currently open**.

Mapped lift counts, mapped run segments, and mapped elevation spans are held separately from officially verified mountain statistics. Ticket prices, passes, snowfall, acreage, trails, and trail maps remain unverified for new records. The site shows unknown values as unknown.

The `development` branch runs `tools/sync-openskidata.mjs` through a GitHub Actions workflow. To refresh manually: **Actions → Sync OpenSkiData directory → Run workflow**, choose `development`. The workflow checks the upstream build timestamp and refuses suspiciously small/large imports. Review and merge its PR to publish on `main`.

OpenSkiData is derived from OpenStreetMap and Skimap.org and is licensed under **ODbL**. The generated derivative dataset is distributed separately with attribution: Data from OpenSkiData / OpenSkiMap.org, © OpenStreetMap contributors (ODbL), Skimap.org, Who's On First, © Mapterhorn. See `docs/OPENSKIDATA.md` for refresh and quality limitations. Provider terms permit automated downloads at most once daily.

## Official resort enrichment — batch 01 (v0.4)

The site now has **23 operator-source-reviewed mountain profiles**: eight original launch profiles plus 15 reviews loaded from `data/resorts.enriched.js`. The remaining **725** are still OpenSkiData map-only listings, which are **not independently confirmed as operating resorts**. The total remains 748 unique ski-area listings.

The extra review file loads **after** the ODbL geographic dataset and before `app.js`, merging source-checked facts by stable resort ID. This prevents the automated OpenSkiData importer from overwriting our official resort statistics. Profiles include links to the resort's own information pages, reviewed dates, caveats about inconsistent figures and official trail-map or ticket links only where identified.

The directory adds a **Data verification** filter (all / operator-reviewed / mapped only). Conditional examples for 2026–27 Jay Peak and Ski Sundown adult tickets include age, day restrictions and other conditions; they are not live ticket quotes. Other resorts link to operator ticket pages instead of showing fabricated prices.

See [Operator reviews and reconciliation notes](docs/OPERATOR_REVIEWS.md) for all 15 new profiles and their source pages. The full site and review overlay are validated with:

```bash
node --check app.js
node test.mjs
node tools/test-openskidata.mjs
node tools/validate-openskidata.mjs
node tools/test-reviewed-profiles.mjs
node tools/test-site-directory.mjs
```

**Adding future verified stats:** Update `data/resorts.enriched.js`, not the generated `data/resorts.openskidata.js`. Always record the operator URL, review date, field definitions and unit conversions; mark conflicting or unavailable fields as `null`. Inspect whether a trail map shows downhill winter trails, not summer bike trails. Submit a pull request after the validation workflow succeeds.


## v0.5 — automated resort source research (snowfall deferred)

The first production-style research pilot covers **50 unreviewed North American ski areas** without Mountain News or resort submissions. The research collector respects robots.txt, caps requests, stays on mapped site domains, looks for official mountain-statistics, winter trail-map, and lift-ticket pages, and stores short metric excerpts with source links for human review.

Initial results: **43 of 50 reachable sites**, **51 candidate numbers**, **40 winter-map link candidates**, **82 ticket link candidates**, and **13 automated quality warnings**. These are evidence/candidate counts, **not verified facts or a count of distinct maps or ticket pages**. Seven sites could not be crawled; access restrictions and network errors remain visible in the report. Snowfall remains out of scope.

The pipeline writes:
- reports/enrichment-pilot.json — source URLs, numeric evidence, page-link suggestions, access errors
- reports/ENRICHMENT_PILOT.md — readable resort-by-resort research summary
- reports/enrichment-audit.json — flagged conflicts and suspicious contexts
- reports/ENRICHMENT_AUDIT.md — reviewer-facing flags

**No data from these reports is automatically published to resort pages.** For example, an operator homepage might mention 6,000 acres of total resort property and only 83 acres of skiable slopes. Such claims must be manually reconciled against official source pages before entering the curated resort layer. See docs/ENRICHMENT_ENGINE.md for run instructions, permission considerations, and phase planning.

The engine is a GitHub Action named "Research official resort sources (v0.5)" and runs tests plus a guarded crawler. It can retry only the previously inaccessible sites instead of needlessly recontacting the successful ones. Its outputs are artifacts and commits on the feature branch, not changes to the public GitHub Pages site.


## v0.6 — Published pilot enrichment (official stats, maps and tickets)

The 50-resort source research pilot has now produced **18 additional operator-reviewed ski area profiles** after human source checking. These include Olympic Valley and Alpine Meadows as separately mapped areas of Palisades Tahoe, plus 16 other resorts across the United States and Canada.

The directory retains **748 unique listings**: **8 original source-checked profiles + 33 enriched OpenSkiData entries = 41 reviewed profiles**, with **707 map-only candidates** remaining. No resort location or ID was removed or invented.

The additional records supply resort-reported skiable acreage, vertical where explicitly stated, lift/trail counts, terrain splits, summit/base elevations, winter trail-map pages, ticket pages and documented discrepancy notes **where confirmed**. New snowfall values are deliberately left unknown. No map artwork or online ticket pricing is copied into this repository.

Examples of necessary validation:
- Powder Ridge lists 255 acres of overall property but only **80 skiable acres**.
- Okemo mentions 4,000 acres of state forest, but the operator's mountain-stat section reports **667 skiable acres**.
- Two peaks of Palisades Tahoe each have their own distinct mountain statistics; publishing the same combined 6,000 acres twice would mislead comparisons.
- Some resort pages report conflicting trail counts, so those fields remain unverified when unresolved.

All reviews contain source URLs, review dates and human-readable notes. See [Operator review batch 02](docs/OPERATOR_REVIEW_BATCH_02.md). The GitHub Actions verification workflow checks resort IDs, 748-entry uniqueness, reviewed counts, source URLs, selective numeric invariants and map rendering.

For the next phase, extend source verification to more candidates, refine stat extraction, and prioritize direct official winter-map and lift-ticket links. Snowfall is a later phase.


## v0.9 — Mountain logbook, user accounts and resort reviews

Piste Atlas now includes a community interface integrated into its 748 mountain profiles:

- A **My mountains** dashboard with visited-resort count, optional visit dates and notes.
- A **Mark as visited** form on every resort page. Without a connected backend, visit history is saved only in that browser.
- A Supabase email magic-link login implementation for cross-device private visits, with an optional guest-visit import.
- **1–5 star ratings, public written reviews, editing and deleting your review**, public resort averages and recent review feeds, plus a review-reporting feature.
- An editable public display name. Account email addresses and visited lists are private.

GitHub Pages continues to host the static site. Online accounts require a Supabase project and the SQL schema in **supabase/001_community.sql**. The empty **community-config.js** placeholder deliberately contains no project credentials. Supabase is now connected to the Piste Atlas organization and the community database has been installed. Visitors can use the guest logbook immediately. Before email sign-in works end-to-end, configure the Auth Site URL and Redirect URL in Supabase to match https://ojan11-11.github.io/piste-atlas/ (see docs/COMMUNITY_SETUP.md).

Read **docs/COMMUNITY_SETUP.md** for deployment, privacy and moderation. The CI suite runs the guest interface and mocked signed-in interactions with **tools/test-community.mjs** and **tools/test-community-auth.mjs**.

Only a Supabase **publishable key** may be included in the public site. Never publish a Supabase secret or service-role key. Apply rate limits, account privacy and moderation policies and test real RLS permissions before broad public onboarding.
