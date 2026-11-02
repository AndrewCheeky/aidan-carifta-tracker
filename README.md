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

## ASAJ publication monitor (new)

Workflow: `.github/workflows/ingest-asaj.yml`. Runs at 06:00 Jamaica time daily or manually through **Actions → Monitor official ASAJ publications → Run workflow**.

- `scripts/ingest_asaj.py` checks ASAJ rankings, resources, events and calendar listing pages, discovers official-domain PDF links, fingerprints content using SHA-256, and extracts **review-only** PDF text lines mentioning Aidan Seaton.
- `review/asaj/index.json` records source links, document checksums, PDF page counts and candidate swimmer mentions. It contains no approved numeric figures.
- On changes, GitHub Actions proposes a pull request to `automation/asaj-document-review`. **No new performance, ranking, standard or meet value is automatically published.** Review the original PDF and enter validated figures in `data/*.csv` in a separate reviewed commit/PR.
- Aidan's identity is his full name across any club, school or Jamaica representation. Affiliation is stored per performance, not used as an exclusion criterion. If names collide, require additional official identifying evidence before approval.
- PDF extraction is best-effort: scanned documents, table layouts, non-PDF result pages, and changes to ASAJ site structure require manual handling. Listing-page changes can produce review PRs even without a new PDF.
- GitHub repository setting: **Settings → Actions → General → Workflow permissions** must permit **Read and write permissions** and **Allow GitHub Actions to create and approve pull requests** for automated PR creation. If organization policy blocks this, use a dedicated appropriately scoped token or review manually.
- This monitor is deliberately separate from the working `deploy.yml` workflow, and cannot modify live `data/*.csv` by itself.

Local test: `pip install -r requirements-ingest.txt && python scripts/ingest_asaj.py`. This command needs network access. It is not a guarantee that ASAJ pages are accessible from GitHub-hosted runners.

## Stage 2: review-only PDF line extraction

The monitor now writes `review/asaj/proposals.json` containing candidate references to
Aidan Seaton from official ASAJ PDFs, plus possible qualification-table references.
Every candidate has an original PDF URL, page, line, checksum, and evidence text.
All candidates are explicitly `verified: false` and **are not imported** into
`data/performances.csv`, `data/standards.csv`, or `data/rankings.csv`.

A reviewer must inspect the source PDF and distinguish results from seed times,
confirm the course, age group, event, time, and CARIFTA selection period, then
prepare a separate approved data change. Aidan's club/school/national affiliation
is preserved as source metadata and is never used to exclude his results.

This is intentionally a conservative first structured-extraction implementation:
it does **not** yet reliably parse full ranking tables, Boys 12 competitors,
qualifying standard column values, or all meet results. Those require layout-aware
parsers tailored to each ASAJ document type and additional fixture tests.

To run tests locally: `python -m unittest discover -s tests -v`.

## Workflow fix: review outputs and branch selection

The ingestion workflow **always checks out `main`**, even if someone manually selects a different branch in the GitHub Actions UI. Pull requests explicitly target `main` and use `automation/asaj-document-review` as the head branch, avoiding the previous same-branch PR failure.

After every run, look under the workflow run's **Artifacts** for `asaj-review-outputs-<run number>`; it contains `index.json` and `proposals.json` even when no changes warrant a pull request. The job also validates that both files exist and that the proposals are marked unverified. A proposal file with `candidates: []` is valid but means no candidate times were extracted, **not** that the tracker has verified athlete performances.

Run **Actions → Monitor official ASAJ publications → Run workflow** (choose `main` for clarity). A deployment triggered by merging a PR is a separate workflow and will not extract PDFs. Never merge proposed numerical figures into `data/*.csv` without checking the official ASAJ source document.

### November 2026 extraction rebuild

The ingestion workflow includes two user-supplied ASAJ PDF reference fixtures under `reference/asaj/` to regression-test the HY-TEK rankings and CARIFTA 2027 standards. It stages review-only records from both references on every run, even if the live ASAJ listing has no matching PDFs. `review/asaj/proposals.json` is **not** published to the website. The reference records use `uploaded-reference:` identifiers and are **not official live URLs**. Do not set `verified=true` until the document and its canonical ASAJ URL have been checked. The Boys 12 `unresolved_name_field` intentionally includes uncertain club/meet text and must not be displayed as a swimmer name without human verification.

