> Current runtime uses independent WebP parts. See [parts/README.md](parts/README.md). The atlas description below records the original prototype.

# Clay avatar prototype

`clay-atlas.png` was generated with the built-in ImageGen tool using `../home/female.png` as the style reference. The app shares this transparent 1254 × 1254 atlas across users. Measured crop rectangles and placement anchors live in `src/features/avatar/Avatar.tsx`; do not assume exact equal-cell alignment. Hair colors use a translucent tint over the textured original. User configuration remains version 1 and local to the device.

This is prototype artwork: some hairstyles include small skin-colored ear details, so darker skin combinations need further art cleanup before production. Native rendering/performance has not yet been verified on a device.

## Generation prompt

Create a production transparent PNG modular avatar sprite atlas for Wishu. Reference image is STYLE ONLY: match its exquisite cute 3D clay figurine material, sculpted chestnut hair strands, soft peach cheeks, large glossy brown eyes, tiny nose and gentle smile, warm studio lighting. No jar. Not flat vector. Output ONE square 2048x2048 image, precisely 4 columns by 4 rows of equal 512x512 transparent cells, no grid or labels or background. Each cell contains ONLY the specified isolated part, no other parts. Parts will be composited in software. All coordinates below are LOCAL to each 512 cell. Front-facing orthographic view. Consistent alignment mandatory.
Row 1 four bald head bases in skin tones light peach, golden tan, medium brown, deep brown. IDENTICAL geometry: head oval bbox x140..372 y110..365, ears at (138,255),(374,255), short neck down to y410. Tiny nose centered (256,290), smiling mouth (256,329), rosy cheeks. NO eyes NO eyebrows NO hair NO clothes. Eye areas smooth unmarked skin.
Row 2 hair pieces ONLY: short tousled cocoa hair, bob cocoa hair, high bun cocoa hair, round thin cocoa glasses. Hair fitted to same head geometry: crown y75, scalp top y110, temples x140 and372, fringe ends above y225; transparent face opening below fringe. Bob side locks extend to y370 outside x145..367, bun reaches y30. Glasses lens centers (205,260),(307,260), radius36, empty transparent lenses.
Row 3 eye pairs ONLY: glossy wide brown eyes with ivory whites and highlights centered (205,260),(307,260), eyes each about 38x50 with small eyebrows above at y222; second cell smiling closed eye pair at SAME positions with eyebrows; third cell empty transparent; fourth cell empty transparent.
Row 4 clothes ONLY: rose pink sweatshirt bust, sage green sweatshirt bust, lavender sweatshirt bust, ivory sweatshirt bust. IDENTICAL geometry shoulders bbox x100..412 y375..490, collar opening centered (256,383), no neck/head/hands. Soft clay knitted material with ivory collar and tiny ivory heart chest detail. Transparent above clothes.
Keep all areas outside parts truly transparent, no checkerboard painted in. Do not add heads to hair cells or eyes cells. Do not render assembled previews. Precise sprite atlas with generous transparent padding inside each cell.
