import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class CalculatedIntelligenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads((ROOT/'docs/data.json').read_text())

    def test_all_events_have_source_linked_calculated_rankings(self):
        for event in self.data['events']:
            with self.subTest(event=event['event']):
                x=self.data['calculated_intelligence'][event['event']]
                self.assertTrue(x['swimmers'])
                for result in x['swimmers']:
                    self.assertTrue(result['source_pdf'].startswith('asaj-pdfs/'))
                    self.assertGreater(int(result['source_page']),0)
                self.assertEqual(x['leader'],x['swimmers'][0])
                self.assertEqual(x['second'],x['swimmers'][1] if len(x['swimmers'])>1 else None)
                if x['aidan']:
                    self.assertEqual(x['swimmers'][x['rank']-1],x['aidan'])

    def test_rival_trends_require_separately_dated_meets(self):
        for event in self.data['calculated_intelligence'].values():
            for result in event['swimmers']:
                if result['change_seconds'] is not None:
                    self.assertGreaterEqual(result['dated_meets'],2)
                    self.assertIsNotNone(result['first_result']['source_page'])
                    self.assertIsNotNone(result['last_result']['source_page'])
