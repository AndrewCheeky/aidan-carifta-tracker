import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = (ROOT / 'app.js').read_text()
CSS = (ROOT / 'style.css').read_text()

class AchievementRedesignTests(unittest.TestCase):
    def test_hero_verified_selection(self):
        self.assertIn('function achievementHero(all)', APP)
        self.assertIn('q?.source_pdf&&q?.source_page&&q?.date', APP)
        self.assertIn('qt<=bt', APP)
        self.assertIn("x.type==='Personal best'&&x.improvement>0", APP)

    def test_race_journey_is_not_duplicated_in_achievements(self):
        self.assertNotIn('function achievementJourney(event)', APP)
        self.assertNotIn('2026 race journey', APP)
        self.assertIn('function swimIntelligence()', APP)

    def test_event_links_open_matching_swim_history(self):
        self.assertIn('data-swim-event=', APP)
        self.assertIn('data-swim-section=', APP)
        self.assertIn("setTab('swim')", APP)
        self.assertIn('lcm.open=true', APP)
        self.assertIn('section.scrollIntoView', APP)

    def test_locked_milestones_only_for_positive_gaps(self):
        self.assertIn('function achievementNextUp()', APP)
        self.assertIn('qt>bt', APP)
        self.assertIn('qt>rt', APP)
        self.assertIn('.slice(0,3)', APP)

    def test_download_privacy_and_motion(self):
        self.assertIn("link.download='aidan-s-verified-achievement.png'", APP)
        self.assertIn("ctx.fillText('Aidan S. · Verified achievement'", APP)
        self.assertIn("prefers-reduced-motion: reduce", APP)
        self.assertIn('achievement-confetti', CSS)
        self.assertNotIn('coach_notes', APP)

if __name__ == '__main__':
    unittest.main()
