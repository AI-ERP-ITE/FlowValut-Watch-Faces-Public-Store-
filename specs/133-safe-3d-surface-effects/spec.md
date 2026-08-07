# Spec 133 — Watch-Safe 3D Surface Effects

**Status:** Implemented and software-validated; private deployment and physical-watch acceptance pending  
**Created:** 2026-08-02  
**Domain:** System A baked widget assets, canvas preview, FVWF, ZPK export

## Problem

FlowVault supports photo adjustments, shadows, engraving, and emboss-like effects,
but it does not provide a true material-and-lighting 3D surface effect comparable
to Affinity 2's 3D Layer Effect. A naive implementation would create pale halos,
partial-alpha edge noise, clipped highlights, damaged pivots, and excessive ZPK
growth—especially on small Amazfit assets.

## Goal

Add one shared, deterministic 3D Surface engine for every visual widget that is
already rasterized into PNG assets. The engine must model a raised or recessed
surface from alpha coverage, light it predictably, and bake exactly the same
pixels for canvas preview and ZPK export.

This is a 2D height-map lighting effect. It is not true mesh geometry, extrusion,
perspective, refraction, or the existing bevel/emboss effect.

## Approved Implementation Clarification — 2026-08-07

The effect follows the same pixel-only architecture as hue, saturation, and
brightness. It changes the baked PNG pixels only. It does not change widget
types, coordinates, bounds, pivots, data bindings, Zepp runtime behavior, or the
ZPK format. Safe edge handling therefore stays inside the original bitmap
dimensions; no outward glow or geometry padding is introduced.

## Supported v1 Controls

| Control | Contract |
|---|---|
| Enabled | Per-element opt-in; legacy default is off |
| Surface direction | Raised or recessed |
| Radius | Limited edge/surface extent, clamped relative to asset size |
| Depth | Limited signed surface strength |
| Soften | Limited height-map smoothing |
| Surface profile | Safe presets only; no freehand profile editor |
| Light azimuth | 0–360 degrees |
| Light elevation | Safe minimum/maximum range |
| Light color | RGB/hex color |
| Light intensity | Clamped to prevent channel clipping |
| Ambient color | Optional low-strength color cast over the original material base |
| Ambient intensity | Clamped ambient contribution; legacy/default value is zero |
| Diffuse | Matte surface response |
| Specular | Limited highlight strength |
| Specular color | Independent RGB/hex highlight color; legacy fallback follows light color |
| Highlight tightness | Persisted through the existing `shininess` value; controls highlight concentration |
| Fill opacity | Original artwork opacity without reducing lighting |
| Effect opacity | Final 3D-lighting blend |
| Scale with object | Always enabled |
| Quality | Fast canvas preview; deterministic high-quality export |

Safe profile presets in v1:

- Soft Rounded
- Matte Plastic
- Polished Metal
- Controlled Chrome
- Recessed Engraved

## Explicitly Removed or Postponed

The following Affinity-like capabilities are excluded from v1 because they
materially increase alpha artifacts, unstable highlights, or geometry risk:

| Excluded feature | Reason |
|---|---|
| Freehand/custom profile curves | Can create ringing, ridges, and edge bands |
| Multiple light sources | Accumulates clipped and conflicting highlights |
| Luminance-derived height maps | Turns texture/noise into unwanted geometry |
| Alpha+luminance hybrid height maps | Postponed until alpha-only output is proven |
| Texture, noise, or bump maps | Creates rough/flickering small pixels |
| Environment/reflection maps | High complexity and unstable small-asset output |
| True extrusion and perspective | Changes geometry, coordinates, and pivots |
| Glass/refraction/transmission | Produces unsafe partial-alpha edges |
| Unbounded radius/depth/specular | Produces halos, clipping, and broken cores |
| Separate cast-shadow implementation | Existing tested drop-shadow pipeline remains authoritative |

## Eligible Widget Boundary

The effect is available only when the visual representation is baked to PNG.

