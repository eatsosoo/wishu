"""Preserve PNG masters and full-canvas alignment; export alpha-safe WebP assets."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'artwork'
SIZES = {
    'home': 1024, 'couple': 768, 'bear': 768, 'camera': 768, 'concert': 768,
    'gift': 768, 'openGift': 768, 'gift-body': 768, 'gift-lid': 768,
    'jar': 640, 'jar-open': 640, 'jar-lid': 640,
}

if __name__ == '__main__':
    before = after = 0
    for name, size in SIZES.items():
        source, destination = ROOT / f'{name}.png', ROOT / f'{name}.webp'
        with Image.open(source) as original:
            image = original.convert('RGBA')
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
            image.save(destination, 'WEBP', quality=85, method=6, exact=True)
        before += source.stat().st_size
        after += destination.stat().st_size
        print(f'{name}: {source.stat().st_size:,} -> {destination.stat().st_size:,} bytes')
    print(f'Total: {before:,} -> {after:,} bytes ({100 * (1 - after / before):.1f}% smaller)')
