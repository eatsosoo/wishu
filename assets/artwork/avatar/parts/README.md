# Independent avatar parts

The app imports these 26 WebP files through `src/features/avatar/assets.ts`.
Every file has a transparent 512 × 700 canvas and already contains its own
registered placement. Render full canvases at the same scale, without cropping,
trimming transparent padding, or stretching parts independently.

- `face-{skin}.webp`: 4 faces, excludes the old separate neck.
- `body-{outfit}-{skin}.webp`: 12 bodies, including connected neck/collar/hands.
- `hair-{id}.webp`: 7 hairstyles, shared by all skin tones.
- `eyes-{id}.webp`: 2 eye expressions.
- `glasses-round.webp`: 1 glasses overlay.

Draw order: body → face → eyes → hair → hair color tint → glasses.
The shared centerline is x=256. The face ends around y=359; the body's neck
extends behind it. These dimensions are registration coordinates, not UI sizes.

Source atlases remain outside this folder for provenance and re-export only;
they are no longer referenced by the runtime. These assets were extracted from
existing artwork, not regenerated, so their source detail/resolution is unchanged.

To reproduce: run `python3 scripts/export-avatar-parts.py` with Pillow installed.
`manifest.json` records the source region, destination box and file size. The
script also generates the static Metro imports. If hand-editing an individual
part, preserve its canvas/anchors and update the export workflow before rerunning
it; the exporter overwrites generated files.
