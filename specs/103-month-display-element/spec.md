# Spec 103 — Month Display Element (IMG_DATE subtype: month)

## Problem
There is no UI way to add a month display element. The user cannot show the current month
on their watchface design.

## Background
The ZPK code generator (`jsCodeGeneratorV2.ts`) already supports month:
- `generateIMGMonthWidget` emits `hmUI.widget.IMG_DATE` with `month_startX/Y`, `month_sc/tc/en_array`
- Triggered when `element.type === 'IMG_DATE' && element.subtype === 'month'`
- Pre-generated month images: `month_0.png` – `month_11.png` (JAN–DEC, fixed style)

Missing: (1) UI way to create such element, (2) font/color regeneration for month images,
(3) canvas preview for month elements.

## Fixes Required

### Fix A — PropertyPanel type switcher: add Month button
Current switcher (line ~1928) has 2 buttons: 'Date Digit' (IMG_DATE) and 'Weekday Name' (IMG_WEEK).
Add a third: 'Month Name' which sets `{ type: 'IMG_DATE', subtype: 'month' }`.

```tsx
{(['IMG_DATE', 'IMG_WEEK'] as const).map(wt => ( ... ))}
```

Add third option after the map or inline as a third entry:
- Label: 'Month Name'
- Example: 'APR'
- On click: `update({ type: 'IMG_DATE', subtype: 'month' })`
- Active check: `element.type === 'IMG_DATE' && element.subtype === 'month'`
- 'Date Digit' active check: `element.type === 'IMG_DATE' && element.subtype !== 'month'`

### Fix B — `regenerateDigitFilesFromElements` (StudioApp.tsx): month image generation
For `el.type === 'IMG_DATE' && el.subtype === 'month'`, generate 12 label images:
- Filenames: `month_0.png` – `month_11.png`
- Text: `['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][i]`
- Use `makeLabelCanvas` with `el.color`, `el.fontStyle` (same as IMG_WEEK pattern)
- Width: `el.bounds.width || 40`, Height: `el.bounds.height || 20`

Add this case in the `for (const el of elements)` loop after the IMG_WEEK case:
```ts
} else if (el.type === 'IMG_DATE' && el.subtype === 'month') {
  const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const w = Math.max(el.bounds.width || 40, 20);
  const h = Math.max(el.bounds.height || 20, 12);
  for (let i = 0; i < 12; i++) {
    results.push({ filename: `month_${i}.png`, dataUrl: makeLabelCanvas(MONTH_NAMES[i], color, fontFamily, fontWeight, w, h) });
  }
}
```

### Fix C — Canvas preview placeholder for month elements
In `InteractiveCanvas.tsx`, `getMaxDigitMock` for `IMG_DATE` returns `'31'`.
But for month subtype it should return `'APR'`.

In `drawDigitElement`, override text for `IMG_DATE` with `subtype === 'month'`:
```ts
const text = el.type === 'IMG_WEEK'
  ? getWeekSample(el.weekFormat)
  : (el.type === 'IMG_DATE' && el.subtype === 'month')
    ? 'APR'
    : getPlaceholderText(el);
```

### Fix D — Add element default name
When adding a month element via type switcher, the element name should be 'Month' not 'Date'.
This is cosmetic — if difficult, skip.

## Files
- `app/src/components/PropertyPanel.tsx` — Fix A
- `app/src/StudioApp.tsx` — Fix B
- `app/src/components/InteractiveCanvas.tsx` — Fix C (alongside Spec 101 Fix B)

## Acceptance
- Select any IMG_DATE or IMG_WEEK element → type switcher shows 3 options: Date Digit / Month Name / Weekday Name
- Clicking 'Month Name' → element becomes IMG_DATE with subtype='month'
- Canvas preview shows 'APR' as placeholder
- ZPK export generates 12 month PNG files with correct font/color
- Device shows current month name (JAN–DEC)
