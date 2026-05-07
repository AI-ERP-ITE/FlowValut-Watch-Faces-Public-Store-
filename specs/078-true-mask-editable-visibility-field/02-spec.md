# 02 - Specification

## Problem Statement
Current mask painting behaves like repeated compositing/blending instead of direct mask editing. This causes exponential alpha collapse, unstable overlap behavior, disappearing elements, and uncontrollable repeated hide strokes.

## Root Cause Model (Current - Wrong)
Current effective update behaves like:

newMask = lerp(previousMask, targetMask, opacity)

Per-overlap recurrence:

A_next = (1 - o) * A_prev + o * target

When hide target is 0:

A_next = (1 - o) * A_prev

This is exponential convergence to 0 under overlap and is unsuitable for editing workflows.

## Required Model (New)
Masks must be editable scalar fields.
Each pixel stores maskValue in [0,1].

Semantics:
1. 0 = fully hidden
2. 1 = fully visible

Brushes modify maskValue directly, not by compositing.

## Required Equations
### Hide
maskValue_next = clamp(maskValue_prev - brushStrength, 0, 1)

### Reveal
maskValue_next = clamp(maskValue_prev + brushStrength, 0, 1)

### Brush Strength
strength = brushOpacity * brushFalloff * pressure

Where pressure is optional and defaults to 1 when unavailable.

## Final Render Equation
finalAlpha = sourceAlpha * maskValue

Apply once only in render pipeline.
No repeated blend/lerp accumulation in mask editing path.

## Behavioral Requirements
1. Repeated hide overlap is linear and predictable.
2. Repeated reveal overlap is linear and predictable.
3. Hide then reveal is stable and reversible.
4. Full-strength hide yields exact maskValue=0.
5. Full-strength reveal yields exact maskValue=1.

## Explicit Non-Goals
1. No fake alpha floor.
2. No gray hide tone.
3. No mask weakening workaround.
4. No compositing-based accumulation as mask edit state.
