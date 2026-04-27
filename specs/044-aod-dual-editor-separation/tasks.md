# Tasks: Dual MAIN/AOD Editor Separation

## Planned + Executed Tasks

- [x] T001 Add AOD data shape in shared config model.
- [x] T002 Add source.json persistence for AOD element set.
- [x] T003 Add editor mode state (`MAIN` / `AOD`) in studio flow.
- [x] T004 Bind active canvas/inspector/element-list to selected mode.
- [x] T005 Add explicit one-time AOD creation/resync action from main.
- [x] T006 Implement mode-scoped edit handlers (add/update/delete/visibility).
- [x] T007 Build export config carrying both `elements` and `aodElements`.
- [x] T008 Update V2 JS generator to consume dedicated AOD elements when present.
- [x] T009 Ensure ZPK source-fix pipeline restores asset references for AOD elements too.
- [x] T010 Run static validation (Problems/TypeScript) on touched files.

## Verification Evidence (one-by-one)

- [x] V001 T001 verified in app/src/types/index.ts (WatchFaceConfig includes `aodElements`).
- [x] V002 T002 verified in app/src/lib/sourceJsonGenerator.ts (SourceJson + buildSourceJson include `aodElements`).
- [x] V003 T003 verified in app/src/StudioApp.tsx (`EditorMode`, `editorMode` state).
- [x] V004 T004 verified in app/src/StudioApp.tsx (`activeElements`, canvas/panel/list bindings).
- [x] V005 T005 verified in app/src/StudioApp.tsx (`createAodFromMain` + UI action wiring).
- [x] V006 T006 verified in app/src/StudioApp.tsx (active mode handlers for update/delete/add/toggle).
- [x] V007 T007 verified in app/src/StudioApp.tsx (generation path builds config with `aodElements`).
- [x] V008 T008 verified in app/src/lib/jsCodeGeneratorV2.ts (AOD generation sourced from `config.aodElements` with fallback).
- [x] V009 T009 verified in app/src/lib/zpkBuilder.ts (source restoration runs on `fixedAodElements`).
- [x] V010 T010 verified by Problems scan: no errors in touched files.

## Deferred by Request

- [x] D001 Run full build command(s).
- [x] D002 Deploy docs artifacts locally (dist -> docs + studio parity).
- [x] D003 Verify hosted output after git push.

## Build Verification Log

- [x] `npm run build:public` succeeded.
- [x] `npm run build:private` succeeded.
- [x] Build blocker fixed: restored Vite source entry in app/index.html from stale hashed bundle reference to `/src/main.tsx`.

## Deployment Verification Log

- [x] Copied `dist/assets/*` to `docs/assets/`.
- [x] Copied `dist/index.html` to both `docs/index.html` and `docs/studio/index.html`.
- [x] Removed stale hashed files from `docs/assets/` not present in `dist/assets/`.
- [x] Verified JS hash parity (`index-DcABAnxS.js`) between website/studio entrypoints.
- [x] Verified CSS hash parity (`index-zZ9NZAdF.css`) between website/studio entrypoints.
- [x] Hosted homepage serves `assets/index-DcABAnxS.js` and `assets/index-zZ9NZAdF.css`.
- [x] Hosted studio route resolves via SPA redirect and serves same hashes (`?p=/studio`).
