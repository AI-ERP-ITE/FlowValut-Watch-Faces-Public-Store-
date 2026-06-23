# Spec 102 — Font & Color Picker for IMG_WEEK

## Problem
The font/color picker section in PropertyPanel is gated on:
```ts
['IMG_TIME', 'TEXT_IMG', 'TEXT', 'IMG_DATE'].includes(element.type)
```
`IMG_WEEK` is excluded — user cannot set font style or color for weekday name images.

The underlying `regenerateDigitFilesFromElements` already reads `el.color` and `el.fontStyle`
for IMG_WEEK (lines ~1397-1416), so the ZPK export would use them if set.
Only the UI control is missing.

## Fix
In `PropertyPanel.tsx` line ~1974, add `'IMG_WEEK'` to the font/color section condition:

**Before:**
```tsx
{['IMG_TIME', 'TEXT_IMG', 'TEXT', 'IMG_DATE'].includes(element.type) && (
```

**After:**
```tsx
{['IMG_TIME', 'TEXT_IMG', 'TEXT', 'IMG_DATE', 'IMG_WEEK'].includes(element.type) && (
```

No other changes needed — the font preview label '12:34' is acceptable for IMG_WEEK as well,
since it demonstrates the font/color style.

## Files
- `app/src/components/PropertyPanel.tsx` — one-line change

## Acceptance
- Select IMG_WEEK element → Font Style section appears in PropertyPanel
- Change font/color → canvas preview updates (uses fallback text render with chosen style)
- Generate ZPK → week PNG files use selected font and color
