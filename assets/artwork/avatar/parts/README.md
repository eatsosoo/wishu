# Avatar registration standard (rig v2)

`../rig.json` is the source of truth for both the exporter and `Avatar.tsx`.
All 30 runtime WebP layers use a **512 × 700 transparent canvas**. Render full
canvases at one scale. Never trim padding or add per-item runtime offsets.
Coordinates below are artwork pixels, not device pixels.

| Landmark | Coordinate |
| --- | --- |
| Vertical center | x = 256 |
| Bald scalp top | y = 130 |
| Eyes | y = 259 |
| Chin | y = 360 |
| Neck top, behind chin | y = 344 |
| Collar reference | y = 378 |
| Feet baseline | y = 644 |
| Face including ears | x = 118…394, y = 130…360 |
| Body including neck | x = 136…376, y = 344…644 |
| Hair eye opening | x = 170…344, y = 236…284 |

The 16 px overlap between chin and neck prevents gaps. The collar reference is
an art direction landmark; the neck top and feet are the measured body anchors.
All skins and outfits share the same visible bounds. Neck and hands belong to
the body and always use the selected skin. Faces contain no separate neck.

Draw order: **body → face → eyes → hair → hair tint → glasses**.
Long side locks must remain outside the face opening. Hair must contain no ears,
skin, faces or eyes, since every style is shared by all four skin tones.

## Export and review

Run `python scripts/export-avatar-parts.py` with Pillow installed. Use
`--hair-only` when adjusting wigs to preserve the approved body, face, eyes and
glasses byte for byte. It generates
these assets, `manifest.json`, static Metro imports and `.preview/avatar/rig-v2.jpg`
(relative to the project root, excluded from Git).
The preview covers all 28 hair/skin pairs and cycles through outfits, expressions
and glasses. Run `python tests/avatar-assets.py` for geometry checks, then app lint
and typecheck.

Face/body registration measures the largest opaque connected silhouette inside
each source crop, removing disconnected atlas debris. It fits that silhouette to
the common bounds, so transparent atlas padding cannot change neck length.
Hair uses measured source crops in the rig, preserves only the connected wig,
and fits its transparent opening to the common eye clearance rectangle.
The additional `headFit` registration keeps that opening fixed while compressing
excess side volume toward the temples and lowering the crown toward the scalp.
Each style has a measured `fittedTop`; buns retain their height and long locks
retain their length below the eyes. Scaling a whole wig down would also shrink
its face opening and cover the eyes, so it is not used for this correction.
The fit is baked into the WebP at export, with no runtime transforms.
`short` now uses the separately redesigned `../hair-short-v2.png` source and a
direct fitted box. Its prompt and regeneration instructions are recorded in
`../HAIR-SHORT-V2.md`; `--hair short` exports only this item.
The `dressRose` outfit uses four skin-specific crops from `../dress-atlas-v1.png`,
normalized to the same neck and feet as the sweater bodies. See `../DRESS-V1.md`
for source and generation details.
Generated sheets must be measured; do not assume equal cells or exact coordinates.

`manifest.json` records rig version, anchors, source crops, measured silhouettes,
final placements and encoded bytes. Hair entries also record the pre-fit
`sourceBox` for reproducibility. Source atlases are never bundled at runtime.
Existing saved IDs/version remain compatible; `bob` still means long wavy hair.

## New artwork acceptance

Use the rig as a drawing template. Match the bald head outline, keep both eyes
clear, cover the scalp without floating gaps, and check jaw/neck/collar at full
size and mobile display size. Review all four skins, both expressions, glasses
and all three outfits. Geometry checks supplement visual QA.
Changing a hairstyle may change the crown or locks, never face/neck landmarks.
Update source and exporter together; generated assets are overwritten.

`hair-atlas-v4.png` was made with built-in ImageGen. The exact prompt is saved in
`../HAIR-RIG-V2-PROMPT.md`. Older atlases remain as source history.
