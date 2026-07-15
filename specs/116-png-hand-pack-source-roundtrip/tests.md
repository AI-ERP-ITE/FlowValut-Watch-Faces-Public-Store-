# Regression Matrix — Spec 116

| Case | Expected result |
|---|---|
| Existing HTML hand record without `sourceKind` | Opens in HTML composer and remains editable. |
| Existing baked-only record | Selectable in Property Panel; shown as legacy and not source-editable. |
| New PNG pack | Four masters saved locally, normalized outputs generated, and style selectable. |
| PNG pack cloud round trip | Four masters return as PNG data URLs and edit view restores pivot settings. |
| Replace only minute master | Same key updates, source hash changes, minute bake refreshes. |
| HTML saved after feature | Has `sourceKind: 'html'`; old Storage filenames still work. |
| Delete PNG pack | Firestore document, baked assets, and all `source_png/` objects removed safely. |
| ZPK export | TIME_POINTER assets and pivots remain valid for PNG and HTML styles. |

## Closure Result

**PASSED.** The Spec 116 source-contract assertions are included in the repository verifier. Final automated validation passed 38/38 checks with zero failures, alongside a clean TypeScript gate and private production build.
