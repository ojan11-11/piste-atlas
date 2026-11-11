# Piste Atlas v0.7 — Display OpenSkiData across the whole directory

## Why this release exists

Piste Atlas previously displayed its eight original operator-reviewed profiles and later 33 source-reviewed overlays with useful detailed statistics, but its other ~700 entries felt empty.

**The solution is data coverage rather than pretending every number has been officially verified.** This release uses OpenSkiData's mapped downhill runs and lift network in addition to the original operator facts.

## OpenSkiData snapshot coverage

Generated November 11, 2026 from https://tiles.openskimap.org/geojson/ski_areas.geojson:

- 740 mapped ski areas matched to existing stable directory IDs (100%).
- 740 lift networks with mapped lift type breakdowns.
- 705 downhill run networks with mapped lengths and difficulty breakdowns.
- 705 downhill run networks with nonempty difficulty data.
- 8 original curated profiles retain their operator facts, yielding 748 directory listings total.

The snapshot is stored separately in data/resorts.mapped-detail.js with its import details in data/resorts.mapped-meta.json. It loads after data/resorts.openskidata.js, **before** operator-reviewed data/resorts.enriched.js. It does not change name, primary resort identity, acreage, snowfall, tickets or operator-published lifts/trail counts.

## Site improvements

- Directory cards show operator skiable acres if available, else mapped downhill network distance or mapped segment count.
- Lifts and elevation use operator numbers when available; otherwise they fall back to mapped counts and mapped elevation spans.
- Trail difficulty bars for map-only resorts use **mapped downhill line distance percentages**, not official trail difficulty percentages.
- Resort profiles show mapped downhill distance (km), lift line distance (km), number of segments, tagged snowmaking line length (when available), segments by difficulty, lifts by type, high/low mapped elevation, location and map status tag.
- Comparison rows show both official and mapped values for the same mountain, and no longer emphasize snowfall.
- A new available-lift count filter and sortable map-derived statistics help explore the directory.
- The schematic map plots all matching resort coordinates; it is **not** a true topographic or winter trail map. At national scale dots overlap.
- We do not fabricate lift ticket prices, official trail counts, acreage, or official maps.

## How numbers should be interpreted

- **Mapped run segments** are OpenStreetMap geometry features, not signed named trails. One named trail can have several mapped segments.
- **Mapped run distance** is the sum of the lengths of mapped downhill line segments. It isn't the count of unique trails, nor an official estimate of open slopes.
- **Mapped lift count** includes tagged types such as chairs, gondolas, magic carpets and rope tows according to open data; operators may report these differently.
- **Mapped elevation span** is a difference between mapped high and low points, not necessarily a resort's advertised lift-served vertical drop.
- **Mapped difficulty percentage** is a ratio of *mapped line distances*, not trail counts or acres, and can be biased where OSM coverage is incomplete.
- **Snowmaking-tagged length** reflects known map tags, not total snowmaking coverage.
- **Operating status** is a source data tag, not live opening information.

## Maintenance

The new script tools/build-mapped-detail.mjs downloads OpenSkiData's current ski-area GeoJSON, matches stable source identifiers (Wikidata or underlying OpenStreetMap/Skimap IDs) to the existing 740 resort entries, computes mapped statistics and writes a separate ODbL layer.

It refuses to replace the existing layer if the match rate falls below 60%, protecting against schema changes. Use:

- node tools/test-mapped-detail.mjs
- node tools/build-mapped-detail.mjs
- node tools/test-site-directory.mjs

GitHub Actions: Refresh OpenSkiData mapped details. This was successfully exercised on feature/show-open-mapped-data-v07. It can be manually dispatched on the default branch in future, but the current commit step only writes to the development feature branch; wider scheduling/production refresh can be enabled separately.

## Data rights

Open data attribution: Data from OpenSkiData / OpenSkiMap.org; © OpenStreetMap contributors (ODbL), Skimap.org, Who's On First, © Mapterhorn.

The mapped detail layer is kept separately from operator-sourced figures. Licensing restrictions on OpenSkiData and any derivative database remain applicable. Piste Atlas does not copy third-party illustrated trail maps.
