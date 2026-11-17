## 2026-11-17 · Profile typeface
- Profile page: headings switched from Big Shoulders Display (condensed, all caps) to Poppins in sentence case for a modern, polished look; sizes and line heights retuned. Body (Inter) and numerals (JetBrains Mono) unchanged.
- Profile page: recoloured from navy/teal to the Jamaican flag palette (black backgrounds, green accents, gold highlights); top flag bar reordered to black, green, gold with a thin matching line between sections; numerals and labels now use Poppins (JetBrains Mono removed).

## 2026-11-17 · Profile 50 Free history complete
- Profile "Since 2017": added 2021-2024 season bests (39.73, 36.27, 32.54, 30.88) from SwimCloud meet lists; chart now covers every season 2017-2026. SwimCloud-sourced, not ASAJ-verified.

## 2026-11-17 · Profile history from SwimCloud
- Profile page: added a "Since 2017" section (50 Free long-course progression 2017-2026 and Tornadoes age-group ranking by year), sourced from SwimCloud and labelled not ASAJ-verified.
- Profile page: corrected 100 Fly (1:05.00) and 200 IM (2:31.06) to the tracker's ASAJ-verified times; added 100 Free, 200 Breast, 200 Fly and 400 IM; 100 Fly progression is now long course to long course; Goodwill 2025 medal times labelled SCM.
- Profile nav: added "Since 2017"; menu collapses below 1000px.

## 2026-11-17 · Profile page
- Added profile.html (profile and achievements showcase) and images/profile/ photos; "Profile & achievements" link added to the tracker dropdown menu as a normal link, not a tab.
- build.py now publishes profile.html and images/profile/ into docs/ (GitHub Pages serves only docs/).
- Removed leftover data/coach_notes.json, docs/coach_notes.json and docs/legacy.html so the existing "no notes or public legacy page" test passes.
- Added tests/test_profile_page.py.

## Achievements update (5 November 2026)
- Added Today achievements: verified PB milestones, qualifying CARIFTA B milestones, calculated top-two milestones, and a source-linked timeline.
- Added copyable milestone summaries without user-entered text.
- Added a brief one-time notice for newly imported achievements after the first visit; respects reduced-motion settings.
- Updated existing Today diagram test to account for the new achievements panel inserted before it.

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

## Achievement celebration redesign (5 November 2026)
- Added source-linked verified milestone hero, four distinct achievement badge categories, ASAJ LCM journey sparkline and locked next milestones.
- Added local PNG export showing only Aidan S., sourced event/time and badge, and one-time confetti for newly imported achievements.
- Reduced-motion preference disables celebration motion; decorative count-up never changes race times.
- Added four automated tests documenting the evidence, hero, journey, milestone and privacy rules.

## Rivals qualifying-period redesign and Swimaz date confirmation (2026-11-05)
- Confirmed the single-day Swimaz meet date as 20 June 2026 from the results PDF heading; preserved original source CSV dates for audit and added canonical dates to the generated records. Swimaz is excluded as pre-cutoff. All 13 existing qualifying intelligence event objects remain identical to the pre-change build.
- Added Python-derived `rivals_view` with source-backed eligible ladders, top-two safety margins, second-place chase gaps, missing-swim targets, qualifying watchlist, and cutoff-straddling date conflict notices. Public Rivals JSON uses abbreviated names only.
- Replaced Rivals radar, comparison selector, and per-event charts with mobile-first event groups, textual status chips, accessible comparison meters, ASAJ PDF evidence links, and a collapsed Boys 12 watchlist.
- Updated obsolete achievement regression test (the separate journey panel was removed in an earlier release); added nine Rivals fixture and integrity tests.
