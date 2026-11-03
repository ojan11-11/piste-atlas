# Operator-researched resort profiles — batch 01 (November 3, 2026)

This batch enriches **15 of 740 OpenSkiData listings** without changing the number or canonical IDs of resort pages. With the eight manually source-checked launch resorts, Piste Atlas has **23 operator-reviewed profiles** and **725 map-only listings**.

## Method

- Mountain stats were gathered from resort-operated websites and their current mountain-stat pages. Each entry in `data/resorts.enriched.js` carries `sourcePages`, `verifiedAt`, and explanatory `notes`. When relevant, its ticket link points to the resort-operated pricing/booking page.
- `data/resorts.enriched.js` loads **after** `data/resorts.openskidata.js` and merges overrides by canonical resort ID. Thus re-running the geographic importer cannot overwrite operator facts.
- **Partial** review is not a guarantee of currently operating lifts/trails, current ticket prices, or complete official maps. A field that could not be corroborated stays `null`. Difficulty grouping is documented, not standardized between mountains.
- Actual day-ticket costs change by date, age, time, and purchase conditions. Two season-specific examples are shown on resort profiles, with all constraints. We do not advertise those as real-time price quotes.
- Resort artwork is linked to its official host; copyright-protected trail maps are not copied into the repository.

## Resorts in this batch

| Resort | Location | Official mountain source | Day-ticket link | Data reviewed |
|---|---|---|---|---|
| Alta Ski Area | Utah, United States | [Mountain information](https://www.alta.com/about) | [Official ticket page](https://www.alta.com/tickets-and-passes) | 2026-11-03 |
| Breckenridge Ski Resort | Colorado, United States | [Mountain information](https://www.breckenridge.com/the-mountain/about-the-mountain/mountain-info.aspx) | Awaiting verified link | 2026-11-03 |
| Copper Mountain | Colorado, United States | [Mountain information](https://www.coppercolorado.com/the-mountain/mountain-safety-stats/winter-mountain-stats/) | [Official ticket page](https://www.coppercolorado.com/tickets-passes/lift-tickets/tickets/) | 2026-11-03 |
| Deer Valley Resort | Utah, United States | [Mountain information](https://www.deervalley.com/media-room/091626-hail-peak-express-event) | [Official ticket page](https://www.deervalley.com/plan-your-trip/tickets-and-passes/lift-tickets) | 2026-11-03 |
| Revelstoke Mountain Resort | British Columbia, Canada | [Mountain information](https://www.revelstokemountainresort.com/mountain/mountain-stats/) | [Official ticket page](https://www.revelstokemountainresort.com/tickets-passes/winter-tickets/) | 2026-11-03 |
| Sun Peaks Resort | British Columbia, Canada | [Mountain information](https://www.sunpeaksresort.com/ski-ride/the-mountain/trail-maps-stats) | [Official ticket page](https://www.sunpeaksresort.com/ski-ride/tickets-passes/day-tickets) | 2026-11-03 |
| Loon Mountain Resort | New Hampshire, United States | [Mountain information](https://www.loonmtn.com/mountain-stats) | [Official ticket page](https://www.loonmtn.com/lift-tickets) | 2026-11-03 |
| Sugarloaf | Maine, United States | [Mountain information](https://www.sugarloaf.com/mountain-info) | [Official ticket page](https://www.sugarloaf.com/lift-tickets) | 2026-11-03 |
| Jay Peak Resort | Vermont, United States | [Mountain information](https://jaypeakresort.com/skiing-riding/mountain) | [Official ticket page](https://jaypeakresort.com/skiing-riding/tickets-passes/202627-lift-tickets) | 2026-11-03 |
| Blue Mountain Resort (Ontario) | Ontario, Canada | [Mountain information](https://www.bluemountain.ca/mountain/mountain-stats) | [Official ticket page](https://www.bluemountain.ca/plan-your-trip/day-tickets/winter-lift-tickets) | 2026-11-03 |
| Mont-Sainte-Anne | Quebec, Canada | [Mountain information](https://mont-sainte-anne.com/en/mont-sainte-anne-mountain-statistics/) | [Official ticket page](https://mont-sainte-anne.com/en/alpine-skiing-rates-and-schedules/) | 2026-11-03 |
| Ski Sundown | Connecticut, United States | [Mountain information](https://skisundown.com/plan-your-trip/trail-map-statistics/) | [Official ticket page](https://skisundown.com/the-mountain/tickets-season-passes/lift-tickets/) | 2026-11-03 |
| Mammoth Mountain | California, United States | [Mountain information](https://www.mammothmountain.com/on-the-mountain/winter-trail-map) | Awaiting verified link | 2026-11-03 |
| Crystal Mountain (Washington) | Washington, United States | [Mountain information](https://www.crystalmountainresort.com/discover-crystal/about-crystal) | [Official ticket page](https://www.crystalmountainresort.com/plan-your-trip/tickets-and-passes/day-tickets/winter-lift-tickets) | 2026-11-03 |
| Banff Sunshine Village | Alberta, Canada | [Mountain information](https://www.skibanff.com/the-mountain/mountain-report/historical-snowfall) | [Official ticket page](https://www.skibanff.com/index.php/tickets-passes/lift-tickets/lift-tickets) | 2026-11-03 |

## Known discrepancies and decisions

- **Deer Valley:** 2026–27 expansion release says 4,500 acres/209 runs and distinguishes 32 aerial from 8 surface lifts. Older mountain overview lists 4,300 acres/202 runs. The new season's figures are labeled *announced*; they are not the number of runs open today.
- **Banff Sunshine Village:** homepage says 3,300 acres, but the trail-map page describes over 3,500 acres; published acreage remains null. Snowfall is approximately 285 inches, converted from the operator's 723 cm average since 2018, not the different historical 239-inch figure.
- **Crystal Mountain (WA):** the resort reports 57 designated trails on one fact page and more than 80 named runs elsewhere. The exact named trail count stays null until reconciled.
- **Mont-Sainte-Anne:** 547 skiable acres, *not* 2,145 acres of entire mountain property. Its English `/en/trail-map/` page is a summer mountain-bike map, so no downhill winter map is linked pending verification.
- **Jay Peak:** current HTML page reports a 2,122-foot drop, while the listed summit/base elevation differ by 2,112 feet. Current HTML is retained as the reported vertical, with the discrepancy noted.
- **Revelstoke:** vertical (1,713 m) and annual snowfall (10.5 m) are converted from official SI units, with approximate imperial values on cards.
- **Ski Sundown:** five lifts include two conveyors, and 24% advanced includes both most-difficult and extremely-difficult trails.

## Continuing the review

New official-source entries should be created in `data/resorts.enriched.js` rather than editing the OpenSkiData generated file. For each resort record: verify identity/location; add operator source and review date; enter only explicitly sourced metrics; validate map/ticket URLs (check winter versus summer maps); document conditional rates; run the automated tests; and submit a PR for review.

`tools/test-reviewed-profiles.mjs` ensures every reviewed entry has a matching mapped resort ID, an official source, sensible metric values, and any quoted ticket price includes a currency, season, and conditions.

The OpenSkiData geographic layer remains ODbL-licensed. Official resort-source URLs are references, not a grant to redistribute copyrighted map artwork.
