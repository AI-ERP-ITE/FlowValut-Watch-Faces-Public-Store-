# T034 — Runtime references, geometry, and route isolation

**Result:** PASS  
**Scope:** Static package-code validation only; no production implementation.

All 8/8 packages passed validation of `watchface/index.js`, `app.json`, asset
existence, and route isolation.

For P2–P8:

- the intended `IMG`, `IMG_LEVEL`, `IMG_WEEK`, `IMG_DATE`, `TEXT_IMG`, or
  `TIME_POINTER` widget type is present;
- every diagnostic asset is referenced and exists;
- no diagnostic asset from another route is referenced;
- coordinates, sizes, data bindings, arrays, and pointer pivots match the T030
  package definition;
- diagnostic widgets are normal-mode only and placed offscreen;
- the original watchface code outside the marked diagnostic block is unchanged;
- `app.json` is valid JSON and byte-identical to the watch-tested template.

For P11:

- `watchface/index.js` and `app.json` are unchanged from the template;
- all 19 transformed label resources exist and are referenced;
- the package hash matches the independently validated T029 control.

This rules out accidental duplicate diagnostic widgets, wrong-route resources,
or local runtime-reference mistakes in the test matrix. It does not simulate
Zepp firmware execution.

## Evidence

- `evidence/packages/T034-runtime-reference-validation.json`
- `evidence/tooling/validate-package-runtime-references.mjs`
