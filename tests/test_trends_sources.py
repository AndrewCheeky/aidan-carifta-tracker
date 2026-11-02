from pathlib import Path
import unittest
class TrendSources(unittest.TestCase):
 def test_sources_and_courses(self):
  s=(Path(__file__).resolve().parents[1]/"docs/app.js").read_text()
  for x in ("d.swimcloud_supplemental", "trendSwims(DATA,name,course)", "['LCM','SCM']", "SwimCloud supplied, unverified"):
   self.assertIn(x,s)
if __name__=="__main__": unittest.main()
