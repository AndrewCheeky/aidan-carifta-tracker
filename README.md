# Aidan Seaton | CARIFTA 2027 Tracker

Static GitHub Pages site for verified ASAJ swimming results, CARIFTA standards and dated Jamaica rankings.

## Pages
Today, Events, Rivals, Meet Plan, Evidence. Administrative navigation is visible only with `?admin`; this is a UI convenience, **not authentication**.

## Update
Edit the source CSV/JSON files in `data/` only after verifying source documents and pages. Do not edit generated `docs/data.json` directly. Add official ASAJ PDF evidence to the existing `docs/asaj-pdfs/` structure. Run:

```bash
python scripts/build.py
python -m unittest discover -s tests -v
```

`app.js`, `index.html` and `style.css` at the root are authoritative; the build copies them to `docs/`. Competitor results are published separately as `docs/competitors.json` and fetched when Rivals opens. Publish `docs/` using the existing GitHub Pages workflow.

## Coach notes
The published source is `data/coach_notes.json`. Edit notes in Meet Plan and **Export coach notes JSON**. Import to restore; commit the exported file as `data/coach_notes.json` to publish notes. There is no online save backend.

## Ranking snapshots
Additional `data/rankings_YYYY-MM-DD.csv` files can be stored for future comparisons. Until independently verified and normalized, the site does not claim closing or widening trends. The supplied 29 Sep 2026 snapshot remains historical.

## Privacy
This is a public tracker of a minor's name, club and competitive results. Review permission and publication settings. `?admin` is not an access control. See CHANGELOG.md for changes.

## Transition status
The original advanced analytics, radar and calculated rankings remain available via Evidence → original advanced analytics (`docs/legacy.html`). They are not yet fully merged into the new event cards. This staged release should be reviewed before replacing the production site. The 29 Sep snapshot lacks first-place rows and page identifiers in several CSV records; those details are intentionally not invented.

### Five-discipline competitive profile
The Today page contains a five-axis profile for Freestyle, Backstroke, Breaststroke, Butterfly and IM. For each documented event with two or more competitors, relative strength is `100 × (competitor count − calculated rank) / (competitor count − 1)`. Each discipline is the unweighted mean of its evidenced events. Missing disciplines are not estimated; no complete polygon is drawn unless all five have evidence. This is an imported-results comparison, not an official ASAJ national ranking or CARIFTA selection score.

### Optional ranking snapshot trends
Add dated `data/rankings_YYYY-MM-DD.csv` files using `event,swimmer,rank,time,course,verified,source_pdf,source_page` fields. The build uses only verified LCM entries with explicit source and page. A dated snapshot needs Aidan's time and second-place time in the same event before a gap can be calculated. Trends require two snapshots with matching evidenced gaps; otherwise the site displays that history is insufficient. Original `data/rankings.csv` remains unchanged.
