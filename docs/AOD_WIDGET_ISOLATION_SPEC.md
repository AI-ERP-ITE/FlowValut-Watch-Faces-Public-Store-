# AOD Widget Isolation Spec

## Goal
Make MAIN and AOD export paths fully independent after "Create AOD from Main".

## Pipeline Rules
1. AOD starts as a copy of MAIN once, then is an independent layout.
2. Export must treat MAIN and AOD widgets as separate instances.
3. No generated asset filename may collide across MAIN and AOD when styles differ.
4. Export logic must never process only the first widget of a type when multiple instances exist across MAIN/AOD.

## Defects Found
1. Name precedence bug: full project load ignores optional Watch Face Name override.
2. TIME_POINTER export uses first-match logic and shared hand filenames.
3. Digit/label assets are shared for some widget types and can overwrite between MAIN and AOD.
4. IMG_LEVEL resolved frame map key uses id only, which collides when AOD copied from MAIN keeps same ids.

## Required Fixes

### 1) Watchface Name Precedence
- On both full load and widgets-only load:
  - If Watch Face Name input is non-empty, use it.
  - Else inherit loaded config name/file name.

### 2) Scoped Asset Naming
- Generated assets must include a scope suffix:
  - scope = main|aod
  - include element id where relevant
- Applies to:
  - TIME_POINTER hand/cover files
  - IMG_TIME digit arrays
  - IMG_DATE day arrays
  - IMG_DATE month arrays
  - IMG_WEEK arrays
  - TEXT_IMG digit arrays

### 3) Per-Scope Widget Processing
- For each type, process MAIN and AOD independently.
- Never use find(...) where multiple pointers can exist across scopes.

### 4) Generator Compatibility
- V2/V3 generators should prefer explicit arrays from element fields:
  - IMG_TIME: hour/minute/second arrays from element fontArray/images if provided.
  - IMG_DATE day: day arrays from element fontArray/images if provided.
  - IMG_DATE month: month arrays from element.images if provided.
  - IMG_WEEK: arrays from element.images if provided.
- Keep old defaults as fallback for backward compatibility.

### 5) Validation
- Before build, assert that each TIME_POINTER references existing hand assets.
- Keep existing build error behavior, but validate per-pointer instance.

## Task Checklist
- [x] Audit MAIN/AOD widget export architecture
- [x] Write isolation spec
- [ ] Fix name precedence in full-load path
- [ ] Introduce scope-aware digit asset regeneration
- [ ] Fix scope-aware IMG_LEVEL resolved frame keys
- [ ] Refactor TIME_POINTER export for all instances + scoped filenames
- [ ] Update V2/V3 generators to consume explicit scoped arrays
- [ ] Validate TypeScript build
