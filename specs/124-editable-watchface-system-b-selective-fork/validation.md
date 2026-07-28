# System B Validation

## Protection gate

- Capture SHA-256 for every copied source and key protected file.
- Confirm no existing System A source/config file changes.
- Preserve unrelated modified HTML files.
- Re-run hash verification after every phase.

## Copy gate

For every copy:

- Original path is documented.
- Destination is inside System B.
- Initial source/copy hashes match.
- Required adaptation is documented separately.
- Adaptation happens only after exact-copy verification.

## Isolation gate

- System B has its own entry, package, and build.
- No import resolves to prohibited System A business logic.
- Remaining shared imports are third-party or explicitly approved neutral dependencies.
- Direct load and refresh work at `/editable-watchfaces/`.

## Normal V2 parity gate

Given the same FVWF:

- Parsed config is semantically equal.
- Canonical watch-model result is equal.
- Resolution and target are equal.
- Element/AOD content, bounds, visibility, and order are equal.
- Canvas image difference is within the approved threshold.
- V2 manifest and widget semantics are equal.
- Extracted ZPK file sets and assets are equal.

ZIP bytes need not match when timestamps or compression metadata differ.

## FVWC gate

- Source builds remain immutable.
- Assets survive save/reopen.
- Duplicate imports are detected.
- Base, group, slot, variant, and default invariants hold.
- Missing source references block export.
- Object URLs are never authoritative serialized content.

## Editable V2 gate

- Selected device capability is documented.
- `configVersion` remains V2.
- Manifest enables editable mode only for editable output.
- IDs and custom types do not collide.
- Each optional type has required preview/title data.
- Each variant creates a complete widget branch.
- A selected canonical `background.png` is hydrated from that variant's embedded FVWF background and rewritten to a unique `editable/<variant>/...` asset path.
- Two full-theme variants cannot resolve to the same packaged background asset.
- Required masks and assets exist.
- ZPK archive structure is valid.
- The physical watch exposes selection and renders every variant correctly.

## Private deployment gate

- Build the standalone System B bundle with base `/Watch-Faces/editable-watchfaces/`.
- Publish the bundle at the repository-root `editable-watchfaces/` path served by private GitHub Pages.
- Verify the live HTML and every referenced hashed JS/CSS asset return HTTP 200.
- Keep System A source files unchanged.

