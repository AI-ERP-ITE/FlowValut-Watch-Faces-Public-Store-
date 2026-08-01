# T023 — Image-Switcher Frame Path

**Executed**: 2026-07-29  
**Result**: PASS  
**G3 contribution**: PASS for exact-size and 480×480 → 466×466 frames  
**G5 contribution**: Switcher route isolated from static-image orchestration

## Route Under Test

The current linked-definition `IMG_LEVEL` flow was tested at three layers:

```text
definition.ranges[]
→ switcher_<element-id>_slot_<index>.png
→ linked-definition filter and lexical ordering
→ expected frame-count resolution
→ imglvl_<element-name>_<index>.png
→ resizeDataUrl(frame, element bounds)
→ PNG bytes
```

The alpha fixture was tested through both branches of `resizeDataUrl()`:

- exact size: 480×480 → 480×480;
- normalized size: 480×480 → 466×466.

No image effects, photo edits, widget opacity, packaging, preview substitution,
or production behavior were changed.

## Machine-Readable Evidence

- `evidence/tooling/image-switcher-route-structure.mjs`
- `evidence/flowvault-routes/T023-image-switcher-structure.json`
- `evidence/flowvault-routes/T023-switcher-exact-480.png`
- `evidence/flowvault-routes/T023-switcher-exact-comparison.json`
- `evidence/flowvault-routes/T023-switcher-normalized-466.png`
- `evidence/flowvault-routes/T023-switcher-normalized-comparison.json`

The repository's existing `src/lib/imageSwitcherResolver.test.ts` suite was
also executed: 1 file passed, 5 tests passed.

## Structure and Ordering

A four-frame `BATTERY` definition was used to validate source-equivalent export
orchestration.

| Check | Result |
|---|---|
| Four populated slots collected | PASS |
| Zero-padded slot names `_00` through `_03` | PASS |
| Slot bounds copied as 466×466 with local origin `(0,0)` | PASS |
| Linked-definition filter excludes unrelated assets | PASS |
| Lexical sort preserves slot order | PASS |
| Expected count resolves to four | PASS |
| Generated `imglvl_…_0.png` through `imglvl_…_3.png` names | PASS |

This confirms the asset duplication seen during export is intentional staging:
`switcher_…` names are collected source slots, while `imglvl_…` names are the
device-facing normalized frame family. It is not a second displayed widget or
a second compositing pass.

## Exact-Size Frame

Reference: immutable 480×480 fixture.

| Measurement | Result |
|---|---|
| Encoded bytes equal | true |
| SHA-256 | `943644b2db678f4257c52ced0417a00f62565a50d637bca6565e4db57d4dc01e` |
| Decoded RGBA equal | true |
| Mismatched pixels | 0 |
| Mismatched alpha pixels | 0 |
| Composite error on black/white/checker | 0 |

The switcher's matching-size branch preserves the source exactly.

## Normalized Frame

Reference: T022's independently validated 466×466 static normalization.

| Measurement | Result |
|---|---|
| Encoded bytes equal | true |
| SHA-256 | `7a29ef939c93843e99862856967217c7862a78401b3f47ccda1c87bfc6d36892` |
| Decoded RGBA equal | true |
| Mismatched pixels | 0 |
| Mismatched alpha pixels | 0 |
| Composite error on black/white/checker | 0 |

The switcher frame is byte-identical to the shared static-image resize
baseline. It introduces no extra alpha conversion, color conversion, geometry
change, or compression beyond `resizeDataUrl()`.

## Verdict

The image-switcher export route does not itself damage alpha:

- matching-size frames remain byte-identical;
- dimension-changing frames behave exactly like the already validated static
  normalization route;
- frame count, ordering, bounds, and generated names are stable;
- partial transparency is not converted to binary or opaque alpha.

This rules out the current pre-package switcher orchestration as the first
divergence boundary. It does not yet rule out ZPK extraction, Zepp compilation,
or firmware compositing; those remain assigned to later tasks.

