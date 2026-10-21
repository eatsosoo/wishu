"""Export mobile-sized WebP assets from PNG masters without cropping their canvases."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'artwork' / 'home'
NAMES = ('male', 'female', 'neutral', 'waiting')

if __name__ == '__main__':
    before = after = 0
    for name in NAMES:
        source = ROOT / f'{name}.png'
        destination = ROOT / f'{name}.webp'
        previous = destination.stat().st_size if destination.exists() else source.stat().st_size
        with Image.open(source) as original:
            image = original.convert('RGBA')
            # The reduced home layout displays each slot at at most ~204 dp.
            # Keep approximately 3x density and the full 1:2 canvas for alignment.
            image.thumbnail((608, 1216), Image.Resampling.LANCZOS)
            image.save(destination, 'WEBP', quality=80, method=6, exact=True)
        with Image.open(destination) as exported:
            assert exported.size == (608, 1216), f'{name}: unexpected canvas'
            assert exported.mode == 'RGBA', f'{name}: transparency lost'
            assert exported.getchannel('A').getextrema() == (0, 255)
        current = destination.stat().st_size
        before += previous
        after += current
        print(f'{name}: {previous:,} -> {current:,} bytes')
    print(f'Total WebP: {before:,} -> {after:,} bytes ({100 * (1 - after / before):.1f}% smaller)')
