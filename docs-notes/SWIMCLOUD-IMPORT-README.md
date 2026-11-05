# SwimCloud URL review tab

The public GitHub Pages site cannot securely scrape arbitrary URLs or write to GitHub. The SwimCloud Import tab accepts a URL and opens a prefilled GitHub issue for review. GitHub login and final issue submission are required. No result is imported automatically.

Reviewers compare swimmer, event, course, meet, round, exact race date and time against `data/race_history_2026.csv`; prefer official ASAJ results and never replace them with SwimCloud data without explicit evidence. Treat ambiguous records as pending.

Run `python scripts/audit_race_duplicates.py` for a conservative exact-key duplicate audit. The audit is read-only and cannot detect every potential duplicate.

A future automatic importer requires a permitted structured data source or authorized API; a URL alone is not reliable proof of race results.
