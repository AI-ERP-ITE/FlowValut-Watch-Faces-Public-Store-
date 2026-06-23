# Spec 101 — IMG_WEEK weekFormat Default Mismatch Fix

## Problem
When a user adds an IMG_WEEK element, `element.weekFormat` is `undefined`.

- **PropertyPanel UI**: shows 'Full' as selected (via `?? 'full'` default)
- **ZPK export** (`regenerateDigitFilesFromElements`): falls through to `WEEK_SHORT` when `weekFormat` is `undefined`
- **Canvas preview** (`getMaxDigitMock`): hardcodes `'WED'` regardless of format

Result: User sees 'Full' selected in UI but ZPK generates SHORT names. Canvas never shows
the actual format sample.

## Fixes Required

### Fix A — `regenerateDigitFilesFromElements` (StudioApp.tsx ~line 1413)
Change fallback from WEEK_SHORT → WEEK_FULL when `weekFormat` is undefined,
so it matches the UI default (`?? 'full'`).

**Before:**
```ts
const days = el.weekFormat === 'full' ? WEEK_FULL : el.weekFormat === 'initial' ? WEEK_INITIAL : WEEK_SHORT;
```

**After:**
```ts
const fmt = el.weekFormat ?? 'full';
const days = fmt === 'full' ? WEEK_FULL : fmt === 'initial' ? WEEK_INITIAL : WEEK_SHORT;
```

### Fix B — Canvas preview sample text (InteractiveCanvas.tsx ~line 1698)
`getMaxDigitMock` returns hardcoded `'WED'` for `IMG_WEEK`.
The function doesn't have access to `weekFormat`.

In `drawDigitElement`, the element `el` IS available. Override the placeholder text
for `IMG_WEEK` to reflect the actual weekFormat:

```ts
// inside drawDigitElement, before "Fallback: draw placeholder text" section
// replace getPlaceholderText(el) for IMG_WEEK:
const text = el.type === 'IMG_WEEK'
  ? (el.weekFormat === 'full' ? 'Wednesday' : el.weekFormat === 'initial' ? 'Mo.' : (el.weekFormat ?? 'full') === 'full' ? 'Wednesday' : 'WED')
  : getPlaceholderText(el);
```

Simplified logic for clarity:
```ts
function getWeekSample(weekFormat: string | undefined): string {
  const fmt = weekFormat ?? 'full';
  if (fmt === 'full') return 'Wednesday';
  if (fmt === 'initial') return 'Mo.';
  return 'WED';
}
```
Use this inside `drawDigitElement` when `el.type === 'IMG_WEEK'`.

## Files
- `app/src/StudioApp.tsx` — Fix A
- `app/src/components/InteractiveCanvas.tsx` — Fix B

## Acceptance
- Add IMG_WEEK, do not touch weekFormat → ZPK has FULL names (Monday, Tuesday…)
- Select 'Short' → ZPK has SHORT names (MON, TUE…)
- Select 'Initial' → ZPK has initial letters (M, T, W…)
- Canvas preview placeholder matches selected format label
