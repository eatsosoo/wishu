# Category cover artwork

Generated with the built-in `image_gen` tool using `assets/artwork/home.png` as a style reference. Each PNG is a separate, opaque square asset. Legacy art IDs are retained; IDs referencing the missing travel/photobooth/photoMemory files now display the matching new cover.

Used by `src/features/wishes/default-cover.ts` when no personal photo is selected. Preview and saved cover share the same mapping. Uploaded photos take precedence.

Runtime uses 640×640 WebP derivatives (quality 82) instead of the original 1254×1254 PNGs. All five total 120,464 bytes rather than 7,899,227 bytes (98.5% smaller). PNGs remain as source files and are not imported into the app bundle.

Regenerate with `python scripts/optimize-category-artwork.py` (requires Pillow with WebP support). Only derivative `.webp` files are overwritten. The add-wish screen prefetches these five covers with `expo-image`; requests are deduplicated and a failed prefetch can be retried on the next visit. Image transitions keep the previous cover visible until its replacement loads.

New art names are validated by Supabase `wish-action`; deploy that function before releasing the updated frontend.

## Prompts

### Quà tặng — gift.png

Use case: stylized-concept. Create ONE standalone square category cover asset for Our Wish couples wish-list app. Reference image is style reference ONLY: match its premium cute rounded 3D clay/toy materials, softly glossy surfaces, warm studio lighting, soft contact shadows, pastel blush pink/lavender/butter cream palette. Do not copy people or jars. Warm opaque ivory #FFF9F5 seamless studio background, centered compact still life with generous 15% safe margins; object group takes 70% canvas. Highly readable at thumbnail scale, front three-quarter slightly elevated camera. No text, no letters, no logo, no watermark, no UI, no borders. 1024x1024. Category subject: A beautiful pastel rose-pink gift box with a plush cream ribbon bow, a small soft cream teddy bear sitting beside it and one tiny heart ornament. Convey a thoughtful romantic gift. Restrained 3 objects.

### Du lịch — travel.png

Use case: stylized-concept. Create ONE standalone square category cover asset for Our Wish couples wish-list app. Reference image is style reference ONLY: match its premium cute rounded 3D clay/toy materials, softly glossy surfaces, warm studio lighting, soft contact shadows, pastel blush pink/lavender/butter cream palette. Do not copy people or jars. Warm opaque ivory #FFF9F5 seamless studio background, centered compact still life with generous 15% safe margins; object group takes 70% canvas. Highly readable at thumbnail scale, front three-quarter slightly elevated camera. No text, no letters, no logo, no watermark, no UI, no borders. 1024x1024. Category subject: A rounded pastel lavender travel suitcase with small wheels, a little cream airplane resting diagonally above/behind it, a folded blush map and one small peach heart luggage tag. Convey a trip together. No writing on tag or map.

### Ăn uống — dining.png

Use case: stylized-concept. Create ONE standalone square category cover asset for Our Wish couples wish-list app. Reference image is style reference ONLY: match its premium cute rounded 3D clay/toy materials, softly glossy surfaces, warm studio lighting, soft contact shadows, pastel blush pink/lavender/butter cream palette. Do not copy people or jars. Warm opaque ivory #FFF9F5 seamless studio background, centered compact still life with generous 15% safe margins; object group takes 70% canvas. Highly readable at thumbnail scale, front three-quarter slightly elevated camera. No text, no letters, no logo, no watermark, no UI, no borders. 1024x1024. Category subject: A sweet miniature dinner for two: two matching cream ceramic cups with tiny raised pink heart motifs, a small plate of strawberry cake between them, and two simple rounded gold forks. Compact romantic cafe still life, no table or room.

### Trải nghiệm — experience.png

Use case: stylized-concept. Create ONE standalone square category cover asset for Our Wish couples wish-list app. Reference image is style reference ONLY: match its premium cute rounded 3D clay/toy materials, softly glossy surfaces, warm studio lighting, soft contact shadows, pastel blush pink/lavender/butter cream palette. Do not copy people or jars. Warm opaque ivory #FFF9F5 seamless studio background, centered compact still life with generous 15% safe margins; object group takes 70% canvas. Highly readable at thumbnail scale, front three-quarter slightly elevated camera. No text, no letters, no logo, no watermark, no UI, no borders. 1024x1024. Category subject: A small blush pink toy-like Ferris wheel with cream and lavender gondolas, accompanied by two overlapping cream admission tickets decorated with only a raised pink heart and a tiny gold star. A joyful shared date/adventure. No characters, no lettering or numbers.

### Khoảnh khắc — moments.png

Use case: stylized-concept. Create ONE standalone square category cover asset for Our Wish couples wish-list app. Reference image is style reference ONLY: match its premium cute rounded 3D clay/toy materials, softly glossy surfaces, warm studio lighting, soft contact shadows, pastel blush pink/lavender/butter cream palette. Do not copy people or jars. Warm opaque ivory #FFF9F5 seamless studio background, centered compact still life with generous 15% safe margins; object group takes 70% canvas. Highly readable at thumbnail scale, front three-quarter slightly elevated camera. No text, no letters, no logo, no watermark, no UI, no borders. 1024x1024. Category subject: A rounded vintage instant camera in warm cream and pastel rose pink with a glossy lavender lens, two small blank instant photo prints leaning against it whose picture areas depict simple raised pink clay hearts, and a tiny gold star charm. Convey treasured everyday memories together. No text, no numbers, no faces, no brand.
