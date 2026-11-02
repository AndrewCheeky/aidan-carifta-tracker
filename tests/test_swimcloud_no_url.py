import csv, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class SupplementalNoUrlTests(unittest.TestCase):
    def test_existing_csv_and_build(self):
        with (ROOT/'data/swimcloud_supplemental.csv').open(newline='') as f:
            rows=list(csv.DictReader(f))
        self.assertTrue(rows)
        self.assertTrue(all(r['course'] in ('LCM','SCM') for r in rows))
        result=subprocess.run([sys.executable,'scripts/build.py'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
    def test_blank_url_permitted_in_build(self):
        build=(ROOT/'scripts/build.py').read_text()
        self.assertIn('if (url and',build)
