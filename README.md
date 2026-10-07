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

The default mock profile is Minh, so Linh's wishes can be prepared. Switch profiles in **Của chúng ta → Cài đặt** to review the owner perspective. A wish creator never sees their partner's preparation status in the UI. This is mock isolation, not backend security; enforce it with RLS in Phase 7.

Mock changes last for the current app session. Refresh resets the fixtures. The sample date is frozen at 14/06/2025 so the reference's 486-day counter can be reviewed. Selected images are local preview URIs, never uploads.

## Structure

`src/app/` contains routes. `src/components/` contains shared UI. `src/constants/` owns design tokens. `src/hooks/` owns the mock store. `src/services/` defines the repository contract, fixture data and domain actions. `src/types/` defines the data model.

Original illustration/photo regions are displayed using clipped viewports from `assets/reference-design.png`. UI controls and text are real components. The screenshot limits illustration resolution; full-resolution exports can later replace these regions without changing layouts.

Review and approve the UI before Phase 4 (Supabase). See [phase tracking](docs/PHASES.md).
