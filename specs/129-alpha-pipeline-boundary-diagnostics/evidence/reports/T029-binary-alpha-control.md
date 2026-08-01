# T029 — Binary-Alpha Compatibility Control

**Executed**: 2026-07-29  
**Result**: PASS  
**Scope**: main-view week/month label assets only

## Execution

The existing diagnostic transformer was run again from the original unmodified
test package:

```text
ZPK for tests/test for fonts .zpk
→ coverage-and-centroid-preserving binary transform
→ evidence/binary-control/T029-binary-label-control.zpk
```

The transformer targets only:

```text
assets/week_main_…_<index>.png
assets/month_main_…_<index>.png
```

It does not target AOD labels, numeric glyphs, images, switchers, icons,
pointers, backgrounds, previews, JavaScript, or application metadata.

No production source or generator behavior was changed.

## Machine-Readable Evidence

- `evidence/binary-control/T029-binary-label-control.zpk`
- `evidence/binary-control/T029-binary-label-control.zpk.diagnostic.json`
- `evidence/binary-control/T029-independent-validation.json`
- `evidence/tooling/validate-binary-label-control.mjs`
- `app/scripts/createBinaryLabelDiagnosticZpk.mjs`

## Independent Archive Isolation

| Measurement | Result |
|---|---:|
| Target label assets found | 19 |
| Target label assets changed | 19 |
| Untouched outer entries byte-identical | 5 |
| Untouched device entries byte-identical | 138 |
| Main-view target dimensions preserved | 19/19 |
| Source targets containing partial alpha | 19/19 |
| Result targets containing partial alpha | 0/19 |
| Result targets containing only alpha 0/255 | 19/19 |

The independent validator did not rely on the transformer's own report.

## Coverage and Centroid

Across all 19 transformed assets:

```text
Maximum absolute coverage error:
0.48627450980369247 pixel

Maximum centroid shift:
0.008761031075949206 pixel
```

Coverage is preserved to the nearest whole opaque pixel, which is the best
possible binary-mask resolution. The boundary-swap optimization keeps the
alpha centroid within less than one hundredth of a pixel.

## Bounds

Maximum absolute nonzero-alpha bounds delta:

```text
2 pixels
```

This is an important limitation. The transform preserves dimensions, aggregate
coverage, and centroid extremely closely, but it cannot preserve every
antialiased perimeter pixel while also restricting alpha to `0/255`. Some
glyphs lose up to two pixels at an outer nonzero-alpha bound.

The reported watch control looked correct, so this bounds change was acceptable
for that face. It must still be included in regression criteria before any
production text-only implementation.

## Reproducibility

The fresh ZPK's outer SHA differs from the earlier diagnostic because the ZIP
containers were regenerated. However, all 19 transformed PNG assets inside
`device.zip` are byte-identical to the earlier watch-tested diagnostic:

```text
19/19 byte-identical target PNGs
```

The fresh measurements also exactly reproduce the earlier maxima:

- coverage error `0.48627450980369247`;
- centroid shift `0.008761031075949206`.

This confirms the binary-mask transform itself is deterministic and reproduces
the exact assets previously confirmed visually successful on the watch.

## Verdict

T029 validates the compatibility control:

- the label-only binary transformation is deterministic;
- its archive scope is isolated;
- it removes every intermediate alpha value from the 19 targets;
- it preserves coverage and centroid within the stated limits;
- it reproduces the exact watch-tested target PNGs.

It remains evidence for a workaround, not authorization for a global alpha
policy. T026–T028 proved that non-text images and effects have legitimate
partial-alpha contracts. Any eventual implementation must remain text-specific
and must account for the measured two-pixel maximum bounds change.

