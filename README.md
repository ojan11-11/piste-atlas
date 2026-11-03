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
