# Tests — Spec 108

## Regression matrix

| Case | Source | Hub size | Pivot style | Expected result |
|---|---|---|---|---|
| Ornate SVG hand | HTML only | Standard | Markerless + tip/tail | Canvas preview keeps detail and matches HTML preview shape |
| Ornate SVG hand with embedded PNG | HTML + base64 image | Standard | Markerless + tip/tail | Embedded image renders in canvas preview without manual PNG upload |
| Small hub | HTML only | Below previous failure point | Any | Hub still renders instead of disappearing |
| Large hub | HTML only | Above normal size | Any | Hub scales cleanly without distortion |
| Separate resize | HTML only | Hub and hands edited individually | Any | Hub uses one scalar control; hands keep their own length/width controls |
| Whole-set resize | HTML only | Any | Any | Hub and all hands scale together proportionally |
| Legacy saved record | No source markup | Standard | Existing stored pivot | Fallback PNG path still renders |
| Ratio-backed record | Stored ratio fields present | Standard | Existing stored pivot | Canvas uses ratio geometry, not hardcoded fixed sizes |

## Manual proof points
- HTML preview and canvas preview should show the same ornamental details for the same hand source.
- Tip/tail adjustment should not jump when the same HTML is revalidated.
- Hub should remain visible even when the art is faint or soft-edged.
- Embedded base64 images should survive save and reload.
