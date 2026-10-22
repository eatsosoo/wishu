"""Extract transparent, registered avatar parts. Run with Python + Pillow.

Master atlases are retained for provenance, but are never imported by the app.
All exported parts use the same 512x700 canvas; do not trim transparent margins.
"""
from pathlib import Path
import argparse
import json
from collections import deque
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/artwork/avatar'
OUT = ART / 'parts'
RIG = json.loads((ART / 'rig.json').read_text())
CANVAS = (RIG['canvas']['width'], RIG['canvas']['height'])
SKINS = ('peach', 'warm', 'tan', 'deep')
OUTFITS = ('rose', 'sage', 'lavender', *RIG.get('outfits', {}).keys())
HAIR = RIG['hair']['ids']


def isolate_silhouette(part):
    """Discard disconnected atlas debris before measuring the visible object.

    Never use a cell's transparent padding to align faces or necks. Keep a
    two-pixel feather around the connected silhouette to retain soft edges.
    Only use this on single connected parts (not eyes or glasses).
    """
    alpha = part.getchannel('A')
    width, height = part.size
    pixels = alpha.tobytes()
    seen = bytearray(width * height)
    largest = []
    for start, value in enumerate(pixels):
        if seen[start] or value < 128:
            continue
        seen[start] = 1
        queue = deque([start])
        component = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x, y = index % width, index // width
            for adjacent in (index - 1 if x else -1,
                             index + 1 if x + 1 < width else -1,
                             index - width if y else -1,
                             index + width if y + 1 < height else -1):
                if adjacent >= 0 and not seen[adjacent] and pixels[adjacent] >= 128:
                    seen[adjacent] = 1
                    queue.append(adjacent)
        if len(component) > len(largest):
            largest = component
    if not largest:
        raise ValueError('Missing opaque silhouette')
    mask_bytes = bytearray(width * height)
    for index in largest:
        mask_bytes[index] = 255
    mask = Image.frombytes('L', part.size, bytes(mask_bytes))
    bounds = mask.getbbox()
    feather = mask.filter(ImageFilter.MaxFilter(5))
    part.putalpha(ImageChops.multiply(alpha, feather))
    return part, bounds


def fit_hair_to_head(canvas, registration):
    """Fit crown and outer volume without shrinking the opening over the eyes.

    Scaling the whole wig also shrinks its face opening, covering eyes/eyebrows.
    Keep that opening and the length below it fixed; reduce only excess crown
    height and side volume using the same head landmarks for every hairstyle.
    """
    fit = RIG['hair']['headFit']
    left, right = fit['temples']
    hairline = fit['hairline']
    side_scale = registration.get('sideScale', fit['sideScale'])
    crown_scale = (hairline - registration['fittedTop']) / (hairline - registration['top'])
    result = Image.new('RGBA', CANVAS)
    for x0, x1, inverse_x in (
        (0, left, lambda x: left + (x - left) / side_scale),
        (left, right, lambda x: x),
        (right, CANVAS[0], lambda x: right + (x - right) / side_scale),
    ):
        for y0, y1, inverse_y in (
            (0, hairline, lambda y: hairline + (y - hairline) / crown_scale),
            (hairline, CANVAS[1], lambda y: y),
        ):
            region = canvas.transform((x1 - x0, y1 - y0), Image.Transform.EXTENT,
                                      (inverse_x(x0), inverse_y(y0), inverse_x(x1), inverse_y(y1)),
                                      Image.Resampling.BICUBIC)
            result.alpha_composite(region, (x0, y0))
    return result


