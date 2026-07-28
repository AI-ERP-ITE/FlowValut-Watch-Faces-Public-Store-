# Spec 126 — System B Workshop Lineage Parity

## Requirement

System B must use the same Workshop project/build continuation lifecycle as
normal Studio FVWF builds. Opening a saved FVWC build from Admin and generating
again must create the next build inside that exact project.

Admin lifecycle state must be scoped by both project ID and build ID because
build IDs repeat independently inside each project.

## Restrictions

- Copy the existing Studio deep-link contract: `workshopProject` + `build`.
- Reuse the existing Workshop API endpoints and artifact access flow.
- Do not introduce title-based project matching.
- Do not change backend data structures or Workshop endpoint behavior.
- Do not alter normal Studio generation.

## Plan

1. Copy Workshop artifact retrieval into System B's copied API module.
2. Load FVWC from the Admin deep link and retain its project/build lineage.
3. Route editable Workshop projects from Admin to System B.
4. Scope Admin optimistic state changes by project ID plus build ID.
5. Test, build, deploy, and verify both private entrypoints.

## Validation

- Editable Admin links target `/editable-watchfaces/`.
- A deep-linked FVWC restores the supplied project and build IDs.
- The next export sends the same project ID and the opened build as parent.
- Trash, restore, approve, and permanent-delete UI updates affect only the
  selected project/build pair.
