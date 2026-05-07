# 11 - T-002 Scalar-Field Contract and Invariants

## Contract
Mask state is an editable scalar field M over discrete pixels.

Domain:
1. M[p] in [0,1]
2. p indexes mask-frame pixels

Semantics:
1. M[p] = 0 means fully hidden
2. M[p] = 1 means fully visible

Editing operations are direct field writes, not compositing.

## Update Rules
Given strength S in [0,1]:

Hide:
M_next[p] = max(0, M_prev[p] - S[p])

Reveal:
M_next[p] = min(1, M_prev[p] + S[p])

Brush strength:
S[p] = brushOpacity * brushFalloff[p] * pressure

## Render Contract
Final alpha contribution uses mask exactly once:

A_final[p] = A_source[p] * M[p]

No iterative blend/lerp recurrence is permitted in mask edit state.

## Invariants
1. Boundedness: 0 <= M[p] <= 1 always.
2. Idempotent bounds: applying hide at M=0 keeps 0; applying reveal at M=1 keeps 1.
3. Monotonic hide step: hide never increases M[p].
4. Monotonic reveal step: reveal never decreases M[p].
5. Linear overlap progression for constant strength in a fixed area:
   M_n = clamp(M_0 +/- n*S)
6. Determinism: same initial field and same stroke sequence produce same final field.
7. Export parity: serialized mask field must render equivalently in preview and output.

## Compatibility Rules
1. Legacy stroke payload remains accepted as edit events.
2. Authoritative editable state is mask field buffer, not composited primitive output.
3. Legacy paths may be migrated, but must not violate invariants above.

## Acceptance Mapping
T-002 done criteria:
1. Contract is explicit and equation-backed.
2. Invariants are testable and implementation-ready.
