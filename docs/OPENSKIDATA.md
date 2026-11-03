# OpenSkiData source integration

Piste Atlas stores two distinct datasets.

- Operator-checked profiles: data/resorts.js. Only these may show official resort acreage, snowfall, terrain percentages, trail counts and ticket/map links.
- OpenSkiData discovery layer: data/resorts.openskidata.js (generated; ODbL). This contains approximate locations and mapped facilities, not verified current resort facts.

OpenSkiData derives ski-area features from OpenStreetMap and Skimap.org. Its global GeoJSON includes site status, downhill/nordic activity, websites, geographic location and mapped run/lift statistics. The import keeps U.S. and Canadian downhill sites with at least one mapped lift. Explicitly inactive locations are removed; an unknown or operating source status is not proof that a resort is currently open.

## Refresh

The "Sync OpenSkiData directory" GitHub Action is configured for development only. It runs when importer files change, or manually from Actions -> Sync OpenSkiData directory -> Run workflow (select development). After checking the upstream metadata build time, it downloads at most one new upstream build, runs tests, validates the output and commits the derived snapshot back to development. Do not run repeatedly against the same upstream day.

Local Node.js 22+ commands:
- node tools/test-openskidata.mjs
- node tools/sync-openskidata.mjs
- node tools/validate-openskidata.mjs

The importer also supports an offline fixture: node tools/sync-openskidata.mjs --input path/to/ski_areas.geojson

The importer rejects unexpected national listing counts (under 200 or above 4,000), preserving the previous output. It does not calculate official lifts, signed trails, skiable acres, annual snowfall, ski pass eligibility, or lift tickets from mapped data.

## Attribution and database licensing

The derivative map-based dataset is under the Open Database License (ODbL); its separate file is part of the public repository. Attribution:

Data from OpenSkiData / OpenSkiMap.org, © OpenStreetMap contributors (ODbL), Skimap.org, Who's On First, © Mapterhorn.

- Provider and downloads: https://www.openskidata.org/
- Ski-area GeoJSON: https://tiles.openskimap.org/geojson/ski_areas.geojson
- Updated metadata: https://tiles.openskimap.org/metadata.json
- Schema: https://github.com/russellporter/openskidata-format

OpenSkiData content-hash feature IDs are not stable; the importer prefers Wikidata or upstream OSM/Skimap identifiers for site URLs/favorites. Merges or changes in upstream identity may still require editorial migration.

Follow the provider's at-most-once-daily download policy. Do not hotlink OpenSkiMap vector tiles; interactive maps need their own licensed tile host. Official trail-map artwork requires permission before redistribution.

## Editorial next steps

Review duplicate clusters and missing resorts. Verify resort status and official websites against operators. Add official ticket, map and mountain fact references one resort at a time, with source URL and reviewed date. Then move to a real GIS-backed map.
