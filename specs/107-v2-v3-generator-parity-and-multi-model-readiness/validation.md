# specs/107-v2-v3-generator-parity-and-multi-model-readiness/validation.md

## V2 vs V3 Parity Matrix (Initial)

| Behavior | V2 | V3 | Status | Notes |
|---|---|---|---|---|
| Manifest contract | v2 | v3 | expected-different | Structural difference by platform contract |
| Model routing | hardcoded list | hardcoded list | risk | Needs metadata-driven routing |
| TIME_POINTER | yes | yes | parity | Main logic present in both |
| GAUGE_POINTER | yes | yes | parity | Pivot normalization in both |
| ARC_PROGRESS | yes | yes | parity | Foreground + faint track style exists |
| IMG_TIME | yes | yes | parity | Combined time widget support |
| IMG_DATE | yes | yes | parity | V3 now supports month/day arrays |
| IMG_WEEK | yes | yes | parity | V3 now supports explicit/fallback arrays |
| BUTTON + IMG_CLICK | yes | yes | parity | Overlay concept present in both |
| Overlay suppression set | yes | yes | parity | Similar NO_OVERLAY lists |
| AOD background mode handling | yes | partial | gap | V2 explicit branch richer |
| Dedicated AOD widget branch | yes | partial | gap-critical | V2 has duplicated ONLY_AOD build path |
| WIDGET_DELEGATE screen-type branch | yes | partial | gap-medium | V3 simpler lifecycle path |

## Routing Policy Proposal

1. Resolve `model` from selected watch model (by normalized name).
2. Read `specGroup` from `models.json`.
3. Read `supportedConfigVersions` from `specGroups.json`.
4. Selection policy:
   - If only v2 supported -> V2.
   - If only v3 supported -> V3.
   - If both supported -> prefer V3 only when parity-critical gaps are closed; otherwise V2 fallback.
   - If metadata missing -> fallback to V2 and emit warning.

## Multi-resolution Readiness Checks

- Check A: canvas dimensions derive from active model width/height.
- Check B: drag/resize clamp uses active width/height (not fixed square).
- Check C: background generators/renderers use width and height separately.
- Check D: square model renders square frame; rect model renders rect frame.
- Check E: pointer center/pivot values remain stable after model switch.

## Implementation Gate (Pre-code)

- [ ] Parity matrix reviewed and approved.
- [ ] Gaps classified with owner + priority.
- [ ] Routing policy approved.
- [ ] Multi-resolution acceptance checklist approved.
- [ ] Regression test matrix approved.
