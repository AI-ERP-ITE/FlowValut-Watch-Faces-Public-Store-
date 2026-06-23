# Spec 105 — Tip/Tail Auto-Init from HTML Pivot + Readable Final Pivot

## Problem
The tip/tail slider (`composerAxis`) was initialized from `DEFAULT_AXIS` (0.843/0.860/0.750)
regardless of the HTML's own pivot markers. This caused hands to "fly away" in the preview
on first paste (wrong starting point) and forced the user to manually re-calibrate every time.

Additionally, when saving, the `composerAxis` value (the final tip/tail result) feeds the pivot
computation but the relationship between the HTML's original pivot and the user's adjustment
was not tracked — the stored value was opaque.

## Correct Behavior

### 1. Auto-init on HTML paste
When `validateLayer` runs and detects a pivot in the SVG/HTML:
- Set `composerAxis[hand] = detectedPivotYRatio` (the HTML's natural pivot)
- The preview immediately shows the hand rotating around its own designed pivot
- User can then drag the tip/tail slider to fine-tune from there

When no pivot is detected (plain HTML, no markers):
- Set `composerAxis[hand] = DEFAULT_AXIS[hand]` (current default values: 0.843/0.860/0.750)
- User must adjust manually if the default doesn't fit

**IMPORTANT**: Only auto-set on FIRST paste of this layer (i.e., when the composer draft
HTML changes for that slot). Do NOT overwrite on subsequent re-validates of the same HTML.
Track `lastInitializedHtml[hand]` to detect when HTML actually changed.

### 2. Final readable pivot on save
`composerAxis[hand]` at save time = the final effective pivot (0–1 ratio within image height).
This is the "readable" value fed into Spec 104's ratio computation:
```ts
hourPivotYRatio = composerAxis.hour;  // 0–1, final position after any user adjustment
```
No intermediate delta is needed — `composerAxis` IS the final absolute position.

---

## Changes

### `IconLab.tsx`

#### Add state: `composerAxisInitialized`
```ts
const [composerAxisInitialized, setComposerAxisInitialized] = useState<
  Partial<Record<'hour' | 'minute' | 'second', string>>  // hand → html that was used to init
>({});
```

#### Modify `validateLayer`
After setting `composerLayerAnchor`, check if this is a new HTML for this slot:
```ts
if (key !== 'hub') {
  const anchor = svgLayer
    ? parseLayerAnchorFromSvg(svgLayer)
    : { xRatio: 0.5, yRatio: 0.5 };
  setLayerAnchor(key, anchor);

  // Auto-init composerAxis ONLY when the HTML for this slot has changed
  const pivotYInit = svgLayer
    ? anchor.yRatio                    // use HTML's own pivot
    : DEFAULT_AXIS[key as keyof typeof DEFAULT_AXIS];  // fallback to default

  setComposerAxisInitialized(prev => {
    const currentHtml = composerDraft[`${key}Html` as keyof typeof composerDraft] as string;
    if (prev[key as 'hour'|'minute'|'second'] !== currentHtml) {
      // New HTML for this slot — auto-init pivot
      setComposerAxis(axPrev => ({ ...axPrev, [key]: pivotYInit }));
      return { ...prev, [key]: currentHtml };
    }
    return prev;  // same HTML — keep user's manual adjustment
  });
}
```

#### Reset `composerAxisInitialized` when composer draft is fully cleared
When user clicks "Clear All" or opens a fresh composer, reset so next paste auto-inits again.

---

## Interaction with Spec 104
The `composerAxis[hand]` final value (after auto-init or user drag) is passed as
`pivotNormOverrides[hand]` to `saveCustomHandStyle`, which Spec 104 reads as
`hourPivotYRatio` for the ratio record.

---

## Files Changed
- `app/src/components/IconLab.tsx` — add `composerAxisInitialized` state, modify `validateLayer`
