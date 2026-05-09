# 04 — HiDPI Snapshot Capture

## Problem statement

Current capture often rasterizes at logical template size only (for example 480x480). On HiDPI displays this appears soft because the editor displays more device pixels than were captured.

## Required correction

Capture canvas must scale by device pixel ratio with a strict cap:

```js
const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
```

Then allocate and scale:

```js
canvas.width = width * pixelRatio;
canvas.height = height * pixelRatio;
ctx.scale(pixelRatio, pixelRatio);
```

Render draw remains in logical coordinates after scaling.

## Canonical dimension rule

Store logical dimensions in snapshot metadata:

- `snapshot.width = logical width`
- `snapshot.height = logical height`

Do not store DPR-scaled width/height in metadata.

Replay geometry remains in template logical space.

## Why cap at 2x

Unbounded DPR multiplies captured pixel count and data URL size.

Approximate scaling is quadratic:

$$
bytes \propto (width \cdot pixelRatio) \times (height \cdot pixelRatio) = width \cdot height \cdot pixelRatio^2
$$

So moving from 1x to 2x increases pixel payload by about $4\times$.

Cap at 2x balances:

1. visible anti-softness improvement
2. reduced risk of local persistence quota saturation

## Compatibility and constraints

- Existing export/canonical layout math remains logical-size based.
- This change improves editor capture quality only.
- Do not change unrelated snapshot storage architecture in this stage.