| Widget family | v1 behavior |
|---|---|
| Static Image / Status Image | Apply to baked image asset |
| Image Switcher | Apply identically to every frame before runtime expansion |
| Numeric Values / Text Images | Apply identically to every generated glyph |
| Week / Month / Date images | Apply identically to every generated label/frame |
| Digital Time / Time Reading | Apply identically to all generated glyphs and separators |
| Clock hands | Apply to hand assets while preserving pivot geometry |
| Gauge pointer | Apply to needle asset while preserving normalized pivot |
| Layered PNG gauge | Apply independently to eligible PNG siblings |
| PNG Arc mode | Apply consistently to track and/or generated frames |
| Rasterized shapes | Apply after shape rasterization |
| Backgrounds | Optional, explicit opt-in only |
| Native ARC_PROGRESS | Not eligible unless converted to PNG Arc mode |
| Invisible/runtime-control widgets | Not eligible |

## Rendering Contract

1. Rasterize the visual source at a controlled supersampling scale.
2. Build a height field from alpha coverage only.
3. Smooth within configured limits.
4. Derive stable surface normals from the height field.
5. Apply one directional light with diffuse and limited specular response.
6. Blend lighting with original fill using independent fill/effect opacity.
7. Keep the original bitmap dimensions and prevent all lighting from expanding beyond its alpha silhouette.
8. Downsample exactly once using the approved high-quality path.
9. Preserve an opaque interior core wherever the source has one.
10. Clamp highlights and reject unsafe near-transparent edge colors.
11. Run the watch-safe alpha finalizer after the 3D render.
12. Return PNG pixels plus geometry metadata describing added padding.

Canvas preview and export must call the same renderer and normalization logic.
Preview may use a lower supersampling factor but must not use different material
math.

## Geometry and Runtime Safety

- Exported element bounds and visual position must remain unchanged.
- TIME_POINTER and GAUGE_POINTER pivots must remain unchanged.
- Grouped gauge siblings must retain their relative coordinates and z-order.
- Frame/glyph families must use identical normalized settings and padding policy.
- Source data URLs, custom libraries, and saved definitions must never be mutated.
- Effects are baked during ordinary generation; Zepp receives normal PNG assets.
- No new undocumented Zepp widget or runtime shader is introduced.

## Persistence

Add one optional `surface3d` object to `WatchFaceElement`. All fields have safe
defaults, and absence means disabled. Existing FVWF files require no migration.
The normalized object should contain the supported controls plus renderer version
so future improvements can preserve old output when necessary.

## Risk Controls

| Risk | Severity | Required control |
|---|---:|---|
| Pale/white alpha halos | Critical | Controlled mask, premultiplied processing, final alpha cleanup |
| Canvas/watch mismatch | Critical | One shared deterministic renderer |
| Pointer displacement | Critical | Padding-aware pivot translation tests |
| Existing output changes | Critical | Disabled-by-default byte-equivalence tests |
| Clipped lighting | High | Alpha-contained lighting and highlight clamps |
| Tiny-widget noise | High | Minimum-size eligibility and radius/depth clamps |
| Frame-family inconsistency | High | Batch normalization and golden family tests |
| ZPK bloat | High | No extra runtime frames except existing widget requirements |
| Slow generation | Medium | Cached source/height maps and bounded supersampling |

## Acceptance Criteria

1. Disabled 3D settings do not change legacy canvas or ZPK pixels/logic.
2. Eligible widgets expose the same 3D Surface controls and presets.
3. Raised and recessed alpha-only surfaces render deterministically.
4. Preview and exported PNGs match within the approved pixel tolerance.
5. Opaque cores remain opaque and no pale/colored fringe survives finalization.
6. Rectangular, tiny, transparent, and anti-aliased assets pass golden tests.
7. Pointer and gauge pivots and geometry remain byte-identical before and after baking.
8. Every switcher frame and glyph family receives identical settings.
9. Native Arc remains unchanged and clearly directs users to PNG Arc for 3D.
10. FVWF round-trip preserves settings without altering old projects.
11. Private production build, representative ZPK inspection, and watch tests pass.

## Deployment

System A is implemented and software-validated. Deploy private Studio/shared
core only through:

```text
npm run deploy:full:private
```
