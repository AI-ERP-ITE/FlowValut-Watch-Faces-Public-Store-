# Spec 117 — Mandatory Restrictions and Historical Failure Guardrails

## Known failed approaches

The following are prohibited because Git history already demonstrated failure:

1. **Preview-only pair corrections** — Spec 113 generated 100 pair corrections, but Zepp received none of them.
2. **Universal widest-cell padding across all digit widgets** — Spec 114 applied it too broadly and produced a 22 px gap for variable numeric `11` while `88` had a 3 px gap.
3. **Narrow-glyph enlargement** — `MIN_INK_FRACTION` altered individual glyph scale and damaged font fidelity.
4. **Frame-derived bitmap width** — tied frame resizing back to typography and caused device/preview inconsistency.
5. **Single-sample permanent positioning** — centering `10`, `31`, or `58` cannot center every proportional runtime pair.

## Code restrictions

- Do not use `bounds.width / digitCount` to generate digit PNG width.
- Do not horizontally scale glyph pixels.
- Do not select a larger font size for `1` or `7` than for other digits.
- Do not attach runtime-critical corrections only to preview metadata.
- Do not mutate `fontSize` from frame resize handlers.
- Do not clear `fontSize` as the implementation of frame reset.
- Do not update linked elements during reset-to-content/range.
- Do not hardcode `align_h` when a supported widget has a stored user selection.
- Do not change working month-name or weekday image families without a failing test.
- Do not share MAIN/AOD generated filenames.

## Approved time-only exception

- `IMG_TIME` hours, minutes, and seconds are always zero-padded two-digit values, so they may use one common cell width derived from the widest measured 0–9 advance.
- Each time glyph must be centered inside the common cell and must never be horizontally stretched.
- The exception must not apply to `TEXT_IMG`, numeric `IMG_DATE`, weekday, month, or free-text rendering.
- Time placement is centered in Studio, then converted to a deterministic Zepp left origin from the generated pair width. Pair-specific correction tables remain prohibited.

## Deployment restrictions

- Specification and implementation commits must be separate.
- Deploy only with `npm run deploy:full:private` from the `app` repository.
- Load `.env.private.local` and pass the private Firebase preflight first.
- Do not use a docs-only deploy command.
- Do not touch the public remote.
- Do not include unrelated pre-existing working-tree changes in commits.

## Stop conditions

Stop implementation and return to design if any test shows:

- glyph aspect-ratio change across digits of the same font;
- bounds edits changing generated digit height;
- reset changing another element;
- generated `align_h` differing from stored `alignH` for `TEXT_IMG`;
- MAIN/AOD asset collision;
- preview geometry depending on metadata unavailable to Zepp;
- private build auth preflight failure;
- live bundle hash mismatch.
