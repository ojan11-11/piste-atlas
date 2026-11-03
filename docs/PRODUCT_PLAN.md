# Piste Atlas — Product and Technical Plan

**Concept:** A hybrid North American ski resort encyclopedia, map-based discovery product, and objective comparison engine. Working name is provisional.

## Product scope / boundary

Include public, operating, lift-served **alpine/downhill** areas in the U.S. (all 50 states where applicable, including Alaska) and Canada (all provinces/territories where applicable). A mountain is included regardless of acreage or destination-resort status. Clearly tag seasonal operations, ownership, ticket access restrictions, and unavailable metadata. Add Nordic-only, private-only, and historical/closed areas as separate optional categories rather than quietly mixing them with active downhill resorts.

**Resort entity policy:** Distinguish resort brand, interconnected ski complex, constituent mountain, and distinct ski area. Examples: Whistler and Blackcomb can be submountains of one skiable resort complex; Killington and Pico should not be double-counted when displaying Killington-only versus combined totals.

## Proposed sitemap

- `/` — landing experience, prominent search, selected resort recommendations and regions
- `/resorts` — index / data-driven filters / sort / list mode
- `/map` — geospatial resort discovery, zoom, clustering, regional filtering
- `/resorts/[slug]` — individual profile, official trail-map access, sourced stats, pass and ticket links
- `/compare?ids=...` — shareable 2–4 resort comparison table
- `/rankings` — popular list views: biggest, snowiest, greatest vertical, beginners, etc.
- `/regions/[slug]` — SEO-friendly state/province and destination guides
- `/methodology` — measurements, conflicting definitions, credits and corrections
- `/submit-correction` — transparent submission and moderation workflow

The static demo implements these as simple hash-based navigation for portability; production should use canonical clean URLs for search engines.

## UI / design system

- **Look:** premium alpine editorial meets functional data dashboard. Calm, clear, outdoors-oriented; no information-dense travel-site clutter.
- **Palette:** midnight alpine `#09232b`, deep teal `#103840`, glacier mint `#a7ead5`, off-white snow `#f6f8f6`, primary ink `#11282c`, subtle border `#dce5e3`.
- **Typography:** strong sans-serif headings, occasionally contrasting italic serif accents; compact metadata, generous whitespace.
- **Core patterns:** resort card (name / town / pass / acres / vertical / snowfall / terrain strip / compare), filter sidebar, profile stat tiles, source notes, clear missing-value state, mobile-first layouts.
- **Photography:** eventual photos must be properly licensed, approved, and attributed. Prototype uses original SVG/CSS illustrations instead.
- **Map:** eventual real lat/long pin map with marker clustering and data-source attribution; prototype's background is schematic.
- **Accessibility:** semantic landmarks, keyboard controls, accessible labels, visible focus, contrasts, reduced motion, and text equivalents to terrain colors.

## Discovery requirements

Search by name, town, region, state/province, and pass. Filters: country, region, pass membership, skill-friendliness, minimum skiable acreage, annual snowfall, vertical drop, night skiing, snowmaking, distance to airport/city, park features, and date-specific ticket cost (only when reliably sourced). Sort: acreage, snowfall, vertical drop, price (for chosen ticket parameters), alphabetical. Favorites and comparisons should be shareable in a later build.

**Terrain filter caveat:** Resort trail classifications are not standardized between North American mountains. Normalize coarse discovery groupings only after preserving each resort's local legend and original percentages. Do not misrepresent intermediate trails at one mountain as directly equivalent to another's.

## Resort profile requirements

1. Name, location, status, region, verified official website.
2. Original resort trail map, either official outbound link or properly licensed hosted asset with usage rights recorded.
3. Stats: skiable acres, vertical drop, summit/base, trail counts, lift totals (with accounting rules), lift types, average annual snowfall (period and measurement point), terrain mix, terrain parks, night skiing, snowmaking.
4. Pass membership with access rules, blackout dates, reservation requirements, and season.
5. Ticket prices by selected visit date, currency, purchase date, age bracket, product type, taxes/fees where supplied, and booking deep link.
6. Data transparency for each metric: official source, last verified date, original label/definition, discrepancy notes.
7. Related/similar resorts, regional guides, transportation proximity (later phase).

## Source ingestion strategy

1. Import OpenSkiData's published datasets **at most once daily** and observe its attribution, ODbL share-alike, and tile-use terms.
2. Filter geographic entries for US and Canada, downhill/mixed activity, active operation, accessible public ski areas. De-duplicate open datasets against the official name, Wikidata IDs, external feature IDs, coordinates, operating company and manual aliases.
3. Run a curator review of suspected duplicates, split-area destinations, non-operating areas, nordic-only facilities and previously closed mountains.
4. Layer official resort source records over the geographic base, with per-field provenance and source-date metadata.
5. Treat verified operating status, map links, winter pass relationships, and price quote freshness as distinct editorial workflows.
6. Use source-change monitoring with human approval for ambiguous discrepancies; log superseded values instead of overwriting historical prices.

## High-level architecture after validation

- **Frontend:** Next.js or equivalent typed SSR framework, with static and server-rendered resort/region pages for SEO.
- **Database:** PostgreSQL / Supabase. Core tables in `sql/schema.sql`.
- **Geospatial:** PostGIS for radius queries, MapLibre or another licensed map renderer, compliant self-hosted/commercial tiles.
- **Ingestion:** Python/TypeScript ETL with source connectors, normalization rules, manual review queue, and per-source rate limits.
- **Cache / CDN:** Cache mostly-static mountain stats separately from high-frequency status and ticket records.
- **Admin:** authenticated editor role for resort-source verification, map rights, conflict handling, and content publishing.
- **Monitoring:** freshness alerts for expired ticket observations, dead official map links, schema changes, and unusual data shifts.

## Release sequence and acceptance tests

### Release 0 — Current prototype

- [x] Search and filter resort sample
- [x] Responsive cards and profile pages
- [x] Independent trail-map and ticket links
- [x] Up to four resort comparisons
- [x] Save favorites in local browser
- [x] Schema starter and source URLs
- [ ] Exhaustive verified North American coverage
- [ ] Actual geographic basemap and licensed trail-map hosting
- [ ] Live prices, live snow/weather, operational status
- [ ] Server database, editorial admin, permanent shareable comparisons

### Release 1 — Real directory

- [ ] Build resort import, de-duplication, and manual review dashboard.
- [ ] Complete US/CA active downhill resort listing with individual source and review states.
- [ ] Validate all external links; repair broken pages and avoid unverified pricing fields.
- [ ] Publish canonical search-engine-friendly resort pages.
- [ ] Integrate an interactive map with compliant geodata and provenance.

### Release 2 — Intelligent comparison

- [ ] Advanced filtering, season pass restrictions, neighborhood/airport proximity.
- [ ] Side-by-side mountain comparison with shareable URLs.
- [ ] Transparent ranking/match scoring with user-adjustable priorities.
- [ ] User correction and resort-claim workflow.

### Release 3 — Dynamic trip planning

- [ ] Verified lift tickets by date/currency/age/type with booking referrals where permitted.
- [ ] Snow forecasts and archived observations with source metadata.
- [ ] Live lift/trail status if reliable permissioned feeds are available.
- [ ] Lodging and transportation planning options.

## Potential monetization (after product-market validation)

Affiliate referrals to lodging and lift bookings where contracts allow, ski gear partnerships, sponsorships with disclosure, premium trip-planning tools. Rankings must not silently depend on paid placements. Prioritize strong search, accurate metadata, and retention before monetization.
