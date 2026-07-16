# Spec 120 — Regression Tests

- Ordinary centered, left-aligned, and right-aligned elements retain proportional target placement.
- TIME_POINTER `(240,240)` becomes `(233,233)` for 480→466; pointerCenter follows; all local hand fields remain identical.
- HTML-source and PNG-source hand metadata is unaffected apart from global project center/bounds.
- MAIN and AOD arrays both transform once and remain independent objects.
- Generated TEXT/digit/date/week/time layout sizes use the conservative uniform ratio.
- Gauge, IMG_LEVEL, image switcher, animation, icon, and custom raster dimensions remain unchanged while placement transforms.
- Keep mode returns the original resolution/model/geometry/background.
- Rearrange mode adopts target model and resolution.
- A 466×466 dedicated background produces a 480×480 data URL/File when targeting 480×480.
- Background elements become `(0,0,targetWidth,targetHeight)` and remain excluded from ordinary widget emission.
- V2/V3 emitted coordinates equal the transformed config values and are not scaled again.
- Packaging rejects or normalizes a background whose natural dimensions differ from config resolution.

