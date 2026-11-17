import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ProfilePageTests(unittest.TestCase):
    def test_menu_links_to_profile_for_both_builds(self):
        for name in ('index.html', 'docs/index.html'):
            html = (ROOT / name).read_text(encoding='utf-8')
            nav = html.split('id="dashboard-nav"', 1)[1].split('</nav>', 1)[0]
            link = re.search(r'<a [^>]*href="profile\.html"[^>]*>', nav)
            self.assertIsNotNone(link, name)
            self.assertNotIn('data-tab', link.group(0), 'must be a normal link, not a tab')
            self.assertIn('Profile &amp; achievements', nav)

    def test_profile_page_and_photos_are_published_in_docs(self):
        for name in ('profile.html', 'docs/profile.html'):
            self.assertTrue((ROOT / name).exists(), name)
        html = (ROOT / 'docs/profile.html').read_text(encoding='utf-8')
        photos = set(re.findall(r'src="(images/profile/[^"]+)"', html))
        self.assertGreaterEqual(len(photos), 4)
        for photo in photos:
            self.assertTrue((ROOT / 'docs' / photo).exists(), photo)
            self.assertTrue((ROOT / photo).exists(), photo)

    def test_profile_links_back_to_tracker(self):
        html = (ROOT / 'docs/profile.html').read_text(encoding='utf-8')
        self.assertIn('href="index.html"', html)

    def test_root_and_docs_copies_match(self):
        self.assertEqual((ROOT / 'profile.html').read_bytes(), (ROOT / 'docs/profile.html').read_bytes())


if __name__ == '__main__':
    unittest.main()


class ProfileStoryPlaceholderTests(unittest.TestCase):
    def test_unfilled_placeholders_never_visible(self):
        import re
        for name in ('profile.html', 'docs/profile.html'):
            text = (ROOT / name).read_text(encoding='utf-8')
            section = re.search(r'<section id="story"([^>]*)>', text)
            self.assertIsNotNone(section, name)
            if '[FILL IN' in text:
                self.assertIn('hidden', section.group(1), f'{name}: placeholders present but story section is not hidden')
                self.assertRegex(text, r'<a href="#story" hidden>', f'{name}: nav link must stay hidden too')
