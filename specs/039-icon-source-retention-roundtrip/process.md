# Process: Icon Source-Retention Roundtrip

## Objective
Enable editable custom icon roundtrip while preserving stable PNG export semantics.

## Process Rules
- Follow strict stage order from specsmd-mater.
- Do not begin implementation before explicit approval (`approve` or `proceed`).
- Execute tasks sequentially.

## Roundtrip Rules
1. New custom icons:
   - Persist source payload (`svg` or `html`) and PNG cache.
2. Legacy custom icons:
   - Keep PNG-only behavior with non-editable source indicator.
3. Export path:
   - Continue decoding `dataUrl` and writing `icon_*.png` files.
4. Re-edit path:
   - If source exists, open editor prefilled with stored source.

## Validation Matrix
1. SVG icon save -> reopen -> edit -> save -> export pass.
2. HTML icon save -> reopen -> edit -> save -> export pass.
3. Legacy PNG-only icon remains assignable and exportable.
4. No regressions in icon library registration and packaging.
