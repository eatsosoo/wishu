# Private check-in map

Only authenticated members of the same space can read its check-in rows and
private photo objects. Membership has two allowed actor slots and a unique
constraint per space/slot. Knowing a check-in ID or object path grants no access.

`202610220002_check_in_privacy.sql` keeps `wish-photos` private, adds restrictive
space boundaries for location and Storage reads, and requires new/replacement
check-in photos to reference the creator's upload folder. Public external image
URLs, another space's objects and the partner's unshared draft images are rejected
by both the Edge Function and the database trigger.

The app downloads check-in images on demand using authenticated Storage requests and passes
local thumbnail image data to the map. It does not generate signed URLs for these photos or
send the session token into the map/WebView. The download cache is memory-only,
deduplicates requests, bounds concurrent downloads and is cleared on logout,
account/space changes and loss of membership. Old in-flight downloads cannot
repopulate a cleared cache. Map viewport state is scoped to the authenticated
screen, rather than retained in a global variable across accounts. Check-in
images are not added to Expo Image's disk cache.
Authenticated downloads explicitly bypass the browser HTTP cache (`no-store`).

### Small previews and on-demand full photos

New uploads create a separate center-cropped JPEG thumbnail at 144 × 144 pixels,
quality 0.72. Its private object path is the original path plus `.thumb-144.jpg`.
The original remains unchanged. The same derivative mechanism covers uploaded
wish/memory photos displayed in calendar cells.

Metadata refreshes never download check-in images. Calendar cells request only
the displayed month's thumbnails. The map requests thumbnails only for visible,
unclustered pins, and keeps a placeholder pin visible while each image loads.
Opening check-in details or the active check-in slide requests the full image.
There are at most three downloads at once, with full-size requests prioritized
over queued thumbnails. A failed image can be retried without failing the screen.

Migrations `202610220003` and `202610220004` authorize derivative reads only when
the original is visible through the existing check-in, memory or wish policies.
Hidden wish cover thumbnails remain hidden. Missing thumbnails from older clients
fall back to generating a local thumbnail from an authenticated original; denied
requests never fall back to public/signed URLs.

For old uploaded photos, run `scripts/backfill-check-in-thumbnails.cjs` with
`WISHU_IMAGE_PYTHON` pointing to a Python runtime containing Pillow. It uses the
linked Supabase CLI, skips existing derivatives, leaves rows/originals intact and
cleans temporary files. `supabase/tests/thumbnails-postflight.sql` verifies
coverage and aggregate byte sizes without printing private paths.

The migration preserves existing data. A legacy external check-in photo must be
replaced with an uploaded private photo; the app fails closed instead of fetching
the public image. Other existing wish/memory image handling is unchanged.

## Release and verification

```sh
node --test tests/check-ins.test.cjs tests/check-in-photo-privacy.test.cjs tests/wish-action.test.cjs tests/relational-db.test.cjs tests/wish-visibility.test.cjs tests/account-deletion.test.cjs tests/calendar-check-ins.test.cjs
npm run lint
npm run typecheck
npm run build:web
npx supabase db push --linked --dry-run
npx supabase functions deploy wish-action --use-api
npx supabase db push --linked
npx supabase db query --linked --file supabase/tests/check-in-privacy-postflight.sql
npx supabase db query --linked --file supabase/tests/check-ins-postflight.sql
```

Release the updated client as well as the backend. Old clients still generate
signed URLs; signed URLs previously issued by Supabase remain bearer links until
their expiry (the former app lifetime was one hour). This change does not revoke
those existing links. It also cannot prevent an authorized member from saving or
sharing image bytes or screenshots. This is account-based access control; it is
not end-to-end encryption and does not exclude authorized backend administrators.

## Verified deployment, 2026-10-22

Migration `202610220002` and the updated `wish-action` function were deployed to
the linked project. Both postflight SQL scripts passed. Live requests without a
session, and a mutation request with a forged session, returned HTTP 401. The
running web app still rendered authenticated check-in photos as inline image data
with no broken images. The local security and regression suites passed 39 tests.

## Thumbnail deployment, 2026-10-22

Migrations `202610220003` and `202610220004` were applied to the linked project.
Backfill covered all three stored photos referenced by check-ins, memories and
wishes, with no missing thumbnails. The original objects total 1,558,456 bytes;
the JPEG derivatives total 14,716 bytes. Originals and relational rows were not
changed. Live browser checks confirmed 144 × 144 calendar images and a 1600 ×
1600 check-in image when its album slide was opened. The security postflight,
28 targeted tests, lint, typecheck and production web export passed.
