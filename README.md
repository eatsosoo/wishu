# Our Wish

Expo + React Native + TypeScript + Expo Router, with an initial web preview. This repository implements Phases 1–3 of [the master specification](docs/MASTER_SPEC.md). The attached eight-screen design is the visual reference.

## Run

Use Node.js 22.13 or Node.js 24.3+ (Node 24 recommended), with npm.

```sh
npm install
npm run web
```

```sh
npm run typecheck
npm run lint
npm run test:domain
npm run build:web
npm run preview
```

All added packages are resolved with `expo install` for SDK compatibility. `npm run preview` serves the exported web app at http://127.0.0.1:4173.

## UI review

- `/`: Home, both wish jars and the day counter.
- `/wishes`: category filters, two jars and favorites.
- `/wish/new`: add a mock wish; image selection and form validation.
- `/wish/bear`: detail, reference link and surprise preparation.
- `/preparing`: only the active mock profile's private preparations.
- `/wish/bear/complete`: completion date, local photos and note.
- `/memories`: memory grid and category filters.
- `/us`: couple profile, anniversary, profile switching and reset.
- `/notifications`: recipient inbox, unread status and native push permissions.
- `/gift/[id]`: animated gift lid, flying ribbons/confetti and the linked memory.
- `/pair`: authenticated accounts create or join a shared couple space.

First launch shows a three-step onboarding. Without cloud environment variables, `/login` offers demo profiles Minh and Linh. The selected session, wishes, memories and notifications persist locally through AsyncStorage, including across logout and refresh. Switch profiles in Settings to review the recipient perspective. **Khôi phục dữ liệu mẫu** explicitly resets the demo data.

With Supabase configured, login uses email/password and `/pair` connects two authenticated accounts. Shared state is updated by an authenticated Edge Function; database policies and filtered RPCs protect recipient notifications and private preparations. Completion atomically creates a memory, notification and push outbox. See [Supabase/EAS setup and two-device verification](docs/PUSH_SETUP.md). Real push delivery requires deploying that backend and installing a configured native build.

Anniversary, optional wish date, and completion date use a shared calendar picker with month/year selection rather than text entry.

The sample day counter is frozen at 14/06/2025 for visual review. Completion defaults to today's date. Selected images remain local in demo mode; cloud mode uploads them to private Supabase Storage and reads them through signed URLs.

## Structure

`src/app/` contains routes. `src/components/` contains shared UI. `src/constants/` owns design tokens. `src/hooks/` owns the mock store. `src/services/` defines the repository contract, fixture data and domain actions. `src/types/` defines the data model.

Illustrations and sample photos are standalone images under `assets/artwork/`, rendered directly with `contain` (3D objects) or `cover` (photos). No screen crops or coordinate offsets are used at runtime. The original screenshot and earlier enhancement remain reference material only. High-resolution assets were reconstructed using ImageGen to match the source; small details can differ from the screenshot. Original exported assets can replace individual files without changing the UI. See [artwork notes](docs/ARTWORK.md).

See [phase tracking](docs/PHASES.md) for the original roadmap and [push setup](docs/PUSH_SETUP.md) for the implemented cloud notification flow.
