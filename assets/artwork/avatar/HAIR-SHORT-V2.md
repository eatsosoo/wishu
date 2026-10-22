# Male hairstyle 1: compact textured crop

Generated with the built-in ImageGen tool, with transparent background enabled.
Edit target: `parts/hair-short.webp` before replacement. Supporting head geometry:
`parts/face-peach.webp`. Source saved as `hair-short-v2.png`. Runtime derivative:
`parts/hair-short.webp` (512 × 700 canvas; measured silhouette fitted to
`rig.json`'s direct box). Regenerate only this item with:

```sh
python scripts/export-avatar-parts.py --hair short
```

The new source already follows the head geometry, so its registration uses a
direct box rather than applying the older atlas's crown/temple correction again.
All other runtime parts and existing saved item IDs remain unchanged.

## Exact generation prompt

Use case: precise-object-edit. Asset type: replacement modular hair sprite for a 3D clay chibi avatar. Image 1 is the EDIT TARGET hair-only sprite; image 2 is SUPPORTING bald head geometry only, must NOT appear in output. Redesign ONLY the first male short hairstyle into a cute compact textured French crop: gently rounded close-fitting crown, short softly tapered temples, several small softly irregular fringe tufts ending above eyebrows, subtle natural asymmetry. Clearly a NEW haircut; eliminate the old huge sideways swept stacked coils, bulky quiff and overhanging wide sides. Warm cocoa brown, same sculpted soft matte clay material, shallow strand grooves, soft warm studio lighting, orthographic front view. Preserve transparent 512x700 registered canvas proportions of image 1 and same central x=256 axis. The bald head reference scalp is x144..368, y130..264, ears x118..394 y265..327. Hair visible target bbox approximately x119..393 y95..239; crown closely wraps scalp, a few short fringe tips at y205..228, temple tips stop before ears and never cross eye area x170..344 y236..284. MUST cover the top of the bald head at x210..302 y130..150. Keep ALL pixels below y250 transparent. Important: output ONE HAIR-ONLY sprite, no head, no face, no skin, no ears, no eyes, no glasses, no body, no text, no guides, no shadow on background, NO checkerboard. The face opening and entire canvas outside the hair must be genuinely transparent alpha. Keep large transparent lower canvas so it layers directly on the existing full-body avatar.
