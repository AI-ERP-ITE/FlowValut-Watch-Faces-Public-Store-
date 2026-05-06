# 15 - T-070 Production Build Verification

## Task

T-070 Production build verification.

## Goal

Confirm build pipeline succeeds and emits fresh hashed bundle artifacts.

## Build Attempt Timeline

### Attempt 1 (failed)

Command:

`npm run build`

Failure:

1. TS7016: declaration missing for `../index.js` in `engine/snapshot/snapshotRenderer.ts`.

Action:

1. Added declaration file `app/engine/index.d.ts` exposing typed `runEngine` signature.

### Attempt 2 (failed)

Command:

`npm run build`

Failure:

1. Vite failed to resolve stale deployed hash entry from `app/index.html`:
   - `/Watch-Faces/assets/index-CDJ9EufH.js`

Action:

1. Restored source build entry in `app/index.html`:
   - replaced stale hashed script/css tags with `<script type="module" src="/src/main.tsx"></script>`.

### Attempt 3 (success)

Command:

`npm run build`

Result:

1. Build succeeded.
2. Vite emitted fresh dist artifacts with new hash names.
3. Non-blocking warnings observed:
   - font URL runtime resolution warnings for `/Watch-Faces/fonts/*`
   - chunk size warnings (>500 kB)
   - dynamic/static mixed import chunking notices

## Artifact Proof

### Pre-build dist/assets snapshot

1. `index-BztddQwl.css`
2. `index-CDJ9EufH.js`
3. `index-wK-ky7kI.js`
4. `tablerIconRenderer-p-TepXnr.js`

### Post-build dist/assets snapshot

1. `index-CrlChUe_.css`
2. `index-uKNApi86.js`
3. `index-Bft5S59Y.js`
4. `tablerIconRenderer-DWXkuZ5s.js`

Observation:

1. Hash names changed versus pre-build snapshot.
2. New build timestamp present on all emitted bundles.

## T-070 Conclusion

T-070 acceptance met.

1. Build pipeline now succeeds.
2. Fresh hashed bundle artifacts generated.
3. Build blockers were resolved and documented.
