# Visual Envelope Compiler Guide

This is the operator runbook. Full schema lives only in
`AI_ANALYSIS_COMPILER_PROMPT.md`.

Use this guide for execution flow and troubleshooting only.

---

## 1. Why two docs still exist

1. `AI_ANALYSIS_COMPILER_PROMPT.md` is canonical contract (schema truth).
2. `AI_ANALYSIS_COMPILER_GUIDE.md` is slim runbook (how to operate).

This split prevents schema drift in prompts while keeping usage steps short.
Do not duplicate schema tables in this guide.

---

## 2. Operator flow

1. Run:

   `use:.github/prompts/speckit.compile.master.prompt.md`

2. Attach source image.
3. Receive one JSON envelope only.
4. Paste into compiler page textarea.
5. Confirm all gates pass.
6. Compile and inspect preview.
7. If fail, run patch loop:

   `use:.github/prompts/speckit.compile.patch.prompt.md`

---

## 3. Non-negotiable checks before compile

1. Top-level keys exactly: `inventory`, `geometry`, `appearance`.
2. Canvas width and height equal source image resolution.
3. Same id set exists in all stages.
4. Polygon uses tuple points only.
5. Geometry uses flat transform keys only.
6. No forbidden semantic words.
7. JSON starts with `{` and ends with `}` with no extra text.

---

## 4. Common failure map

1. Bad position or wrong rotation:
   - usually missing or wrong pivot/rotation fields.
   - verify flat transform keys only.
2. Texture looks flat:
   - texture tag exists but geometry overlays are missing.
   - add explicit texture bands/lines/layers.
3. Good JSON but bad render scale:
   - canvas size does not match source resolution.
4. Validation gate mismatch:
   - ids drifted between stages.

---

## 5. Ownership model

1. Prompt and agents own extraction process.
2. Validator owns contract enforcement.
3. Renderer owns deterministic draw output.
4. Canonical doc owns schema truth.

Any schema change must update all lock-step files listed in
`AI_ANALYSIS_COMPILER_PROMPT.md`.