def main(hair_only=False, hairstyles=None):
    OUT.mkdir(exist_ok=True)
    sources = {}
    manifest = json.loads((OUT / 'manifest.json').read_text())['parts'] if hair_only else {}

    def export(name, source, crop, box, normalize=False, fit_hair=None):
        if source not in sources:
            sources[source] = Image.open(ART / source).convert('RGBA')
        x, y, w, h = crop
        left, top, width, height = box
        # Extract at source resolution first; registration uses actual geometry.
        part = sources[source].transform((round(w), round(h)), Image.Transform.EXTENT,
                                         (x, y, x + w, y + h), Image.Resampling.BICUBIC)
        bounds = None
        if normalize:
            part, bounds = isolate_silhouette(part)
            part = part.crop(bounds)
        if fit_hair:
            # Generated sheets rarely obey cell or forehead coordinates exactly.
            # Fit the actual transparent opening to the common eye rectangle.
            clearance = RIG['hair']['eyeClearance']
            scale_x = fit_hair['width'] / part.width
            half_opening = round(clearance[2] / scale_x / 2)
            center = part.width // 2
            alpha = part.getchannel('A')
            for opening_y in range(part.height // 5, part.height):
                scale_y = (clearance[1] - fit_hair['top']) / opening_y
                band_height = round(clearance[3] / scale_y)
                opening = alpha.crop((center - half_opening, opening_y,
                                      center + half_opening, opening_y + band_height))
                if opening.getextrema()[1] < 32:
                    break
            else:
                raise ValueError(f'{name}: no clear opening for both eyes')
            width = fit_hair['width']
            height = round(part.height * scale_y)
            if height < fit_hair.get('minHeight', 0):
                raise ValueError(f'{name}: opening fit would flatten the hairstyle')
            left = RIG['anchors']['centerX'] - width // 2
            top = fit_hair['top']
            box = (left, top, width, height)
        part = part.resize((width, height), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', CANVAS)
        canvas.alpha_composite(part, (left, top))
        source_box = None
        if fit_hair:
            source_box = box
            canvas = fit_hair_to_head(canvas, fit_hair)
            x0, y0, x1, y1 = canvas.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
            box = (x0, y0, x1 - x0, y1 - y0)
        path = OUT / f'{name}.webp'
        temporary = path.with_suffix('.tmp')
        canvas.save(temporary, 'WEBP', quality=90, method=6, exact=True)
        with Image.open(temporary) as check:
            assert check.size == CANVAS and check.mode == 'RGBA'
            assert check.getchannel('A').getextrema() == (0, 255)
        temporary.replace(path)
        manifest[name] = {'source': source, 'crop': crop, 'sourceBounds': bounds,
                          'box': box, 'bytes': path.stat().st_size}
        if source_box:
            manifest[name]['sourceBox'] = source_box

    if not hair_only:
        for i, skin in enumerate(SKINS):
            export(f'face-{skin}', 'clay-atlas.png', (i * 313.5, 0, 313.5, 280),
                   RIG['bounds']['face'], normalize=True)
            for j, outfit in enumerate(OUTFITS):
                registration = RIG.get('outfits', {}).get(outfit)
                source = registration['source'] if registration else 'body-atlas-v2.png'
                crop = registration['crops'][skin] if registration else (i * 313.5, j * 418, 313.5, 418)
                export(f'body-{outfit}-{skin}', source, crop, RIG['bounds']['body'], normalize=True)
    hair_source = RIG['hair']['source']
    for name in hairstyles or HAIR:
        registration = RIG['hair']['registrations'][name]
        direct_box = registration.get('box')
        export(f'hair-{name}', registration.get('source', hair_source),
               registration['crop'], direct_box or (0, 0, 1, 1),
               normalize=True, fit_hair=None if direct_box else registration)
    if not hair_only:
        for i, eye in enumerate(('round', 'smile')):
            export(f'eyes-{eye}', 'clay-atlas.png', (i * 313.5, 730, 313.5, 170), (145, 181, 222, 120))
        export('glasses-round', 'clay-atlas.png', (960, 495, 280, 125), (141, 203, 230, 103))
    (OUT / 'manifest.json').write_text(json.dumps({
        'rigVersion': RIG['version'], 'canvas': CANVAS,
        'anchors': RIG['anchors'], 'parts': manifest,
    }, indent=2) + '\n', encoding='utf-8')

    # Static imports ensure Metro bundles only individual parts.
    def record(prefix, ids):
        return '{\n' + ''.join(f"    {id}: require('../../../assets/artwork/avatar/parts/{prefix}-{id}.webp'),\n" for id in ids) + '  }'
    code = "// Generated by scripts/export-avatar-parts.py. Every part is a 512 × 700 transparent canvas.\n"
    code += "import type { AvatarConfig } from './catalog';\n\n"
    for name, prefix, ids, key in [('faces', 'face', SKINS, 'skin'), ('hair', 'hair', HAIR, 'hair'), ('eyes', 'eyes', ('round', 'smile'), 'eyes')]:
        code += f"export const {name}: Record<AvatarConfig['{key}'], number> = " + record(prefix, ids) + ';\n'
    code += "export const bodies: Record<AvatarConfig['outfit'], Record<AvatarConfig['skin'], number>> = {\n"
    for outfit in OUTFITS:
        code += f'  {outfit}: ' + record(f'body-{outfit}', SKINS) + ',\n'
    code += "};\nexport const glasses = require('../../../assets/artwork/avatar/parts/glasses-round.webp');\n"
    (ROOT / 'src/features/avatar/assets.ts').write_text(code, encoding='utf-8')
    print(f'Exported {len(manifest)} parts: {sum(item["bytes"] for item in manifest.values()):,} bytes')

    # Contact sheet exercises all hair/skin pairs and cycles outfits/expressions.
    # It uses the same full-canvas stacking as Avatar.tsx, without UI offsets.
    from PIL import ImageDraw
    scale = 0.5
    tile_w, tile_h = 256, 374
    preview = Image.new('RGB', (tile_w * len(SKINS), tile_h * len(HAIR)), '#F9F3EE')
    draw = ImageDraw.Draw(preview)
    for row, hair in enumerate(HAIR):
        for column, skin in enumerate(SKINS):
            composed = Image.new('RGBA', CANVAS)
            outfit = OUTFITS[(row + column) % len(OUTFITS)]
            expression = ('round', 'smile')[(row + column) % 2]
            names = [f'body-{outfit}-{skin}', f'face-{skin}', f'eyes-{expression}', f'hair-{hair}']
            if row % 2:
                names.append('glasses-round')
            for name in names:
                with Image.open(OUT / f'{name}.webp') as layer:
                    composed.alpha_composite(layer.convert('RGBA'))
            composed = composed.resize((int(CANVAS[0] * scale), int(CANVAS[1] * scale)), Image.Resampling.LANCZOS)
            preview.paste(composed, (column * tile_w, row * tile_h + 24), composed)
            draw.text((column * tile_w + 10, row * tile_h + 6), f'{hair} / {skin} / {outfit}', fill='#584038')
    preview_dir = ROOT / '.preview' / 'avatar'
    preview_dir.mkdir(parents=True, exist_ok=True)
    preview.save(preview_dir / 'rig-v2.jpg', quality=90)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hair-only', action='store_true', help='Regenerate hair without rewriting approved face/body/eye/glasses assets.')
    parser.add_argument('--hair', nargs='+', choices=HAIR, help='Regenerate only the named hairstyles, preserving all other parts.')
    args = parser.parse_args()
    main(hair_only=args.hair_only or bool(args.hair), hairstyles=args.hair)
