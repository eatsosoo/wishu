# Photo uploads and wish deletion

Selected photos must be JPEG, PNG, WebP or HEIC/HEIF, at most 20 MiB and 48 megapixels. `src/services/optimize-photo.ts` processes each selection locally with Expo ImageManipulator before the preview is accepted. The long edge is reduced to at most 1600px without enlarging smaller photos. JPEG compression tries quality 0.8, 0.6 and 0.45; output exceeding 2 MiB is rejected. Multiple photos are processed and uploaded sequentially. Each memory accepts at most eight photos, enforced by the UI, client upload layer and backend.

The private `wish-photos` Storage bucket also rejects new uploads above 2 MiB. Its accepted upload MIME types are JPEG, PNG and WebP; HEIC inputs are converted to JPEG by the app. Existing uploaded files remain readable. Built-in category artwork is bundled separately and retains its alpha channel.

Memory photo selections are center-cropped to a square before resizing and compression. Each selected thumbnail has a crop button at its bottom-right corner. Before completing the wish, users can drag, zoom, move with arrow buttons, or reset the crop to the center. Every edit is regenerated from the selected original, which stays local to the form; only the final square JPEG is uploaded. Wish cover photos retain their original aspect ratio. Existing memories display with a centered square crop without rewriting their files.

The owner's wish detail menu includes **Xoá điều ước** and a confirmation sheet. The backend independently checks ownership. Deletion removes the wish and its preparations, preserving memories and gift notifications. Storage files are retained because completed memories can reference the same cover. Account deactivation retains the couple's stored files.

## Apply backend changes

Run against the intended linked Supabase project before releasing this frontend:

```sh
npx supabase db push
npx supabase functions deploy wish-action
```

This applies `202610190002_photo_upload_limits.sql` and the new `delete` command handler. These commands are deployment steps; local code changes alone do not update the live backend.

The relational database migration also moves deletion into the transactional DB command handler. Apply pending migrations in order and deploy the current `wish-action`; see [database setup](DATABASE.md).

Expo ImageManipulator is a native dependency. Rebuild the development/release app after adding it; web builds include the web implementation. Use `npx eas-cli@latest build --profile development --platform android` (or `ios`) for a development build.

## Verification

```sh
node --test tests/domain.test.cjs tests/photo-optimization.test.cjs tests/artwork-loading.test.cjs
npm run lint
npm run typecheck
npm run build:web
```

On a device, verify a large landscape and portrait photo, an unsupported file, an input over 20 MiB, eight-photo completion, failed upload/retry, and deletion of an owned wish with an existing memory. Verify that another member cannot delete that wish through the API.
