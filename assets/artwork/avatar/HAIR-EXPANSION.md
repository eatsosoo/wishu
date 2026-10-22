# Four additional clay hairstyles

Historical generation notes for the v3 hair atlas, using v2 as its material/style reference. Both obsolete atlases have been removed; `hair-atlas-v4.png` now supplies these styles. Top row: curtains and short curls (male). Bottom row: chin-length bob and twin buns (female). Other/unspecified profiles can access all styles. All styles support the existing color overlay; old saved hairstyle IDs remain valid.

Current crop and placement coordinates are in `rig.json`. Generated review images
are written to `.preview/avatar/`, outside the production asset directory.

## Prompt

Create one transparent production sprite atlas containing FOUR NEW hair-only wigs in a precise 2 columns x 2 rows square grid. Reference image is style/material reference: identical rich chestnut cocoa clay, sculpted chunky strands, soft warm studio lighting. Strict straight-on front view for modular chibi avatar. Top left: boy neat center-part curtain hairstyle, short at ears, forehead opening and fringe ABOVE eyes. Top right: boy short rounded curly hair with many sculpted soft curls, above eyebrows and ears. Bottom left: girl chin-length sleek rounded bob, gently curved straight bangs ending ABOVE eyebrows, sides framing open face. Bottom right: girl twin space buns with central part and two short curved side tendrils, forehead visible. All wigs same head size, face opening and scale. NO heads, NO ears, NO skin, NO eyes, NO eyebrows, NO neck, NO mannequin. Face holes must be genuinely transparent. Each isolated wig fits entirely inside its own equal square cell, with at least 10% transparent margins on ALL sides, no cross-cell overlap. Same central face axis in each tile. Precisely four objects only, no text or borders or baked checkerboard or background shadow. Full transparent PNG alpha. Keep silhouette continuous, absolutely no cut-off ends.
