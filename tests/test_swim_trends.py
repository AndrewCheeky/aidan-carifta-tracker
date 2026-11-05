import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class SwimTrendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.js = (ROOT / 'app.js').read_text()
        cls.css = (ROOT / 'style.css').read_text()

    def test_pb_is_strict_cumulative_minimum(self):
        self.assertIn('const pb=n<best;best=Math.min(best,n)', self.js)
        self.assertIn('swim-race-pb', self.js)

    def test_race_direction_is_relative_to_previous(self):
        self.assertIn("n<previous?'improved':n>previous?'declined':'same'", self.js)
        for state in ('improved', 'same', 'declined'):
            self.assertIn('swim-segment.' + state, self.css)

    def test_dashed_trend_not_forecast(self):
        self.assertIn('function swimTrendValues(rows)', self.js)
        self.assertIn('stroke-dasharray:6 5', self.css)
        self.assertIn('not a forecast', self.js)

    def test_course_and_source_separation(self):
        self.assertIn("['LCM','SCM'].map(course", self.js)
        self.assertIn("origin:'SwimCloud'", self.js)
        self.assertIn('Source PDF', self.js)

if __name__ == '__main__': unittest.main()
