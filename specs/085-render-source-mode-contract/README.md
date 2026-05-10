# Spec 085 — Render Source Mode Contract

## Why
Shadow / depth / glow / mask effects keep desyncing from the visually-seen
silhouette of an element when the element is partially baked, partially
masked, or in a transitional state. Root cause: there is no explicit,
canonical answer to "what is the current visible source of this element?".
The renderer, the snapshot system, and the mask system each guess
independently.

## Mandate
Establish ONE explicit per-element contract:

1. `renderSourceMode` enum — `procedural | baked-live-mask | baked-baked-mask`.
2. `maskEmbeddedInSnapshot` boolean — whether the live mask was burned into
   the snapshot pixels at capture time.
3. A single `sourceResolver` — the only source of truth that downstream code
   (renderer, effects, masks, exports) consults to know what the current
   visible surface and silhouette are.

Effects MUST always read from the resolver. They MUST NEVER consult prior
geometry or historical procedural data once the element has been baked.

## Phases
- **Phase 1 — Contract** (`04-tasks.md` T01-T07). DONE & deployed at
  commit `db50459` / bundle `index-B-7dOJyl.js`. No renderer changes.
- **Phase 2 — Renderer routing** (`04-tasks.md` T10-T14). NOT STARTED.
  Wire `sourceResolver` into `renderer.js` so shadow/depth/glow always
  read from the current visible silhouette per the spec.

## Files in this spec
- `01-plan.md` — decisions taken, scope, non-goals.
- `02-spec.md` — formal contract definition.
- `03-architecture.md` — file map, data flow, mode transitions.
- `04-tasks.md` — task list with phase boundaries.
- `05-validation.md` — test matrix and acceptance criteria.
- `09-progress-log.md` — chronological log.
