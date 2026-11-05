from pathlib import Path
import unittest
class TrendSources(unittest.TestCase):
 def test_sources_and_courses(self):
  s=(Path(__file__).resolve().parents[1]/"docs/app.js").read_text()
  for x in ("DATA.swimcloud_supplemental", "['LCM','SCM']", "Supplemental results are not verified CARIFTA qualifying evidence", "source_pdf", "source_page"):
   self.assertIn(x,s)
 def test_new_navigation_and_evidence(self):
  html=(Path(__file__).resolve().parents[1]/"docs/index.html").read_text()
  for tab in ('today','events','rivals','meets','evidence'):
   self.assertIn(f'data-tab="{tab}"',html)
  self.assertIn('data-tab="admin" hidden',html)
if __name__=="__main__": unittest.main()
