import csv, json, unittest
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class DateConflicts(unittest.TestCase):
 def test_all_conflicting_pdf_dates_reported(self):
  def dates(file,field):
   d=defaultdict(set)
   with (ROOT/'data'/file).open() as stream:
    for row in csv.DictReader(stream):d[row['source_pdf']].add(row[field])
   return d
  history=dates('race_history_2026.csv','race_date')
  competitors=dates('asaj_competitor_results.csv','meet_start')
  conflicts={pdf for pdf in history.keys()&competitors.keys() if history[pdf]!=competitors[pdf]}
  report={r['source_pdf'] for r in json.loads((ROOT/'docs/date_conflicts.json').read_text())}
  self.assertEqual(conflicts,report,'Unreported conflicting meet dates; verify source PDFs before changing dates')
 def test_no_notes_or_public_legacy(self):
  for file in ['data/coach_notes.json','docs/coach_notes.json','docs/legacy.html']:
   self.assertFalse((ROOT/file).exists(),file)
  for file in ['app.js','index.html','docs/app.js','docs/index.html']:
   text=(ROOT/file).read_text()
   for phrase in ['coach_notes','renderMeets','wireNotes','Meet Plan','coach-sheet']:
    self.assertNotIn(phrase,text)
