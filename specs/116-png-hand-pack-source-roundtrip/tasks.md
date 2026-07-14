# Task Tracker — Spec 116

## Rules

- Preserve existing HTML source workflow and legacy records.
- Keep hand sync on the existing signed-in-user Firebase Auth → owner-scoped Firestore/Storage path; never send or pull hands through the admin Cloud Function/GitHub manifest bridge.
- Keep `sourceKind` optional: only explicit `png` selects PNG masters; missing/empty cloud values default to HTML, while local baked-only records remain legacy/selectable.
- Do not edit the existing dirty deployment-entry files.
- Validate after every task.

## Tasks

- [x] T1 — Add source-kind types and local PNG hand-pack persistence/bake support. (`npx.cmd tsc --noEmit` passed.)
- [x] T2 — Extend the existing authenticated Firebase hand sync with optional HTML/PNG identification, `source_png/` masters, complete hashing/download/deletion, and disable the obsolete GitHub-bridge hand pull. (`npx.cmd tsc --noEmit` passed.)
- [x] T3 — Add PNG Hand Pack authoring/editing UI; filter editor grids by inferred source kind and route missing identifiers to HTML unless the record is baked-only legacy. (`npx.cmd tsc --noEmit` passed.)
- [x] T4 — Connect one unified hand selection library and preview/export compatibility without changing Firebase Auth, rules, or Zepp runtime assets. (`npx.cmd tsc --noEmit` passed.)
- [x] T5 — Add regression checks for optional/empty identification, Firebase PNG round-trip, GitHub-bridge hand exclusion, and legacy fallback; validate locally. (`npx.cmd tsc --noEmit`, 38/38 verifier checks, and private production build passed.)
- [x] T6 — Private deployment and live verification using the working-tree-safe atomic deploy path; unrelated dirty entry files were preserved. (Bundle `index-DhtWbROL.js`, deploy commit `5d3596c3`.)
