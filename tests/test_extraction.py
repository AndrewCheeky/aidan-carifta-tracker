import io
import sys
import unittest
from pathlib import Path
from reportlab.pdfgen import canvas
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from extract_asaj import extract

def pdf(lines):
    out=io.BytesIO(); c=canvas.Canvas(out)
    for i,line in enumerate(lines): c.drawString(40,780-i*20,line)
    c.save();return out.getvalue()

class ExtractTest(unittest.TestCase):
    def test_affiliation_not_filter(self):
        b=pdf(['Boys 13-14 200m Breaststroke','Aidan Seaton JAMAICA 2:53.01',
               'Aidan Seaton SCHOOL 2:51.90'])
        r=extract(b,'https://asaj.com.jm/x.pdf/@@download/file','abc','rankings')
        self.assertEqual(len(r),2)
        self.assertTrue(all(x['event']=='200 Breast' for x in r))
        self.assertTrue(all(x['verified'] is False for x in r))
    def test_unrelated_swimmer_excluded(self):
        r=extract(pdf(['Boys 12 50m Freestyle','Other Swimmer 28.40']), 'https://asaj.com.jm/a','x','rankings')
        self.assertEqual(r,[])
    def test_ambiguous_time_is_not_approved(self):
        r=extract(pdf(['Aidan Seaton 1:01.20 1:02.30']), 'https://asaj.com.jm/a','x','events')
        self.assertEqual(r[0]['times_on_line'],['1:01.20','1:02.30'])
        self.assertIsNone(r[0]['event'])
if __name__=='__main__': unittest.main()
