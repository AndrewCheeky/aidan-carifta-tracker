# CARIFTA / emerging swimmers synchronization fix

The builder now chooses the fastest validated long-course time from both `data/performances.csv` (official ASAJ top times) and `data/race_history_2026.csv` (uploaded meet results). National rank remains derived exclusively from the official rankings file. The Boys 12 comparison uses a separate `data/emerging_boys12.csv`, generated from the bundled official 29 September 2026 ASAJ top-ten rankings PDF. This is a **top-ten comparison only**, not a complete national census. Only swimmers aged exactly 12 are included. A time within ±10% of Aidan's verified fastest time qualifies for display, not for any competition selection.

To refresh locally: `python scripts/extract_emerging.py && python scripts/build.py`.

GitHub Actions deploy and PDF import workflows also regenerate the emerging data. The PDF extractor requires PyMuPDF. Both workflows must install it. The PDF should not be replaced without source review.
