import unittest,json,csv
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def secs(v):
 p=v.split(':');return float(p[0])*60+float(p[1]) if len(p)==2 else float(v)
class SnapshotGaps(unittest.TestCase):
 def test_september_snapshot_reference(self):
  with (ROOT/'data/rankings.csv').open() as f: ranks={r['event']:r for r in csv.DictReader(f)}
  with (ROOT/'data/standards.csv').open() as f: standards={r['event']:r for r in csv.DictReader(f) if r['standard_type']=='B'}
  with (ROOT/'data/second_place_boys13_14.csv').open() as f: seconds={r['event']:r for r in csv.DictReader(f)}
  expected={'50 Fly':(6,'29.22',1.33,1.16),'50 Breast':(7,'35.32',.80,2.76),'50 Free':(8,'27.60',1.41,1.68),'100 Breast':(5,'1:19.20',3.02,7.19),'200 Breast':(4,'2:53.01',5.93,10.24)}
  for event,(rank,t,b,s) in expected.items():
   with self.subTest(event=event):
    self.assertEqual(int(ranks[event]['rank']),rank)
    self.assertEqual(ranks[event]['time'],t)
    self.assertAlmostEqual(secs(t)-secs(standards[event]['time']),b,places=2)
    self.assertAlmostEqual(secs(t)-secs(seconds[event]['time']),s,places=2)
 def test_data_split_and_root_is_authoritative(self):
  d=json.loads((ROOT/'docs/data.json').read_text())
  self.assertNotIn('asaj_competitor_results',d)
  self.assertTrue((ROOT/'docs/competitors.json').exists())
  self.assertEqual((ROOT/'app.js').read_bytes(),(ROOT/'docs/app.js').read_bytes())
if __name__=='__main__':unittest.main()
