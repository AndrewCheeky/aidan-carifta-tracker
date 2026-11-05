import json, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class FinalIntegration(unittest.TestCase):
 def test_five_discipline_diagram_is_on_today(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('function strengthDiagram()',js)
  self.assertIn('</section>${strengthDiagram()}`',js)
  self.assertIn('function disciplineScores()',js)
  self.assertIn('function eventAnalytics()',js)
  self.assertIn('function renderEvents()',js)
 def test_snapshot_trends_are_not_inferred(self):
  snapshots=json.loads((ROOT/'docs/ranking_snapshots.json').read_text())
  self.assertEqual(snapshots,[])
  self.assertIn('Needs a second dated, verified ranking snapshot', (ROOT/'app.js').read_text())
 def test_source_links_remain_on_event_cards(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn("competitorSource(q?.second,'ASAJ result')",js)
  self.assertIn("a(standard(e)?.source_url,'Standard source')",js)
  self.assertNotIn('renderMeets()',js)
 def test_root_and_deployed_assets_match(self):
  for name in ('app.js','index.html','style.css'):
   self.assertEqual((ROOT/name).read_bytes(),(ROOT/'docs'/name).read_bytes())
if __name__=='__main__':unittest.main()
