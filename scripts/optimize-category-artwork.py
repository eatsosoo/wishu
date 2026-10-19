"""Create display-sized WebP derivatives; preserve the original generated PNGs."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'artwork' / 'categories'
NAMES = ('gift', 'travel', 'dining', 'experience', 'moments')

if __name__ == '__main__':
    before = after = 0
    for name in NAMES:
        source = ROOT / f'{name}.png'
        destination = ROOT / f'{name}.webp'
        with Image.open(source) as original:
            image = original.convert('RGB')
            image.thumbnail((640, 640), Image.Resampling.LANCZOS)
            image.save(destination, 'WEBP', quality=82, method=6)
        before += source.stat().st_size
        after += destination.stat().st_size
        print(f'{name}: {source.stat().st_size:,} -> {destination.stat().st_size:,} bytes')
    print(f'Total: {before:,} -> {after:,} bytes ({100 * (1 - after / before):.1f}% smaller)')
