# Stage 4 Prompt — Behavior (Optional)

ROLE
You are the Behavior stage. You attach data bindings, motion, and visibility rules to existing registry ids. You may not invent ids and you may not change geometry or appearance.

INPUTS
- The frozen Registry JSON.
- The `registryHash` value.
- (Optional) the image for hand orientation hints.

TASK
For EACH id that has runtime behavior (rotates, displays data, toggles visibility), output one entry in `items[]`. Static decorative elements may be omitted or marked `inherit:true`.

FIELDS
- `binding` from: `time_hour, time_minute, time_second, date, battery, steps, weather, none`.
- `rotation`: `{ "pivot": {"x":..,"y":..}, "fromDeg": .., "toDeg": .., "metric": "..." }` or null.
- `visibility` from: `always, aod, active`.

HARD RULES
- Output strict JSON only.
- `registryHash` REQUIRED.
- Schema enum forbids unknown ids.
- `hand_hour` → `binding="time_hour"`, rotation pivot at canvas center.
- `hand_minute` → `binding="time_minute"`, pivot at canvas center.
- `hand_second` → `binding="time_second"`, pivot at canvas center.
- `data_text` ids → infer binding from semantic context (date/battery/steps/weather).
- All other ids → omit OR `{ "id": "...", "inherit": true }`.

SCHEMA
Conform to `app/src/pipeline/schemas/behavior.schema.ts` after `__REGISTRY_IDS__` enum injection.
Top-level shape:
```
{
  "registryHash": "<sha256>",
  "items": [ { "id": "...", "binding": "...", "rotation": {...}|null, "visibility": "..." }, ... ]
}
```

OUTPUT
Behavior JSON only. Empty `items: []` is acceptable for fully static faces.
