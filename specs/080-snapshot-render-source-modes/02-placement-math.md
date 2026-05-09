# 02 — Snapshot Replay Placement Math

## Problem statement

Current snapshot replay commonly uses centered image placement:

```js
<image
  x="${-snapshot.width / 2}"
  y="${-snapshot.height / 2}"
  width="${snapshot.width}"
  height="${snapshot.height}"
/>
```

This is incorrect for snapshots that already encode world-space placement across the template.

## Why centered replay is wrong

A captured snapshot image already contains pixels at final template/world positions for the element at capture time.

If replay centers this full snapshot around the element transform origin, replay applies an additional implicit offset and drifts from the original captured placement.

This drift is most visible for off-center elements.

## Correct replay model

Given layout metrics:

- `W = layoutMetrics.width`
- `H = layoutMetrics.height`

Given world transform translation:

- `x = (position.x / 100) * layoutMetrics.width`
- `y = (position.y / 100) * layoutMetrics.height`

Use snapshot body:

```js
<image
  x="${-x}"
  y="${-y}"
  width="${W}"
  height="${H}"
  preserveAspectRatio="none"
  href="..."
/>
```

Keep outer transform:

```js
translate(x y) rotate(r)
```

The translate and negative offsets cancel for placement, so replay lands at template coordinates `0..W, 0..H`, matching capture space.

## Coordinate example

Assume:

- `layoutMetrics.width = 480`
- `layoutMetrics.height = 480`
- element position `(25%, 75%)`
- so world `(x, y) = (120, 360)`

Replay body uses:

- `x = -120`
- `y = -360`
- `width = 480`
- `height = 480`

Outer `translate(120 360)` cancels body offset and places image at full template frame.

No double-centering is introduced.

## Validation expectations

1. Off-center element snapshot replay has no offset drift.
2. Rotated element replay stays anchored to original capture.
3. Scaled workflows do not introduce extra centering artifacts.
4. Debug assertion checks placement invariant during development:

```js
console.assert(snapshotPlacementMatchesTemplate === true);
```
