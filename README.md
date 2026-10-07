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

First launch shows a three-step onboarding, then `/login` offers the demo profiles Minh and Linh. The onboarding flag and selected demo session persist locally through AsyncStorage. No passwords or real authentication are used until Supabase is connected. Sign out in **Của chúng ta → Cài đặt → Đăng xuất**; protected routes return to login and session mock data resets. Sign-in does not repeat onboarding. Switch profiles in Settings to review the owner perspective. A wish creator never sees their partner's preparation status in the UI. This is mock isolation, not backend security; enforce it with RLS in Phase 7.

Anniversary, optional wish date, and completion date use a shared calendar picker with month/year selection rather than text entry.

Mock changes last for the current app session. Refresh resets the fixtures. The sample date is frozen at 14/06/2025 so the reference's 486-day counter can be reviewed. Selected images are local preview URIs, never uploads.

## Structure

`src/app/` contains routes. `src/components/` contains shared UI. `src/constants/` owns design tokens. `src/hooks/` owns the mock store. `src/services/` defines the repository contract, fixture data and domain actions. `src/types/` defines the data model.

Illustrations and sample photos are standalone images under `assets/artwork/`, rendered directly with `contain` (3D objects) or `cover` (photos). No screen crops or coordinate offsets are used at runtime. The original screenshot and earlier enhancement remain reference material only. High-resolution assets were reconstructed using ImageGen to match the source; small details can differ from the screenshot. Original exported assets can replace individual files without changing the UI. See [artwork notes](docs/ARTWORK.md).

Review and approve the UI before Phase 4 (Supabase). See [phase tracking](docs/PHASES.md).
