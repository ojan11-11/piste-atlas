# Piste Atlas v0.5: Official-source research engine

## Purpose
Scale resort research without Mountain News or direct resort submissions. This is a review-only pilot: no extracted values, ticket prices or trail-map images automatically appear on the website. Snowfall is deferred.

## Process
1. Use OpenSkiData entries not yet operator-reviewed; sample 50 plausible HTTPS resort website candidates, geographically diversified (roughly 35 U.S., 15 Canada).
2. Verify crawler access with robots.txt before fetching public HTML. Respect disallow rules, rate limits and access restrictions; never attempt authentication or bot challenges.
3. Download at most four same-host HTML pages per resort (homepage plus mountain statistics, trail map or ticket pages).
4. Save candidate page links and numeric snippets for acreage, vertical drop, summit/base elevation, lift and trail counts. The source URL is attached to each evidence candidate.
5. Record failures and source candidates in reports/enrichment-pilot.json and reports/ENRICHMENT_PILOT.md for human review.
6. Apply reviewed information to data/resorts.enriched.js only after validating every number in context. Preserve the separately licensed OpenSkiData snapshot.

## Run
Use Node.js 22+ with no npm dependencies.

- Tests: node tools/test-research-resorts.mjs
- Dry run: node tools/research-resorts.mjs --limit 50 --dry-run --out reports/enrichment-plan.json
- Live pilot: node tools/research-resorts.mjs --limit 50 --out reports/enrichment-pilot.json

GitHub Action: Research official resort sources (v0.5). On a feature-branch push it tests the parser, runs the pilot, saves an artifact, and commits its review report to the feature branch only. It does not change live resort data.

## Quality rules
- An OpenSkiData website hint is a candidate, not proof of resort ownership.
- Every extracted statistic is marked needs-human-verification. Every report row has readyForPublish false.
- All linked trail maps require human confirmation that they are official winter maps.
- If metrics conflict, preserve both source references and leave the published field unknown.
- PDFs and JavaScript-rendered pages are not extracted in this first pilot.
- Do not republish copyrighted resort trail-map artwork without permission.
- Robots.txt does not grant permission to commercially republish content. Evaluate applicable terms.
- The crawler does not use OnTheSnow or Mountain News and does not collect snowfall or weather data.

## Roadmap
After reviewing accuracy for the first 50, add better canonical website identity checks, safe PDF parsing for permitted official statistics, operator-specific HTML patterns, routine link checks, and human-approved change proposals. Only then scale across all remaining resorts.
