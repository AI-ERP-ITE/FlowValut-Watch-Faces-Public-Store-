# Spec 116 — PNG Hand Pack Source Roundtrip

## Status

**Complete — implemented, validated, privately deployed, and closed on 2026-07-15.**

Implementation commit: `494bf679`

Documentation/deployment record: `cac3461e`

Private deployment commit: `5d3596c3` (`index-DhtWbROL.js`)

## Problem

The Pointer Composer currently accepts editable HTML/SVG source only. This is unreliable for visually complex watch hands created in image-generation tools, even when the user can cleanly cut the hour, minute, second, and hub images in an image editor. The existing hand record and cloud sync paths store HTML source plus baked PNGs, so a PNG-only source pack cannot be reopened, replaced, or synced as an editable hand style.

## Goal

Add a PNG Hand Pack authoring path alongside the existing HTML/SVG composer. A PNG pack has four independently replaceable source images (hour, minute, second, hub), uses the existing pivot/tip-tail workflow, remains selectable in the same hand library, and round-trips through IndexedDB and Firebase Storage without putting image data in Firestore.

## Scope

In scope:

- A Pointers sub-mode for `HTML / SVG Composer` and `PNG Hand Pack`.
- Four direct PNG uploads, validation, a shared composition preview, and existing tip/tail controls.
- Persist high-resolution editable PNG sources separately from the existing normalized/baked PNG outputs.
- Persist `sourceKind: 'html' | 'png'` on new records and Firebase metadata.
- Update/edit existing PNG packs by replacing individual layers, changing pivots, or saving a copy.
- Preserve one unified selectable hand library in the property panel.
- Firebase Storage upload/download/delete support for direct PNG sources.
- Backwards compatibility for existing HTML and baked-only hand records.

Out of scope:

- Pixel editing, background removal, or semantic pivot recognition for PNGs.
- Mixed HTML/PNG hand packs in this first release.
- Reworking the existing HTML compiler or hub-ratio system.
- Changing Zepp runtime contracts; ZPK export still uses device-sized PNG assets.

## Canonical Data Model

`CustomHandRecord` gains:

```ts
sourceKind?: 'html' | 'png';
sourceHourPng?: string;
sourceMinutePng?: string;
sourceSecondPng?: string;
sourceHubPng?: string;
```

`source*Png` values are high-quality data URLs in local IndexedDB only. Existing `hourDataUrl`, `minuteDataUrl`, `secondDataUrl`, `coverDataUrl`, and `swatchDataUrl` remain the normalized/baked export and thumbnail assets.

New Firebase `HandStorageMeta` records gain `sourceKind`. `sourcePaths` and `sourceURLs` remain four-layer maps but point to the selected source type. PNG source objects are stored as:

```text
users/{uid}/labAssets/hands/{key}/source_png/hour.png
users/{uid}/labAssets/hands/{key}/source_png/minute.png
users/{uid}/labAssets/hands/{key}/source_png/second.png
users/{uid}/labAssets/hands/{key}/source_png/hub.png
```

Existing HTML objects retain their current paths (`source_hour.html`, etc.) to avoid a migration.

## Behaviour

1. HTML/SVG hand styles remain the existing source mode. Missing `sourceKind` is inferred as `html` when any source HTML exists; otherwise it is treated as legacy baked-only.
2. PNG hand styles require all four PNG layers. The app validates `image/png`, a finite size, and a practical source limit before saving.
3. PNG source images retain their original resolution in IndexedDB and Firebase Storage. They are not destructively reduced to the device bake size.
4. Existing normalization/bake output is generated from the PNG sources using the same fixed export geometry and the user’s pivot/tip-tail settings. The device only receives the resulting final PNG assets because Zepp IMG/TIME_POINTER assets do not have a runtime scale property.
5. The composer preview draws the PNG master at its natural resolution and uses manual pivot placement. Default X is centered; default Y uses the existing stable hand defaults until the user adjusts it.
6. One library remains the source of truth for assigning a hand style to a TIME_POINTER. The pointer editor filters its saved-style grids: HTML editor shows HTML styles; PNG editor shows PNG styles. The property panel shows both with a source-kind badge.
7. Editing routes by `sourceKind`, not by testing whether HTML happens to exist. PNG editing loads master PNGs and geometry, allowing individual replacement, pivot/tip-tail adjustment, update-in-place, or save-as-new.
8. Cloud sync hashes all four source layers and pivot geometry. A minute/second-only replacement must trigger a new upload and metadata update.

## Backward Compatibility

- Existing source-backed records with no `sourceKind` remain HTML records and stay editable in the HTML composer.
- Existing baked-only records remain selectable but are labelled legacy/non-editable.
- Old Firebase Storage paths and metadata remain readable. No bulk migration or user resave is required.
- Deleting a hand style deletes both legacy HTML paths and new PNG-source paths, safely ignoring missing objects.

## Acceptance Criteria

1. A user can upload hour, minute, second, and hub PNGs, set pivots/tip-tail, save a style, and select it in a TIME_POINTER.
2. Saving stores high-resolution masters locally and in Firebase Storage; Firestore contains only metadata and URLs.
3. Reopening a PNG style restores all four masters and the saved pivot/tip-tail values.
4. Replacing only one source PNG and updating the same style refreshes cloud source hash and normalized assets.
5. HTML styles continue loading/editing without manual migration.
6. PNG styles appear only in the PNG composer library; HTML styles appear only in the HTML composer library; both remain selectable from the Property Panel.
7. Generated ZPKs contain the expected hour/minute/second/hub device PNG assets and preserve pointer pivots.

## Closure

All dependency-ordered tasks are complete. TypeScript, the 38-check verifier, Firebase private-environment preflight, and the private production build passed. The canonical private deployment completed successfully, and the root, Studio, and Parametric redirect-query entrypoints served the same production bundle with live JS/CSS assets returning HTTP 200. The implementation preserved the existing HTML/SVG hand workflow, kept PNG masters in owner-scoped Firebase Storage rather than Firestore, and did not modify GAUGE_POINTER storage or rendering paths.
