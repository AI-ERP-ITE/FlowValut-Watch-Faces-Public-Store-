# Visual Envelope Compiler — User Guide

> **Quick start.** This is the operator manual for the in-app **Compiler**
> page. The compiler accepts a generic **Visual Envelope** (a pure-shape
> description of any image) and renders it deterministically to SVG. The
> chat-side analysis that produces the envelope is driven by the Spec Kit
> prompts in `.github/prompts/speckit.compile.*`.
>
> For the full schema and grammar, see
> [AI_ANALYSIS_COMPILER_PROMPT.md](AI_ANALYSIS_COMPILER_PROMPT.md).

---

## 1. End-to-end flow

1. **Pick an image.** Anything — a watchface mockup, a logo, an icon, a UI
   sketch. The compiler is image-agnostic; it has no built-in concept of
   "watchface" or "complication".
2. **Run the chat pipeline.** Open a chat and invoke the master prompt:

   ```
   use:.github/prompts/speckit.compile.master.prompt.md
   ```

   Attach the image. The master prompt orchestrates four sub-stages:

   - `speckit.compile.inventory.agent.md` — enumerates every distinct
     visible element with `id`, `kind`, `bbox`, `zOrder`, `groupId`.
   - `speckit.compile.geometry.agent.md` — assigns each id a concrete
     shape (`circle`, `arc`, `rect`, `line`, `polygon`, `path`, `text`,
     `image`, `group`) with numeric coordinates.
   - `speckit.compile.appearance.agent.md` — assigns each id a `fill`
     (solid / linear / radial / none) and a `stroke` plus optional
     opacity, blend mode, texture, clip mask.
   - `speckit.compile.audit.agent.md` — runs the same gates the in-app
     validator runs (G1 shape, G2 inventory, G3 geometry, G4 appearance,
     G5 cross-stage, G6 vocabulary).

3. **Emit the envelope.** `speckit.compile.emit.agent.md` produces a single
   JSON object:

   ```json
   { "inventory": {...}, "geometry": [...], "appearance": [...] }
   ```

4. **Open the Compiler page.** In the running app, navigate to
   `/compiler` (the **Back to Studio** button returns you to the studio).
5. **Paste the JSON** into the **Visual Envelope JSON** textarea.
6. **Read the panels:**
   - **Inventory** — lists every element as `id · kind · z<order>`.
   - **Validation Report** — six gates (G1–G6) each PASS / WARN / FAIL
     with detail lines.
   - **Failed IDs** — appears if any gate flagged specific elements;
     contains the exact list to feed the patch loop.
7. **Click Compile Visual Envelope.** Button is disabled until the
   validator returns `isValid: true`. On success the SVG renders into
   the **Compiled Preview** panel.
8. **If anything failed:** copy the report + envelope back into chat and
   invoke `use:.github/prompts/speckit.compile.patch.prompt.md`. It
   produces a patched envelope; repaste and re-validate.

---

## 2. The six gates (what the validator checks)

| Gate | Title              | Checks                                                                  |
| ---- | ------------------ | ----------------------------------------------------------------------- |
| G1   | Shape              | Top-level keys present; canvas has width/height/shape; arrays are arrays. |
| G2   | Inventory          | Unique ids matching `^[a-z][a-z0-9_]{0,63}$`; unique zOrders; group rules. |
| G3   | Geometry           | Per-shape required fields; finite numeric coordinates; arc/polygon sanity. |
| G4   | Appearance         | Hex color format `#rrggbb[aa]`; valid fill discriminator; stroke shape; clipPath ids exist. |
| G5   | Cross-stage parity | Same id set in inventory, geometry, appearance — no extras, no missing. |
| G6   | Vocabulary         | No watchface-semantic tokens (bezel, hand, complication, battery, …).   |

Every gate produces a `{ gateId, title, status, details, failedIds? }` row
in the report.

---

## 3. Authoring rules of thumb

- **Name for shape, not for purpose.** `el_001`, `ring_outer`, `dot_a` —
  not `hour_hand`, `bezel_ring`, `battery_widget`.
- **One element per visible thing.** A "ring with a notch" is two elements
  (an arc + a small rect), not one.
- **Stack with `zOrder`.** Background = lowest, overlays = highest.
  Integers must be unique.
- **Use `group` only to share a transform or clipPath.** Children list the
  parent in `groupId`; groups themselves have `groupId: null`.
- **Use `inherit` sparingly.** Only when geometry or appearance is truly
  not needed beyond the bbox + kind defaults (renderer falls back to a
  mid-grey solid fill).
- **Lowercase hex.** `#0f172a`, `#e2e8f0ff`. Uppercase or 3-digit forms
  are rejected by G4.

---

## 4. Troubleshooting

| Symptom in app                                  | Likely cause / fix                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| "JSON error: …" under the textarea              | Pasted text is not valid JSON. Check trailing commas / unbalanced braces.   |
| G2 FAIL — "duplicate id"                         | Two elements share an `id`. Re-run the inventory agent or rename manually. |
| G2 FAIL — "duplicate zOrder"                     | Two elements share a `zOrder`. Each must be a unique integer.              |
| G3 FAIL — "missing field for shape circle: r"    | Geometry entry omitted a required field. Check §3 of the spec.             |
| G4 FAIL — "invalid hex color: 'red'"             | Use hex `#rrggbb` or `#rrggbbaa`. Color names are not allowed.             |
| G5 FAIL — "id present in geometry, missing in inventory" | The three stages drifted. Re-run audit + emit, or hand-patch missing entries. |
| G6 FAIL — "forbidden token 'bezel'"              | Rename ids/strings to neutral shape labels.                                 |
| Compile button stays disabled                    | `report.isValid` is false. Resolve all FAIL gates first.                    |
| Preview pane reads "Run compile to preview…"     | Envelope validated but you haven't clicked **Compile Visual Envelope** yet.|
| Preview shows amber "Input changed…" warning     | You edited the JSON after compiling. Click compile again.                  |

---

## 5. What the renderer is allowed to do

The renderer (`app/src/pipeline/visualRenderer.ts`) is intentionally
minimal:

- Sorts elements by `zOrder`.
- Emits one `<g data-id … data-kind … data-z …>` per element so the SVG
  is greppable downstream.
- Resolves linear/radial gradients into `<defs>`.
- Resolves `clipPath` references into `<clipPath>` defs.
- Applies `transform`, `opacity`, `mix-blend-mode` per element.
- Renders groups as nested `<g>` containing their children.

It does **not** invent geometry, ignore unknown fields silently, or apply
defaults beyond the explicit `inherit` / DEFAULT_FILL / DEFAULT_STROKE
fallbacks. If something looks wrong on screen, it is wrong in the
envelope.

---

## 6. Where to look next

| You want to…                            | Read                                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| Understand the JSON contract in detail  | [AI_ANALYSIS_COMPILER_PROMPT.md](AI_ANALYSIS_COMPILER_PROMPT.md)     |
| Re-author the chat-side analysis        | `.github/prompts/speckit.compile.master.prompt.md`                   |
| Modify validator behavior               | `app/src/pipeline/visualValidator.ts`                                |
| Modify renderer behavior                | `app/src/pipeline/visualRenderer.ts`                                 |
| Change the in-app UX                    | `app/src/CompilerPage.tsx`                                           |
| Update TypeScript types                 | `app/src/types/visualSpec.ts`                                        |

Any change to the contract must update **all** of the files above plus the
spec doc, in lock-step.
