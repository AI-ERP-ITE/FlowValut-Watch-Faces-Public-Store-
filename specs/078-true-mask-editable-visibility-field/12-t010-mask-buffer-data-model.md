# 12 - T-010 Mask Buffer Data Model

## Objective
Define authoritative storage schema for editable scalar mask field.

## Proposed Schema (Element-level)
mask: {
  enabled: boolean,
  coordinateSpace: "local",
  invert?: boolean,
  strokes?: [...],
  field?: {
    version: "v1",
    width: number,
    height: number,
    valuesEncoding: "u8",
    values: number[],
    imageDataUrl?: string,
    updatedAt: number,
    source: "editable-buffer"
  }
}

## Field Semantics
1. values length = width * height
2. each value is integer u8 in [0,255]
3. scalar mask value M = value / 255
4. 0 means hidden, 255 means visible

## Authoritative State Rule
1. field.values is authoritative editable state.
2. imageDataUrl is derived cache for renderer convenience.
3. strokes are optional audit/history input, not authoritative output state.

## Migration Path
1. If field exists and valid: use directly.
2. If field missing and strokes exist: initialize field from neutral visibility and replay strokes through direct update kernel.
3. If both missing: initialize neutral field (all visible unless invert handling requires otherwise).

## Compatibility
1. Keep existing mask object shape to avoid unrelated system breaks.
2. Introduce field as additive non-breaking extension.
3. Legacy renderer path can be retained as fallback for malformed field.

## Determinism Requirements
1. Replaying identical stroke list on same initial field must recreate same field values.
2. Serialization/deserialization must preserve values exactly.

## Exit Criteria Check
1. Data schema explicit: PASS.
2. Migration plan documented: PASS.
3. Compatibility strategy documented: PASS.
