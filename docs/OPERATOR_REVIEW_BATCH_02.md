# Official resort enrichment — pilot promotion batch 02

Reviewed on November 3, 2026. Statistics below come from the operator's public website. This batch adds 18 reviewed entries on top of the 15 from batch 01 and eight initial launch profiles, producing 41 source-reviewed profiles and 707 OpenSkiData-only listings (748 total).

**No new snowfall data was added.** All snowfall fields for the 18 newly reviewed entries are null. We linked official winter trail-map and ticket pages where they could be confirmed; we did not copy the map artwork or assert that a URL contains live ticket rates. Individual lift definitions vary by resort. A review label does not imply every field is complete or that a resort is currently open.

| Resort | Acres | Lifts | Trails | Vertical (ft) | Operator source |
|---|---:|---:|---:|---:|---|
| Palisades Tahoe — Olympic Valley | 3600 | 26 | 187 | 2850 | [Official information](https://www.palisadestahoe.com/footer/mountain-statistics) |
| Palisades Tahoe — Alpine Meadows | 2400 | 13 | 109 | 1802 | [Official information](https://www.palisadestahoe.com/footer/mountain-statistics) |
| Taos Ski Valley | 1294 | 13 | 110 | 3131 | [Official information](https://www.skitaos.com/mountain) |
| Beech Mountain Resort | 95 | 9 | 17 | 830 | [Official information](https://www.beechmountainresort.com/mountain/mountain-stats/) |
| Marble Mountain Resort | 230 | 4 | 43 | 1758 | [Official information](https://skimarble.com/mountain-stats/) |
| Castle Mountain Resort | 3592 | 7 | 115+ | 2845 | [Official information](https://www.skicastle.ca/stats/) |
| Seven Springs Mountain Resort | 285 | 10 | 33 | Unknown | [Official information](https://www.7springs.com/the-mountain/about-the-mountain/mountain-info.aspx) |
| Heavenly Mountain Resort | 4800 | 28 | 111 | Unknown | [Official information](https://www.skiheavenly.com/the-mountain/about-the-mountain/mountain-info.aspx) |
| Okemo Mountain Resort | 667 | 20 | 123 | Unknown | [Official information](https://www.okemo.com/the-mountain/about-the-mountain/mountain-info.aspx) |
| Powder Ridge Mountain Park & Resort | 80 | Unknown | Unknown | 417 | [Official information](https://powderridgepark.com/) |
| Sundown Mountain Resort | Unknown | 6 | 21 | 475 | [Official information](https://sundownmtn.com/the-mountain/snow-report-trail-map/) |
| Massanutten Resort | 83 | 7 | 23 | Unknown | [Official information](https://www.massresort.com/discover/winter/) |
| Afton Alps | 300 | 17 | 50 | Unknown | [Official information](https://www.aftonalps.com/the-mountain/about-the-mountain/mountain-info.aspx) |
| Alpine Valley Resort | Unknown | Unknown | 20 | 388 | [Official information](https://www.alpinevalleyresort.com/mountain-information/) |
| Winter Park Resort | 3095 | Unknown | Unknown | Unknown | [Official information](https://www.winterparkresort.com/) |
| Sun Valley — Bald Mountain | Unknown | 12 | 120+ | 3400 | [Official information](https://www.sunvalley.com/things-to-do/skiing-riding/) |
| Powder Mountain Ski Resort | 5000 | Unknown | Unknown | Unknown | [Official information](https://powdermountain.com/trail-map) |
| Mount St. Louis Moonstone | 180 | Unknown | 36+ | 550 | [Official information](https://www.mountstlouis.com/mountain-facts/) |

## Notable source distinctions

- **Palisades Tahoe:** Its Olympic Valley and Alpine Meadows areas are independently mapped in OpenSkiData, so we publish their individual 3,600- and 2,400-acre figures rather than duplicating the combined 6,000-acre resort statistic on both pages. The resort's combined named-run total differs from adding both areas' separate counts.
- **Powder Ridge (CT):** The operator lists 80 skiable acres, 40 acres of night skiing and 255 acres of property. Only the 80 skiable acres is in the field. Its overview trail/lift totals differ from the current trail report, so those fields stay unknown.
- **Okemo:** A paragraph about 4,000 acres of Okemo State Forest is unrelated to the 667 skiable resort acres and is excluded.
- **Sun Valley:** The 2,500+ acre claim describes Bald and Dollar mountains together, while the entry represents Bald Mountain only. Skiable acreage is therefore left unknown on that entry.
- **Beech Mountain:** Officially published vertical rise is 830 feet although summit minus base is 831 feet, likely due to rounding; use the labeled rise. The conditional 2026–27 $50 adult weekday four-hour ticket excludes a $2 media fee.
- **Marble Mountain:** The current statistics page and a resort-hosted PDF trail map disagree about run count and vertical; publish explicitly labeled current statistics and note the discrepancy.
- **Mount St. Louis Moonstone:** A new 2026 surface lift is reported, so an older overall eight-lift count is not presented as the current total.
- **Heavenly:** A current mountain statistics page lists 111 trails; another older resort page lists 97. Use the current operator mountain-info page and note the difference.
- **Castle Mountain:** Seven distinct lifts include a carpet. The current stat page reports 115+ trails; the plus is preserved in the display.

## Promotion policy

Research pipeline matches remain in `reports/enrichment-pilot.json`. Only confirmed fields are copied to `data/resorts.enriched.js` and given operator source URLs, `sourcePages`, and `verifiedAt`. The automated check validates all IDs, source URLs, ranges, terrain math, consistency of published totals, and 748 unique directory IDs. No exact winter ticket prices are inferred from a booking link.

Sources are linked from each resort profile. Some details change by season, and site users should verify availability with the operator before visiting.
