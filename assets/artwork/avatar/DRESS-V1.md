# Rose dress outfit

Created with the built-in ImageGen tool with actual alpha transparency. The four
`parts/body-rose-{peach,warm,tan,deep}.webp` files were pose, material and skin
references. Source atlas: `dress-atlas-v1.png` (1448 × 1086). The four measured
crops are in `rig.json` under `outfits.dressRose`.

`scripts/export-avatar-parts.py` registers each dress body to the existing
240 × 300 body bounds, neck top and feet baseline, on a 512 × 700 transparent
canvas. Runtime assets: `parts/body-dressRose-{peach,warm,tan,deep}.webp`.
The source atlas is not imported into the app. The `dressRose` item is listed as
“Váy hồng” for female profiles; unspecified/other profiles follow the existing
inclusive catalog policy. Female profiles default to the dress; previously saved
sweater outfits normalize to the dress when loaded, preserving the rest of the
customization. Male profiles retain their three sweater outfits. Saved IDs and
configuration version stay compatible.

## Exact generation prompt

Use case: precise-object-edit. Production sprite atlas for existing modular clay chibi avatars. Four reference images are supporting BODY/POSE AND SKIN COLOR references: image1 peach skin, image2 warm tan skin, image3 medium brown skin, image4 deep brown skin. Create one transparent 2 columns by 2 rows sprite atlas, each cell has ONE IDENTICAL HEADLESS FULL BODY wearing a cute dusty rose pink A-line dress, ivory rounded Peter Pan collar, short softly puffed sleeves, a tiny waist bow, gently flared skirt hem at knees, bare short lower legs, ivory socks and cream rounded Mary Jane shoes. Chibi soft matte 3D clay, gentle studio lighting, same front-facing pose and short plump proportions as references. Arms down beside dress, both hands fully visible. Only exposed neck/hands/knees change skin tone: top-left peach #F4C7A5, top-right warm #DFA477, bottom-left tan #B97C56, bottom-right deep #845239. Dress, pose, body width, neck position, hand positions and shoes MUST be identical in all four cells. Neck is short flat-topped cylinder suitable for compositing behind a separate head: no head, no face, no hair, no detached accessories. Approximate intended body proportions neck-to-sole height 300 units, whole width including hands 240 units. Each body centered in its equal cell with generous transparent padding and clear separation. Do not draw the earlier sweater or trousers. Maintain cute style of reference clothes. Output one atlas ONLY, actual alpha transparency including gaps between legs/arms, no checkerboard, no labels, no text, no grid, no backdrop shadow, no full assembled avatar.
