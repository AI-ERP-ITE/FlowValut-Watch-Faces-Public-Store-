# Implementation Plan — Spec 116

## Domain

Zepp pointer system + private Studio Lab. This is a shared core change: editor, local persistence, Firebase Storage/Firestore sync, preview, and ZPK export share the same hand record.

## Minimal File Plan

1. `src/lib/customHandStore.ts`: add source-kind fields and a direct-PNG save function that preserves master PNGs and generates normalized outputs.
2. `src/lib/firestoreLabSync.ts`: extend the existing Firebase Auth-backed, owner-scoped Firestore/Storage hand sync; store/read optional `sourceKind`, treat missing/empty cloud values as HTML, upload/download `source_png/`, hash all masters + geometry, and delete new sources. `src/lib/labCloudSync.ts` must exclude hands from both push and pull through the admin Cloud Function/GitHub manifest bridge.
3. `src/components/IconLab.tsx`: add PNG source mode, four uploads, validation, save/load/update routing, and filtered saved-style grids.
4. `src/components/PropertyPanel.tsx`: retain one library and surface a compact source-kind badge.
5. `src/components/InteractiveCanvas.tsx` and `src/StudioApp.tsx`: extend source-backed preview/export only if direct PNG masters need a distinct source path; otherwise keep baked output resolution.
6. `scripts/verify.mjs`: add source-kind, Firebase-path, and legacy fallback checks.

## Execution Order

1. Establish types and local PNG persistence/bake contract.
2. Wire Firebase sync and deletion, retaining legacy support.
3. Add PNG UI, save, load, and editing flow.
4. Connect unified selection and preview/export compatibility.
5. Add regression checks; run typecheck, verification, private build, and smoke test.
6. Deploy private Studio with `npm run deploy:full:private` only after unrelated dirty files are resolved.

## Deployment Guard

The repository currently has pre-existing modifications in `index.html`, `studio/index.html`, and `studio/parametric/index.html`. They must not be unintentionally committed by the atomic deployment script. Before deployment, inspect and either preserve/commit them separately or obtain explicit instruction to include them.

## Closure Status

**Complete — 2026-07-15.** The execution plan was completed in order. The deployment guard was cleared through explicit user authorization, and the working-tree-safe private deployment preserved the unrelated entry-file modifications.
