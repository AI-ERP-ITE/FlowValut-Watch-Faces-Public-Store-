# System B Restrictions

## Read-only System A

Implementation may inspect but never modify:

- `app/src/**`
- Existing app routes and entries.
- Existing app scripts and configurations.
- Existing FVWF behavior.
- Existing V2 generator and normal manifest.
- Existing ZPK/QR behavior.
- Existing public, private, Admin, Firebase, storefront, Workshop, AI, and Lab workflows.

## Allowed implementation location

Before deployment approval, implementation writes are limited to:

```text
app/system-b-editable/**
app/specs/124-editable-watchface-system-b-selective-fork/**
```

Any required write elsewhere stops execution for approval.

## Current-state rule

- Current repository behavior is authoritative.
- Do not restore deleted files or earlier architectures.
- Do not clean or reconcile unrelated workspace changes.
- Do not look for or recreate V3 generation.
- System B is V2-only.

## Copy-before-change rule

1. Approve the source in the copy manifest.
2. Copy the current file exactly.
3. Record its original hash.
4. Verify the copy.
5. Rebind only System B imports.
6. Establish parity.
7. Change only the System B copy.

## Prohibited System B dependencies

System B must not retain live imports from:

- `StudioApp.tsx`
- `AppContext.tsx`
- Current System A canvas, property, or layer components.
- Current FVWF modules after their copies exist.
- Current generator or ZPK builder after their copies exist.
- Admin and publishing.
- Workshop management.
- Firebase mutation APIs.
- Storefront.
- AI pipeline.
- Labs and Lab synchronization.

## Zepp restrictions

- Emit only V2.
- Do not invent undocumented editable structures.
- Keep `editable: 0` in the copied normal baseline.
- Emit `editable: 1` only from the new editable generator.
- Unknown device capability blocks export.
- All IDs and asset paths must be deterministic and collision-free.
- Advanced editable features remain blocked until physical verification.

## Repository safety

- No commits, tags, branches, pushes, or deployments without their approval.
- Never stage unrelated dirty files.
- Record and recheck hashes of protected System A files.

