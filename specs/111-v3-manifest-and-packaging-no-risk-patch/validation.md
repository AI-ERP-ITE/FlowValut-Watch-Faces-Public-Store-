# specs/111-v3-manifest-and-packaging-no-risk-patch/validation.md

## Baseline Evidence

### Generated Firebase V3 package
- `configVersion: v3`
- nested `targets.default.module.watchface`
- `path: watchface/index.js`
- runtime block uses `compatible/target/minVersion` at `1.0.x`

### Provided/reference V3 shape
- root `module.watchface`
- `path: watchface/index`
- runtime example includes `type: js` and `apiVersion.minVersion/target = 3.0.0`

## V3 Mismatch Table

| Field / Shape | Generated V3 | Reference V3 | Risk | First-pass action |
|---|---|---|---|---|
| `module.watchface` placement | `targets.default.module.watchface` | root `module.watchface` | High | patch V3-only |
| watchface `path` | `watchface/index.js` | `watchface/index` | High | patch V3-only |
| runtime shape | `compatible,target,minVersion` | `type`, `minVersion`, `target` | Medium/High | verify before patching |
| `platforms` inside target | yes | omitted in snippet | Medium | keep unless contradicted |
| `packageInfo` | yes | omitted in snippet | Low | keep unless contradicted |

## First-pass Implementation Proposal

### Safe to patch first
- `app/src/lib/jsCodeGenerator.ts`
  - V3 `generateAppJson()` only

### Do not patch in first pass
- `app/src/lib/jsCodeGeneratorV2.ts`
- shared `app/src/lib/zpkBuilder.ts`

## Shared Builder Split Decision Gate
Only split builder if both are true:
1. manifest-only V3 patch does not resolve install failure
2. new evidence points to archive/layout rules that would require changing shared pack behavior

## Post-patch Validation Steps
1. Build one V3 package locally.
2. Extract outer archive.
3. Verify outer `app.json` matches intended V3 shape.
4. Extract `device.zip/app.json` and confirm path/module placement.
5. Confirm actual watchface file location matches manifest path convention.
6. Compare extracted V3 package against pre-patch V3 package.

## V2 Protection Checks
1. Confirm `app/src/lib/jsCodeGeneratorV2.ts` unchanged.
2. Confirm no shared builder edits in manifest-only phase.
3. If builder split later occurs, verify V2 dispatcher still routes to existing implementation.