# Standalone artwork

Runtime assets live in `assets/artwork/`. The app renders individual images directly. It never renders `reference-design.png` or `reference-design-enhanced.png` or offsets a larger image to find a subregion.

Tool: built-in ImageGen. Source reference: the user's eight-screen design, `assets/reference-design.png`. Each call produced one standalone image, not a sprite sheet. Clay images use transparency; sample photographs use opaque backgrounds. The original screenshot is retained as design reference.

These are reconstructed assets and can differ in small details from original exported artwork. They are not crops or enlarged thumbnails.

| File | Dimensions | Use |
| --- | --- | --- |
| home.png | 1208 × 1302 | Couple with two wish jars |
| couple.png | 1586 × 992 | Couple profile, onboarding, login |
| jar.png | 1254 × 1254 | Wish-list header |
| gift.png | 1536 × 1024 | Preparing screen |
| openGift.png | 1586 × 992 | Completion screen and onboarding |
| camera.png | 1774 × 887 | Add-wish banner |
| bear.png | 1122 × 1402 | Wish cover, detail hero and memory |
| travel.png | 1122 × 1402 | Travel wish and memory |
| photobooth.png | 1122 × 1402 | Photobooth wish and sample photo |
| concert.png | 1122 × 1402 | Concert wish and memory |
| photoMemory.png | 1122 × 1402 | Photobooth memory |

Named variants such as `bearPortrait` share the same standalone high-resolution file through `Artwork.tsx`; no offsets or screenshot coordinates are used. Clay objects use `contain` to preserve their proportions. Photos use `cover` within cards and hero containers.

## Prompt set

All prompts supplied the original screenshot as the reference and explicitly requested exactly one independent asset, no screenshot, app screen, UI text, labels, buttons, borders or watermarks. Match source subject, original perspective, original warm pastel palette and materials, crisp detail. Minimum 1024 pixels on the short edge; wider renders for horizontal objects. Transparent backgrounds for 3D art.

- **home:** Reconstruct only the large clay illustration from the top-left panel. Brown-haired boy on the left and girl on the right, each leaning over a glass jar filled with pastel hearts, stars and notes. Floating coral heart between them. Match identities, hair, faces, poses and jar proportions. No flowers or text. Entire jars and heads visible.
- **couple:** Reconstruct the embracing couple from bottom-right. Tousled dark hair boy on left, long brown hair girl on right, white shirts, folded embracing arms and hovering coral heart. Match poses, expressions and clay style. Wide image with transparent padding.
- **jar:** Reconstruct small glass jar from the upper-right of wish-list panel. Cream lid, peach ribbon, miniature pastel hearts and stars. Match silhouette, bow and contents. Single isolated object.
- **gift:** Reconstruct wrapped gift from bottom-left. Cream-peach rounded square box, coral ribbon and large bow, raised heart on front and tiny hearts by base. Preserve perspective, proportions and materials.
- **openGift:** Reconstruct opened gift from bottom-second. Cream-peach box with pink ribbon, tilting lid, rising pink heart and scattered pastel confetti. Entire arrangement visible.
- **camera:** Reconstruct camera in top-third banner. Cream/blush rounded camera, beige lens with dark glass, pink buttons, heart decorations and black viewfinder. Preserve angle, shape and clay materials. No banner or plus button.
- **bear:** Reconstruct top-right teddy photograph. Cream fluffy seated bear, dark shiny eyes/nose, pink satin bow and pale pink plush flower. Warm beige room and soft pink blossoms. Full bear, crisp plush texture, portrait framing.
- **travel:** Reconstruct Da Lat thumbnail as a photograph. Two young women with dark hair seated on grassy hillside, white and blush casual clothes, mountain layers at sunset. Soft golden light and natural detail.
- **photobooth:** Reconstruct wish-thumbnail photograph. Hands holding two white photobooth strips with four candid portraits per strip of a smiling couple in dark casual clothes. Warm studio background, affectionate playful poses, clear paper edges and faces.
- **concert:** Reconstruct concert memory photograph. Audience silhouettes and raised hands, violet/magenta spotlights and amber sparks above stage. Preserve night-concert mood, realistic crisp beams.
- **photoMemory:** Reconstruct lower-right memory photograph. Hands holding two white photobooth strips, four couple portraits per strip, dark clothes, warm brown/peach background, candid affectionate poses.

### Home reframing prompt

Edit this existing illustration by reframing ONLY. Preserve both characters, jars, colors, shapes, poses, expressions and all details exactly. Remove the excess empty space above heads and below jar bases and remove all background glow/haze. Output a tightly framed nearly square portrait canvas, target aspect ratio 299:322, ideally 1536x1664, with the two entire glass jars and two characters visible, 3% transparent margin left/right/top/bottom. Top of heads/heart near top 3% and jar bases near bottom 96%. Fully transparent background outside the actual objects, no colored backdrop or haze. No text, no labels, no UI. Improve no other aspect: this is only tighter framing of the supplied standalone image.