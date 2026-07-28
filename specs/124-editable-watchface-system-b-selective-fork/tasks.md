# System B Tasks

## Current-state discovery

- [x] Confirm active generator is V2-only.
- [x] Confirm the separate V2 generator file is absent.
- [x] Inspect current FVWF parser and serializer.
- [x] Inspect current model-target resolution.
- [x] Inspect current canvas/editor/export boundaries.
- [x] Identify unrelated dirty workspace changes.
- [x] Replace the empty Spec 124 document set.
- [ ] Approve the current copy boundary.

## Standalone System B

- [ ] Create `app/system-b-editable/`.
- [ ] Add System B package and lock strategy.
- [ ] Add TypeScript and Vite configuration.
- [ ] Add standalone HTML/React entry.
- [ ] Configure port 5184 and `/editable-watchfaces/`.
- [ ] Add route-refresh/base-path tests.

## Exact copies

- [ ] Copy current watchface types.
- [ ] Copy FVWF artifact/config logic and tests.
- [ ] Copy `watchModelTarget.ts` and tests.
- [ ] Copy editor state required for parity.
- [ ] Copy `InteractiveCanvas.tsx` and rendering dependencies.
- [ ] Copy `ElementList.tsx`.
- [ ] Copy `PropertyPanel.tsx`.
- [ ] Copy background crop/photo tools.
- [ ] Copy current V2 `jsCodeGenerator.ts`.
- [ ] Copy generator dependencies and tests.
- [ ] Copy `zpkBuilder.ts`.
- [ ] Copy `qrGenerator.ts`.
- [ ] Copy relevant asset-preparation logic currently embedded in `StudioApp.tsx`.
- [ ] Rebind all copied imports.
- [ ] Audit prohibited imports.

## Normal V2 parity

- [ ] Select an FVWF fixture.
- [ ] Compare model canonicalization.
- [ ] Compare parsed project state.
- [ ] Compare canvas snapshots.
- [ ] Compare generated V2 code.
- [ ] Compare extracted ZPK structures/assets.
- [ ] Compare QR payload.
- [ ] Verify System A hashes.
- [ ] Obtain approval for editable development.

## FVWC composer

- [ ] Implement source snapshots and hashing.
- [ ] Implement multiple-build registration.
- [ ] Implement base selection.
- [ ] Implement comparison canvas modes.
- [ ] Implement groups and dependency suggestions.
- [ ] Implement ownership rules.
- [ ] Implement slots and defaults.
- [ ] Implement the three authoring modes.
- [ ] Implement FVWC save/reopen and schema validation.
- [ ] Implement composer validation UI.

## Editable V2 export

- [x] Select and document the first device.
- [x] Verify editable group capabilities.
- [x] Implement deterministic ID allocation.
- [x] Compile one complete editable slot.
- [x] Generate V2 editable runtime code.
- [x] Emit `editable: 1`.
- [x] Generate masks/previews/assets.
- [x] Package editable ZPK.
- [x] Generate hosted-install QR and validation report.
- [x] Namespace a selected canonical FVWF background per variant instead of retaining the shared `background.png`.
- [x] Add a regression test proving two theme variants retain distinct background assets and runtime paths.
- [x] Build and publish the standalone private route at `/Watch-Faces/editable-watchfaces/`.
- [x] Resolve VARIANT canvas elements, background, transform, resolution, and shape from the same default-variant source.
- [x] Add a regression test proving a default-variant change switches both its group layers and embedded background.
- [x] Generate complete per-variant previews from the background and selected component group.
- [x] Follow the selected theme into AOD only when every source has a dedicated AOD layout.
- [x] Fall back to fixed base AOD when any variant lacks a dedicated AOD layout.
- [x] Save FVWC, ZPK, main preview, AOD preview, and hosted-install QR through Workshop.
- [x] Display the finalized QR and link to the existing private Admin page.
- [x] Preserve local ZPK download when auth or backend publication is unavailable.
- [ ] Test on the physical watch.

