# 10 - T-001 Recurrence Audit

## Goal
Prove current mask editing path behaves like compositing recurrence and explain collapse behavior.

## Code Evidence (Current)
1. Mask primitives for hide/reveal are emitted as color tones with stroke/shape opacity.
2. Hide uses black tone and reveal uses white tone in primitive generation.
3. Final mask is consumed via SVG mask application against rendered body.

This means overlap behavior is driven by compositing over an existing mask field, not direct scalar writes.

## Mathematical Mapping
Let A be current mask alpha-equivalent at a pixel.
Let o be brush opacity/falloff strength in [0,1].
Let t be brush target value (hide: 0, reveal: 1).

Compositing update can be modeled as:

A_next = (1 - o) * A_prev + o * t

Hide (t=0):

A_next = (1 - o) * A_prev

After n overlaps with same o:

A_n = (1 - o)^n * A_0

This is exponential decay.

## Failure Modes Proven
1. Exponential alpha collapse under repeated hide overlap.
2. Unstable overlap feel: tiny stroke density changes alter effective attenuation sharply.
3. Disappearing elements when repeated hide overlaps in same area.
4. Hard-to-control local edits because state evolution depends on compositing history.

## Why This Conflicts With Editing Semantics
Editing mask tools must operate as direct field modification:
1. Hide should subtract visibility by strength.
2. Reveal should add visibility by strength.
3. Overlap should be linear and predictable.

Compositing recurrence is valid for image blending, but not suitable as authoritative editable mask state.

## T-001 Exit Criteria Check
1. Equation-level behavior mapped: PASS.
2. Failure matrix explained: PASS.
3. Root cause tied to compositing model: PASS.

T-001 status: Done.
