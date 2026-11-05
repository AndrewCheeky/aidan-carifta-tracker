import importlib.util,json,pathlib,sys,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from rivals_view import make_view,anonymize

def row(name,time,page='2'):
    return {'name':name,'time':time,'source_pdf':'asaj-pdfs/test.pdf','source_page':page,'is_aidan':name=='Seaton, Aidan'}

class RivalsViewTests(unittest.TestCase):
    def view(self,rows,earlier=None,conflicts=None):
        return make_view(['100 Fly'],{'100 Fly':rows},{'100 Fly':{'aidan':earlier} if earlier else {}},conflicts or [])
    def test_top_two_first_and_second_and_margin(self):
        first=self.view([row('Seaton, Aidan','1:00.00'),row('Sinclair, Joel','1:05.00'),row('Brown, Luke','1:12.00')])['groups']['top_two'][0]
        self.assertEqual((first['rank'],first['label'],first['margin_seconds'],first['margin_pct'],first['bar_pct']),(1,'Leading',12.0,16.666667,100.0))
        second=self.view([row('Sinclair, Joel','1:00.00'),row('Seaton, Aidan','1:05.00'),row('Brown, Luke','1:06.00')])['groups']['top_two'][0]
        self.assertEqual((second['rank'],second['label'],second['margin_seconds']),(2,'Tight spot',1.0))
    def test_top_two_no_third(self):
        x=self.view([row('Seaton, Aidan','1:00.00'),row('Sinclair, Joel','1:01.00')])['groups']['top_two'][0]
        self.assertIsNone(x['margin_seconds']);self.assertIsNone(x['bar_pct'])
    def test_close_gap_closeness(self):
        x=self.view([row('Sinclair, Joel','1:00.00'),row('Brown, Luke','1:01.00'),row('Seaton, Aidan','1:01.61')])['groups']['close'][0]
        self.assertEqual(x['label'],'So close');self.assertEqual(x['gap_seconds'],.61)
        self.assertAlmostEqual(x['gap_pct'],1.0);self.assertAlmostEqual(x['bar_pct'],90.0)
    def test_needs_swim_and_insufficient(self):
        earlier=row('Seaton, Aidan','1:08.00')
        x=self.view([row(f'Last{i}, First{i}',f'1:0{i}.00') for i in range(5)],earlier)['groups']['needs_swim'][0]
        self.assertEqual(x['time_to_beat']['time'],'1:01.00');self.assertAlmostEqual(x['percent_off'],11.47541,places=4)
        y=self.view([row('Sinclair, Joel','1:00.00'),row('Brown, Luke','1:01.00')],earlier)['groups']['needs_swim'][0]
        self.assertTrue(y['insufficient_data']);self.assertIn('Only 2 swimmers',y['insufficient_text']);self.assertIsNone(y['time_to_beat'])
    def test_short_names_and_collisions(self):
        x=anonymize([row('Sinclair, Joel','1:00.00'),row('Smith, Joel M','1:01.00'),row('Whilby, Dominic Z','1:02.00'),row('Seaton, Aidan','1:03.00')])
        self.assertEqual([r['short_name'] for r in x],['Joel Si.','Joel Sm.','Dominic W.','Aidan S.'])
        self.assertNotIn('name',x[0])
    def test_cutoff_conflict_notice(self):
        base={'meet':'Test meet','history_dates':['2026-06-20'],'competitor_ranges':[{'start':'2026-07-09','end':'2026-07-09'}]}
        self.assertEqual(self.view([],conflicts=[base])['excluded_meets'],['Test meet'])
        self.assertEqual(self.view([],conflicts=[{**base,'resolved':True}])['excluded_meets'],[])
        self.assertEqual(self.view([],conflicts=[{**base,'competitor_ranges':[{'start':'2026-06-25','end':'2026-06-25'}]}])['excluded_meets'],[])
        self.assertEqual(self.view([],conflicts=[{**base,'history_dates':['2026-10-30']}])['excluded_meets'],[])
    def test_watch_actual_top_two_and_minimum_field(self):
        v=make_view(['A','B','C'],{'A':[row('Sinclair, Joel','1:00.00'),row('Seaton, Aidan','1:01.00'),row('Brown, Luke','1:02.00')],
            'B':[row('Sinclair, Joel','1:00.00'),row('Seaton, Aidan','1:01.00'),row('Brown, Luke','1:02.00')],
            'C':[row('Sinclair, Joel','1:00.00'),row('Seaton, Aidan','1:01.00')]},{},[])
        self.assertEqual([(r['short_name'],r['count']) for r in v['watch']],[('Aidan S.',2),('Joel S.',2)])
    def test_live_data_privacy_and_unchanged_rank(self):
        data=json.loads((ROOT/'docs/data.json').read_text());v=data['rivals_view']
        self.assertEqual(v['summary'],{'top_two_count':5,'events_with_eligible_results':8,'closest_chase':{'event':'100 Fly','gap_seconds':.06},'needs_swim_count':5})
        self.assertEqual(v['excluded_meets'],[])
        for group in v['groups'].values():
            for c in group:
                for r in c['ladder']:
                    self.assertNotIn('name',r);self.assertIn('source_pdf',r);self.assertIn('source_page',r)
                    self.assertRegex(r['short_name'],r'^[A-Za-z-]+ [A-Za-z]{1,2}\.$')
        self.assertEqual(data['qualifying_intelligence']['400 IM']['rank'],1)
    def test_canonical_swimaz(self):
        c=json.loads((ROOT/'data/meet_date_canonical.json').read_text())['confirmed_meets']['asaj-pdfs/2026 Swimaz results.pdf']
        self.assertEqual((c['start'],c['end']),('2026-06-20','2026-06-20'))
        self.assertIn('Resolved:',(ROOT/'DATE_CONFLICT_REPORT.md').read_text())

if __name__=='__main__':unittest.main()
