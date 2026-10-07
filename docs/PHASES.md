# Our Wish — implementation phases

`MASTER_SPEC.md` is the product specification. `assets/reference-design.png` is the visual source of truth for all eight layouts, colors and artwork direction. After the user reported blurry screenshot crops, standalone high-resolution assets were reconstructed from this reference. Preserve screen layouts and match source subjects; see `ARTWORK.md` for asset provenance and detail limitations.

## Phase 1–3

Status: implemented, awaiting the user's visual review before Phase 4.

- Expo SDK 57, strict TypeScript, Expo Router in `src/app/`.
- NativeWind, shared colors, typography, radius and spacing tokens.
- Home, Wishes, Wish Detail, Add Wish, Preparing, Complete Wish, Memories and Couple Profile with mock data. Memory Detail supports the memory grid.
- Forms, category filters, favorites, private mock preparations and completion work locally.

The interface must be reviewed before connecting Supabase. Mock data is isolated behind a repository contract; no Supabase credentials or network calls are present.

## Validation (7 October 2026)

- Expo lint: passed with no errors or warnings.
- Strict TypeScript: passed.
- Five domain checks: passed (privacy filtering, owner restriction, idempotency, wish ownership and date validation).
- Production web export: passed.
- Browser: all eight screens load without runtime errors.
- Browser flow: jar navigation, categories, favorites, prepare surprise, invalid date rejection, local photo selection, completion, memory detail, switching profiles, invalid URL rejection, adding wish and updating jar count all passed.
- 375px, 430px and desktop: no horizontal page overflow.

Native device builds are reserved for the later mobile phase.

## Next phases

4. Supabase setup.
5. Authentication and couple pairing.
6. Wish CRUD.
7. Surprise logic and RLS; only the preparer reads preparation state.
8. Memories and Storage.
9. Realtime without leaking secret preparation events.
10. Animation polish.
11. Responsive web testing.
12. Vercel deployment.

After a stable web MVP: native builds, push notifications, haptics and store releases.

## Artwork fidelity

`Artwork` renders standalone high-resolution images from `assets/artwork/`. Screenshot viewports, coordinate offsets and enlargement of the original eight-screen image have been removed. At the user's request to fix blurry images, individual assets were reconstructed from the reference; small details can differ. UI text, forms, cards and navigation remain real components. Original full-resolution exports can replace the corresponding standalone files later.
