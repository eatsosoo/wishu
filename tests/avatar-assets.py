"""Geometry checks on actual encoded runtime assets (requires Pillow)."""
import json
from pathlib import Path
import unittest
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/artwork/avatar'
RIG = json.loads((ART / 'rig.json').read_text())
MANIFEST = json.loads((ART / 'parts/manifest.json').read_text())


def alpha(name):
    with Image.open(ART / 'parts' / f'{name}.webp') as image:
        return image.getchannel('A')


class AvatarRegistration(unittest.TestCase):
    def test_all_layers_share_rig_and_canvas(self):
        self.assertEqual(MANIFEST['rigVersion'], RIG['version'])
        self.assertEqual(MANIFEST['anchors'], RIG['anchors'])
        self.assertEqual(len(MANIFEST['parts']), 30)
        for name in MANIFEST['parts']:
            with self.subTest(name=name):
                layer = alpha(name)
                self.assertEqual(layer.size, (512, 700))
                self.assertEqual(layer.getextrema(), (0, 255))

    def test_skin_and_outfit_silhouettes_share_bounds(self):
        for name, item in MANIFEST['parts'].items():
            kind = 'body' if name.startswith('body-') else 'face' if name.startswith('face-') else None
            if kind:
                with self.subTest(name=name):
                    self.assertEqual(item['box'], RIG['bounds'][kind])
                    x, y, width, height = item['box']
                    bounds = alpha(name).point(lambda a: 255 if a >= 128 else 0).getbbox()
                    for actual, expected in zip(bounds, (x, y, x + width, y + height)):
                        self.assertLessEqual(abs(actual - expected), 1)

    def test_no_gap_between_chin_neck_and_collar(self):
        for name in MANIFEST['parts']:
            if name.startswith('body-'):
                with self.subTest(name=name):
                    layer = alpha(name)
                    for y in range(RIG['anchors']['neckTop'], RIG['anchors']['collar'] + 1):
                        self.assertGreaterEqual(layer.getpixel((256, y)), 128)

    def test_all_hair_keeps_both_eyes_clear(self):
        x, y, width, height = RIG['hair']['eyeClearance']
        for hair in RIG['hair']['ids']:
            with self.subTest(hair=hair):
                opening = alpha(f'hair-{hair}').crop((x + 2, y + 2, x + width - 2, y + height - 2))
                self.assertLess(opening.getextrema()[1], 64)

    def test_long_hair_retains_its_length(self):
        for hair, registration in RIG['hair']['registrations'].items():
            with self.subTest(hair=hair):
                box = MANIFEST['parts'][f'hair-{hair}']['box']
                self.assertGreaterEqual(box[3], registration.get('minHeight', 0))

    def test_hair_volume_matches_skull_instead_of_ear_to_ear_width(self):
        # The face canvas includes protruding ears. Measure the skull above them.
        skull = alpha('face-peach').crop((0, 180, 512, 250))
        skull_bounds = skull.point(lambda a: 255 if a >= 128 else 0).getbbox()
        skull_width = skull_bounds[2] - skull_bounds[0]
        for hair in RIG['hair']['ids']:
            with self.subTest(hair=hair):
                bounds = alpha(f'hair-{hair}').point(lambda a: 255 if a >= 128 else 0).getbbox()
                self.assertLessEqual(bounds[2] - bounds[0], skull_width * 1.65)
                if hair not in ('bun', 'spaceBuns'):
                    self.assertGreaterEqual(bounds[1], RIG['anchors']['scalpTop'] - 45)

    def test_fitted_hair_still_covers_the_top_of_the_scalp(self):
        scalp = alpha('face-peach').crop((0, 130, 512, 150)).point(lambda a: 255 if a >= 128 else 0)
        for hair in RIG['hair']['ids']:
            with self.subTest(hair=hair):
                cover = alpha(f'hair-{hair}').crop((0, 130, 512, 150)).point(lambda a: 255 if a >= 128 else 0)
                uncovered = ImageChops.subtract(scalp, cover)
                scalp_pixels = sum(scalp.histogram()[128:])
                self.assertLessEqual(sum(uncovered.histogram()[128:]), scalp_pixels * 0.02)


if __name__ == '__main__':
    unittest.main()
