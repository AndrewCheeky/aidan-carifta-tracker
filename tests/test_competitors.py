import csv,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class CompetitorTests(unittest.TestCase):
 def test_extracted_rows_have_evidence(self):
  with (ROOT/'data/asaj_competitor_results.csv').open() as f: rows=list(csv.DictReader(f))
  self.assertGreater(len(rows),100)
  self.assertTrue(all(r['gender'] in ('Boys','Girls') and r['source_page'].isdigit() and (ROOT/'docs'/r['source_pdf']).is_file() for r in rows))
 def test_boys_13_are_present(self):
  with (ROOT/'data/asaj_competitor_results.csv').open() as f: rows=list(csv.DictReader(f))
  self.assertTrue(any(r['gender']=='Boys' and r['age']=='13' for r in rows))
if __name__=='__main__':unittest.main()
