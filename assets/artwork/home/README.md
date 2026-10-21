# Independent home characters

Created with the built-in ImageGen tool from `../home.png`. Each transparent PNG master uses the same 887 × 1774 portrait canvas. The app loads the WebP derivatives, resized to 608 × 1216 with quality 80 and preserved alpha. Regenerate with `scripts/optimize-home-artwork.py`; PNG masters remain unchanged and are not imported by the app.

The artwork occupies 95% of the home width. Matching canvas sizes alone do not align the illustrations: their jar bases and horizontal centers differ. `HomeWishJars.tsx` uses measured glass anchors on the original 640 × 1280 reference canvas to center each jar and place every base on the same line before mirroring the right slot. Percentage offsets remain valid at the optimized resolution and every screen width. Character heights are intentionally independent; both labels stay centered on their jars.

All four source characters face **right**. The app flips only the image in the right slot with `scaleX: -1`, keeping labels readable and both characters facing inward for every pairing.

Prompt set:

- `male.png`: isolate the original male character and his full wish jar; preserve face, hands, clay style, lighting and pastel contents; remove the partner and floating heart; face right on a transparent portrait canvas.
- `female.png`: replace the male head/body with the original female identity facing right; preserve the jar geometry, palette and natural wrist pose.
- `neutral.png`: use an androgynous character with a short chestnut bob and ivory sweatshirt; preserve jar geometry and face right.
- `waiting.png`: replace the character with a faceless soft lavender clay silhouette, rounded right-facing nose, natural arms and tiny sparkles; keep the matching jar with softer pastel contents.

No text or labels are baked into the images. Names, counts and the invitation action remain interactive app components. The shared floating heart is rendered separately.

An explicit `joined` field from `get_my_couple()` distinguishes an empty partner slot from an existing member whose gender is unset. Existing members with unspecified gender use the neutral asset, independently of their name.
