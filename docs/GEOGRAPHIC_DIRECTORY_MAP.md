# Piste Atlas geographic resort directory map

## What changed

The main directory #map view replaces the illustrated SVG overview with a real geographic map rendered by Leaflet 1.9.4 over OpenStreetMap tiles. The source of resort coordinates remains data/resorts.js plus the imported OpenSkiData directory, not browser geocoding.

All 748 records in the November 11, 2026 snapshot have valid North American latitude/longitude. The map fits the bounds of filtered results, and reflects the same search, pass, terrain and data-quality filters as discovery cards.

## Geographic accuracy and scaling

- Each standalone ski-area marker uses precisely the stored latitude and longitude. Locations may be resort centers, **not necessarily a base lodge or ticket office**.
- The map displays an OSM geographic basemap using Web Mercator. High latitudes are distorted, so it is not uniformly to scale across the entire continent. Leaflet's local distance scale shows miles and feet.
- Alaska stays in its geographic position rather than being relocated to an inset.
- When markers would overlap, numbered clusters group them visually. These cluster markers show an average location, **not a resort position**. Clicking zooms to member resorts; at close zoom individual pins show their stored locations. Coincident points can display a clickable list.
- Panning and zooming load visible tiles only; no bulk prefetching.

## Data caveats

Coordinate validation accepts plausible North American locations. A valid coordinate is not proof the source mapped the correct mountain. To improve precision further, reconcile resort-to-OSM relations and polygons, check source geometry, and optionally add separate baseLodgeLat and baseLodgeLng fields. Do not silently substitute a town center.

## Operational considerations

Tiles are from https://tile.openstreetmap.org/{z}/{x}/{y}.png with attribution in Leaflet. OSM tiles are a volunteer-run, best-effort service with attribution and caching requirements:
https://operations.osmfoundation.org/policies/tiles/

Do not bulk-download tiles. Browser requests must retain valid Referer and normal caching headers. Migrate to a scalable licensed tile provider or self-host before large-scale/commercial operation; keep OSM data attribution.

atlas-directory-map.js owns map initialization, clustering, popups and cleanup. atlas-extras.js shares its Leaflet loader between the directory map and profile trail maps.

## Verification

Run node --check atlas-directory-map.js, node --check atlas-extras.js, node --check app.js, and node test.mjs, plus the existing directory/community test suite.

Browser smoke-check:
1. Open #map and confirm the real basemap and Alaska geography.
2. Click a numbered cluster to zoom, then a pin to open the resort.
3. Confirm the scale bar shows imperial miles/feet and OSM attribution is visible.
4. Filter by state, resort name or pass; verify the map fits matching mountains.
5. Check narrow/mobile viewport and keyboard access via the resort list.
6. Simulate a tile server outage and confirm the resort list remains usable.
