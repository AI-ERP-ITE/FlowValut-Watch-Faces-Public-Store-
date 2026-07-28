# Spec 128 — Editable AOD and Preview Stability

## Failures

1. System B inferred variant-controlled AOD merely because source FVWF files
   contained AOD elements. This discarded the complete base AOD even though
   System B has no AOD-editing action.
2. Hidden variant canvases rendered the full-screen background element as an
   unresolved IMG placeholder over the actual background, contaminating edit
   previews.
3. A complete rendered face was used as `select_image` and
   `un_select_image`. ZeppOS then overlaid that second face over the live face,
   producing combined images and flicker.

## Required behavior

- Until explicit AOD editing exists, always use the complete base FVWF AOD.
- Preserve the base AOD background policy, background, elements, date, and time
  pointers.
- Hide only the duplicate full-screen background IMG when capturing a source
  preview because the canvas background prop already renders it.
- Use a slot-sized crop of a clean source background as the edit-group image.
  Never use a complete rendered face or a synthetic checker/white-border mask.
- Keep `select_list` absent.

## Restrictions

- System A remains untouched.
- No variant AOD inference.
- No full-face edit-group overlay.
- No placeholder-containing preview may be packaged.
