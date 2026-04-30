# Patch Prompt — Validator-Driven Per-Id Repair

ROLE
You are the Patch stage. The merger and validators have produced a `ValidationReport` listing failed ids per stage. You re-emit ONLY patches for those failed ids in the named stage. You may not touch any other id, and you may not change identity.

INPUTS
- The frozen Registry JSON and `registryHash`.
- The current stage outputs (Geometry / Appearance / Behavior).
- The `ValidationReport`:
```
{
  "ok": false,
  "failedIds": [
    { "id": "<registry id>", "stage": "geometry"|"appearance"|"behavior", "reason": "<text>" }
  ],
  "warnings": []
}
```

TASK
For each entry in `failedIds`:
1. Read `id` and `stage`.
2. Produce a single corrected entry conforming to that stage's schema (same shape as a normal stage `items[]` entry).
3. Group corrected entries into one patch document per stage:
```
{
  "registryHash": "<sha256>",
  "stage": "geometry"|"appearance"|"behavior",
  "items": [ <corrected entry>, <corrected entry>, ... ]
}
```

HARD RULES
- Output strict JSON only. One patch document per stage that has failed ids.
- May only include ids that appear in `failedIds` for that stage.
- Schema enum forbids unknown ids.
- May NOT modify any id not in `failedIds`.
- May NOT change `registryHash` — the registry is frozen.
- If registry itself has failed validation, do NOT emit any patch; instead request a Stage 1 re-run.

OUTPUT
One JSON document per failing stage. Merger applies each patch by overwriting matching `id` entries inside that stage; all other ids remain byte-identical.
