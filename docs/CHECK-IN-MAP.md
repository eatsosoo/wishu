# Check-in map

Open **Kỷ niệm → Bản đồ kỷ niệm → Thêm check-in**. Select a location by tapping the map or requesting the current location, choose one photo, enter the place, date, companion and note, then save. Photo pins open a dedicated detail screen. Only the creator can edit or delete; both couple members can view.

The photo section offers **Chụp ảnh** and **Thư viện**. Camera access is requested only when taking a photo on native devices. If permission is permanently denied, the form offers a Settings shortcut. Canceling keeps the previous photo. Both sources share the photo optimization/upload pipeline. On web, capture uses the browser's file/camera picker; available camera options depend on the browser/device. Rebuild the native app to apply the image-picker permission messages. Test camera capture and denial on a physical phone.

New photos from either source are center-cropped to 1:1 before resizing/compression, using the same pipeline as memory photos. The form preview is square, and its crop button opens the shared editor to pan/zoom using the original selected file. Canceling the editor preserves the previous crop, and saving is blocked while editing/processing. Previously saved photos are not rewritten automatically; choose a replacement photo to crop them with this flow.

The shared crop editor uses a fixed full-screen layout without a ScrollView. Its preview expands to the text margins when height permits. Drag with one finger or a mouse, pinch with two fingers to zoom around their focal point, or use +/− on desktop. Directional arrow buttons have been removed. Adding/lifting a finger rebases the gesture to avoid jumping; crop limits prevent blank edges. Automated coverage includes gesture math, touch pinch, mouse pan and a stationary crop viewport. Native iOS behavior still requires a physical-device check.

The map uses OpenFreeMap vector tiles and MapLibre GL JS in a WebView on iOS/Android and an iframe on web. No map API key is required. Background, water, land, roads and labels follow all four app themes. Nearby pins cluster; overlapping locations spread at high zoom. Photo markers use a 54px square frame with an 8px triangle below it; the triangle tip anchors the location. Required OpenMapTiles/OpenStreetMap credits remain accessible through the compact ⓘ control. The optional OpenFreeMap brand is omitted, as permitted by https://openfreemap.org/#attribution. Internet access is required for tiles and the map renderer.

## Backend release

1. Apply `supabase/migrations/202610220001_check_ins.sql` to the project's Supabase database.
2. Deploy the updated `supabase/functions/wish-action` Edge Function.
3. Build the app with the new `expo-location` and `react-native-webview` dependencies. Existing development builds must be rebuilt.

The migration adds a couple-scoped table, RLS, transactional create/update/delete commands and photo-read access for the partner. Existing wishes and memories are preserved. Images use the existing private `wish-photos` bucket, optimization and signed URLs. Stable client IDs prevent duplicate check-ins on retries. Account/couple deletion cascades to check-ins.

Optional place search: set `EXPO_PUBLIC_GEOAPIFY_API_KEY` and rebuild. Without this key, map picking and current-location selection remain available. Restrict this public key in the Geoapify dashboard and keep its required attribution. No public Nominatim endpoint or autocomplete is used.

Validation: run lint, TypeScript and `node --test tests/check-ins.test.cjs tests/relational-db.test.cjs` using a supported Node runtime. Device QA should cover permissions denied, GPS unavailable, image upload retry, shared photo access, map clustering, switching themes, edit/delete ownership and back navigation.

The implementation was verified with web and Android bundle exports, 28 domain/database tests, and a browser flow using the real OpenFreeMap renderer against an isolated SQL database: create → photo pin → detail → edit → delete, clustering, changing map colors and picking a position. Run `tests/check-in-browser.cjs` after exporting web to `tmp/check-in-web`; make Playwright available through `NODE_PATH` if it is provided by the workspace runtime. Browser checks mock Supabase transport and do not modify the live project. See the applied backend release below. Native device testing remains a release step.

## Applied backend release — 2026-10-22

Migration `202610220001_check_ins.sql` was applied to linked project `rpodnpatutevydgpkzzd`, and `wish-action` version 17 was deployed with API bundling. Remote migration history confirms `202610220001`; the function is ACTIVE. `supabase/tests/check-ins-postflight.sql` verified create, idempotent update, snapshot read, delete, RLS and restricted mutation privileges in a rolled-back transaction. The HTTP endpoint returned CORS preflight 200 and the expected authenticated-handler 401 for a request without a session. No verification records were retained. Saving from the user's signed-in app session still needs a retry on the device; native camera behavior remains a physical-device check.
