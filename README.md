# Aidan Seaton | CARIFTA 2027 Tracker

Static GitHub Pages site with distinct **CARIFTA Qualification** and **Jamaica Rankings** tabs, a Boys 12 comparison, official ASAJ calendar listings, and a source-verification page.

## Deploy

1. Create a new GitHub repository named `aidan-carifta-tracker`.
2. Upload all repository files (including `.github/workflows/deploy.yml`) to the `main` branch.
3. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
4. Run **Actions → Validate and deploy tracker → Run workflow**, or push a commit.
5. Visit `https://YOUR-USERNAME.github.io/aidan-carifta-tracker/`.

## Verified data ingestion

**The site is deliberately unpopulated for athlete rankings and qualification figures until verified from official documents.** ASAJ's document listing is not sufficient evidence for a numeric value.

Populate CSVs in `data/`:
- `performances.csv`: verified official Aidan times, **not psych-sheet seed times**.
- `standards.csv`: 2027 CARIFTA Boys 13–14 official qualification times. Use `standard_type` exactly as printed in the ASAJ document (do not assume A/B exists).
- `rankings.csv`: ASAJ ranking positions and Boys 12 comparison swimmers, sourced from official rankings of a common publication date.

Every verified row must have `verified=true`, `source_url` linking to an ASAJ domain, `source_date=YYYY-MM-DD`, an exact event name from `data/athlete.json`, and `course=LCM`. The Python builder rejects invalid or mismatched rows. **Manual verification against the original ASAJ document is required before marking `verified=true`.** Domain checks and metadata are safeguards, not cryptographic proof of the underlying figure. Recompute rank and time gaps from the same dated official ranking edition; avoid mixing seasons.

Boys 12 comparisons include swimmers whose official times are within ±10% of Aidan's official verified event time, and display signed differences as seconds or m:ss.xx.

## Important limitations

- The daily GitHub Action validates and republishes checked-in data. It **does not scrape or automatically download ASAJ PDFs or calendars**. This avoids silently misreading PDFs or publishing unsupported values.
- Calendar entries are a snapshot from ASAJ's event listings and calendar, not automatically refreshed; maintain `data/meets.json` from official updates.
- CARIFTA team selection must be evaluated against the full official selection policy, not just time standards. The site leaves selection status pending.
- GitHub Pages is public by default. Do not use it for private athlete information without appropriate access control.
- The site is an independent tracker, not endorsed by ASAJ.

## Build locally

```bash
python scripts/build.py
python -m http.server 8000 -d docs
```

Open http://localhost:8000

## Official ASAJ links

- https://www.asaj.com.jm/resources
- https://asaj.com.jm/rankings
- https://www.asaj.com.jm/events/aggregator
- https://www.asaj.com.jm/calendar/2027
