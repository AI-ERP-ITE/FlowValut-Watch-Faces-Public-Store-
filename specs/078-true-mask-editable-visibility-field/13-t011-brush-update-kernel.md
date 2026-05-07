# 13 - T-011 Brush Update Kernel

## Objective
Define deterministic direct-edit kernel for hide/reveal updates.

## Strength Function
For each affected pixel p:

S[p] = brushOpacity * falloff[p] * pressure

Where:
1. brushOpacity in [0,1]
2. falloff[p] in [0,1]
3. pressure in [0,1], defaults to 1

Clamp S[p] into [0,1].

## Update Equations
Given M_prev[p] in [0,1]:

Hide:
M_next[p] = max(0, M_prev[p] - S[p])

Reveal:
M_next[p] = min(1, M_prev[p] + S[p])

## U8 Storage Form
Let V be u8 value in [0,255].

Hide:
V_next = max(0, V_prev - round(255 * S[p]))

Reveal:
V_next = min(255, V_prev + round(255 * S[p]))

## Stroke Raster Rules
1. Selection shapes produce binary coverage mask with per-pixel strength from opacity.
2. Freehand brush uses radial falloff around polyline samples.
3. Overlap accumulation is additive/subtractive in field space only.

## Determinism Rules
1. Stable traversal order per stroke.
2. Pure function update: next depends only on prev and stroke params.
3. No blend/composite feedback loop.

## Expected Overlap Behavior
With constant hide strength S on same pixel:

M_n = max(0, M_0 - n*S)

With constant reveal strength S:

M_n = min(1, M_0 + n*S)

## Exit Criteria Check
1. Kernel equations finalized: PASS.
2. U8 implementation mapping finalized: PASS.
3. Determinism constraints finalized: PASS.
