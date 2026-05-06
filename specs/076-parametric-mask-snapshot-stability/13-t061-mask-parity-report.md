# 13 - T-061 Mask Parity Live vs Snapshot

## Task

T-061 Mask parity live vs snapshot.

## Goal

Validate acceptable parity for mask behavior between live and snapshot source modes in controlled scenarios.

## Validation Runs

### Run A - Existing source-mode tests

Command:

`npx vitest run engine/core/render-source-snapshot-mode.test.js engine/core/render-source-live-pass-through.test.js --reporter=verbose`

Observed result:

1. 2 files passed.
2. 4 tests passed.
3. Snapshot mode mask gate behavior and fallback chain remained green.

### Run B - Controlled parity smoke (ring)

Method:

1. Built one masked ring element.
2. Rendered same element once in `live` mode and once in `snapshot` mode.
3. Compared mask id parity, transform parity, opacity token parity, and source primitive type.

Observed metrics:

```json
{
  "liveHasSvg": true,
  "snapshotHasSvg": true,
  "liveHasMask": true,
  "snapshotHasMask": true,
  "sameMaskId": true,
  "sameTransform": true,
  "liveHasOpacity": false,
  "snapshotHasOpacity": true,
  "snapshotUsesImageSource": true,
  "liveUsesImageSource": false
}
```

### Run C - Controlled parity smoke (free_rect)

Method:

1. Built one masked free_rect element.
2. Rendered same element in `live` and `snapshot` modes.
3. Compared same parity signals.

Observed metrics:

```json
{
  "sameMaskId": true,
  "sameTransform": true,
  "liveHasOpacity065": false,
  "snapshotHasOpacity065": true,
  "snapshotUsesImageSource": true
}
```

## Findings

1. Mask parity signals are stable in controlled runs:
   - identical mask ids used by live and snapshot outputs.
   - identical transform strings used by live and snapshot outputs.
2. Snapshot source substitution is correct (`<image href=...>` in snapshot mode only).
3. Non-mask difference observed:
   - snapshot output emits explicit element opacity token while equivalent live output does not emit matching opacity token in these controlled cases.

## T-061 Conclusion

T-061 accepted for mask parity objective:

1. Mask gating and transform parity are acceptable in controlled cases.
2. Snapshot/live source switching remains stable with passing source-mode tests.
3. Residual risk recorded: opacity-token representation differs between live and snapshot outputs for tested elements; track separately as non-mask visual parity follow-up.
