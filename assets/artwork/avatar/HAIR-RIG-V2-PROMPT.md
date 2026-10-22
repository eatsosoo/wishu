# Hair rig v2 source

Generated with the built-in ImageGen tool, transparent background enabled.
Historical edit targets were the v2 and v3 hair atlases, removed after being
superseded by the current source below.
Supporting head/style reference: `clay-atlas.png`.
Saved output: `hair-atlas-v4.png`.
The returned 1774 × 887 atlas does not strictly obey the requested equal cells;
measured crops and opening registration in `rig.json` correct that during export.

## Exact prompt

Use case: precise-object-edit. Create a replacement modular HAIR ONLY sprite atlas for this clay avatar app, based on reference images 1 and 2 hairstyles; image 3 is supporting head geometry/style reference only. Output transparent PNG, landscape 2048 x 1024, exactly FOUR columns by TWO rows of 512x512 cells. 7 hair sprites and last cell empty transparent. Row 1: short side swept, long wavy bob, high single bun, middle part curtains. Row 2: short curls, chin length bob with fringe, two space buns, empty. All hair cocoa brown sculpted 3D clay same style/material as references. Crucial STANDARDIZED FIT: same invisible bald head in EACH cell at bbox x116..396 y110..370, head center x256. Hair must cover scalp completely across x116..396 y110..225 with fringe on forehead. Face opening below hairline must fit identical head: temples at x122 and390 y230, cheeks x130..382 y300, chin center(256,370). NO large circular hole exposing bald forehead above fringe. Short styles end by y325; long locks lie OUTSIDE cheek boundary and can extend to y450. Crown hair top at y75 (bun tops y15), maximum x40..472. Forehead visible only BELOW y210 for middle parts or BELOW y240 for fringe. Every sprite is positioned for exactly same head, not independently centered to hairstyle bounds. Preserve distinct 7 hairstyle designs, but adjust inner silhouette to shared head. Hair only: NO faces, NO ears, NO skin-colored pixels, NO eyes, NO clothes. No labels, gridlines, shadows on background, guides, or assembled previews. True transparent alpha outside hair and within face opening. View straight on orthographic, symmetric head fit.