## Publishing the extracted ASAJ data (manual approval)

The website reads `data/*.csv`, not `review/asaj/proposals.json`. The ingestion workflow only stages unverified evidence. To prepare the publishable CSVs, first create `review/asaj/qualification_source_url.txt` containing the **exact ASAJ PDF URL** for the uploaded `Carifta 2027 QT.pdf` (not a guessed URL). Run **Actions → Prepare official ASAJ publication review** on `main`, then download the `official-asaj-publication-candidates` artifact. Check every row against the two PDFs. Copy approved CSVs from that artifact to `data/` in a separate pull request, review and merge. The existing deployment workflow then rebuilds `docs/data.json` and deploys. No workflow automatically approves or publishes proposals.

The first-stage CSVs contain Aidan's **ASAJ top times** from the September 29 rankings, not independently confirmed lifetime PBs. Boys age-12 names and podium gaps remain pending until their original table rows can be reliably validated. The qualifying PDF source URL is deliberately required because its precise official download URL has not yet been established from the uploaded PDF alone.


## Publish verified ASAJ figures
The official CARIFTA 2027 download link is configured in `review/asaj/qualification_source_url.txt`.
Run **Actions → Prepare official ASAJ publication review → Run workflow (main)**.
The action validates the extracted CSVs and opens a PR targeting `main`. Review the official PDF evidence and merge the PR to publish. GitHub repository Actions settings may require **Allow GitHub Actions to create and approve pull requests**.
The review PR contains Aidan's extracted top times and qualification standards. Podium and Boys 12 comparison data remain pending rather than fabricated.

## 2026 full-year official meet review

Run **Actions → Review all available ASAJ 2026 meet results → Run workflow** on `main`.
The job discovers official ASAJ-linked 2026 result PDFs, downloads up to 75, and records each occurrence of `Aidan Seaton` with nearby PDF text and page number in `review/asaj/full_year_2026.json`. The job uploads this JSON as an artifact and opens a review PR if the evidence changes. **This is not an exhaustive guarantee:** ASAJ may omit historical result PDFs from current listing pages, or publish scanned/HTML results that require separate handling. It does not interpret seed times as results.

To publish individual race history, verify each race against its original official ASAJ PDF, then add it to `data/race_history_2026.csv` with `verified=true`, an ASAJ URL, the document publication date in `source_date`, exact `race_date`, `meet_name`, `round`, affiliation, age, event, course `LCM`, and official race time. Commit the verified CSV via a reviewed PR. The deploy workflow validates every row and populates the new **2026 Race History** tab. Existing qualification and national ranking datasets are unchanged. For offline tests, run `python scripts/full_year_2026.py --pdf 'path/to/official-meet-results.pdf'`.

## Automatic publication and merging (November 2026)

Run **Prepare official ASAJ publication review** on `main`, or let its Monday schedule run.
It generates three CSVs, checks each row against the two bundled ASAJ PDFs,
runs the dashboard builder and tests, opens a data-only PR, and requests GitHub
**auto-merge**. Validation happens before the PR is created. Once repository protections permit,
GitHub merges it and `deploy.yml` updates Pages.

**One-time repository configuration:** Settings → General → Pull Requests →
**Allow auto-merge** and **Allow squash merging**. Settings → Actions → General →
Workflow permissions → **Read and write permissions** and **Allow GitHub Actions
to create and approve pull requests**. Do not require the separate PR validation check unless using a GitHub App or PAT
for PR creation: PRs opened with the default GITHUB_TOKEN do not trigger
`pull_request` workflows. The publication job itself performs the strict checks.
If the organization disallows these settings, the workflow will report an error
instead of silently bypassing protection.

**Safety boundary:** Auto-merge applies ONLY to `data/performances.csv`,
`data/rankings.csv`, and `data/standards.csv`, matched against the bundled ASAJ
PDFs. The full-year meet evidence workflow is deliberately NOT auto-merged or
converted to race results. Its text matches are not reliable enough to publish
unattended. Rankings PDF source is a fixed September 2026 snapshot: the scheduled
job does not automatically fetch newer rankings. New source PDFs or changed code
must be separately reviewed before updating the trusted baseline.
