## 2026-11-05 · Classification summary
- Added separate USA Swimming motivational-level and CARIFTA eligible-standard totals to Today → Secured. Counts are derived from verified LCM results and linked to their evidence.
- CARIFTA A/B totals use eligible-period swims, not all-date PBs; USA counts reflect highest achieved level per event.

## Round 2 · 2026-11-05
- Removed Meet Plan, editable coach notes, print sheet and public legacy analytics.
- Added qualifying-period calculated ranking and separate eligible vs overall PB.
- Added Secured, Needs a fresh swim, Focus, Season progress and meet targets on Today.
- Added mobile event filters and collapsed evidence per card.
- Shortened public rival names to first name and last initial.
- Generated unresolved ASAJ date-conflict report; no source dates were modified.

# Changelog

## 2026-11-05
- New five-page mobile-first tracker and verified gap comparisons.
- Coach notes import/export, evidence grouping and print view.
- Canonical root UI, split competitor payload and public privacy note.
- Prior deployed application archived as `legacy-app.js` for reference.

## 2026-11-05 · Calculated competition intelligence
- Build derives per-event fastest documented ASAJ LCM swims, first/second competitors, imported-result rank and source PDF/page evidence.
- Event tiles show current verified PB, calculated rank alongside 29 Sep official rank, B gap and calculated second-place gap.
- Rival cards show leading swimmers, their best times and separately dated earliest-to-latest performance changes.
- Focus and coach sheet use current imported-result comparisons.
- Recorded age is age at meet; no claim of official live ASAJ ranking or CARIFTA eligibility.

## 2026-11-05 · Final competition intelligence integration
- Restored a five-discipline (Free, Back, Breast, Fly, IM) competitive strength diagram on Today, calculated from imported ASAJ LCM ranks, with missing-data handling and a documented percentile method.
- Added source-linked event-level competition opportunity comparisons directly to Events, alongside existing PB, dual ranking, and dual-gap cards.
- Added verified multi-snapshot gap trend processing for optional `data/rankings_YYYY-MM-DD.csv` files; missing second snapshot displays no inferred trend. Only rows with explicit source/page references qualify.
- Improved coach sheet source attribution for B standards and second-place comparisons.
- Added tests for the diagram, analytics, snapshot safeguards, print evidence, and root/docs consistency.
- No verified source rows changed; existing competitor calculations and privacy disclosure retained.
- Browser visual checks could not be completed in the build environment; review on a 360px phone before production promotion.

## 2026-11-05 · Rivals profile and Swim Intelligence
- Label achieved CARIFTA B times explicitly on event cards, retaining separate eligibility checks.
- Add Rivals five-discipline comparison selector for historical Boys 13–14, Boys 12 and combined Boys 12–14 ASAJ LCM cohorts. Unique swimmers' best evidenced times per event drive ranking-percentile scores; no missing data is estimated.
- Restore Swim Intelligence as a navigation page with separate ASAJ and supplemental race-history views by event and course, charted from documented times with source links.
- Preserve the five-discipline profile on Today.
