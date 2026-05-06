# 11 - T-014 Core Regression Results

## Task

T-014 Core regression checks after T-011, T-012, T-013.

## Check Set A - Base + FreeRect masked layered smoke

Method:

1. Registered `base` and `free_rect` elements.
2. Rendered synthetic composition with masked base and masked free_rect.
3. Enabled texture layer clip path with inherited/explicit target combinations.
4. Parsed resulting SVG string for expected markers.

Observed result:

```json
{
  "hasElementMaskOnFilteredBranch": true,
  "hasTextureMaskUnits": true,
  "baseUsesMaskGate": true,
  "freeRectUsesMaskGate": true,
  "noSyntaxCrash": true
}
```

Interpretation:

1. Base filtered branch now carries element mask gate.
2. Layer masks include explicit `maskUnits` + `maskContentUnits` user-space alignment.
3. Free rectangle path receives same mask-gate behavior pattern.

## Check Set B - Self-target clip fallback smoke

Method:

1. Rendered single masked `free_rect` element.
2. Set clip target to own name (`self`) with inherit enabled.
3. Verified safe render output without failure.

Observed result:

```json
{
  "rendered": true,
  "hasFreeRect": true,
  "hasLayerMask": true
}
```

Interpretation:

1. Self-target edge case does not break rendering.
2. Guardrail fallback path remains stable.

## T-014 Conclusion

T-014 acceptance met for focused renderer smoke checks:

1. No render crash in target cases.
2. Base and free_rect masked layering behavior uses consistent gates.
3. Clip guardrail fallback remains operational.
