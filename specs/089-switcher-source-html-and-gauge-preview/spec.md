# Spec 089 — Image Switcher Source-HTML Roundtrip + Gauge Pointer Live Preview

**Status:** APPROVED (in-flight implementation)
**Predecessor:** Spec 088 (defined `RangeSlot.source: StorageRef` but UI + sync wiring incomplete)
**Linked Issues:** ISSUE_LOG #14, #15

---

## Problem

1. **Issue #14 — Gauge Pointer tab in IconLab has no live preview.** User pastes SVG/HTML and clicks "Save Gauge Pointer" blind. The Icons tab already provides a live iframe preview with zoom + dark/light bg toggle — pattern exists, gauge-pointer tab missing it.

2. **Issue #15 — Image Switcher slots are PNG-upload-only.** No HTML/SVG paste path, no bake-to-PNG workflow, no source preservation. Slots cannot round-trip a "source HTML → baked PNG" pair like icons and gauge pointers already can. Spec 088 defined the type field (`RangeSlot.source: StorageRef`) but `imageSwitcherSync.ts` push/pull and `ImageSwitcherSlotRow.tsx` UI never used it.

## Goals

- Image-switcher slots support TWO entry modes: (a) direct PNG upload (existing) OR (b) paste HTML/SVG → live preview → bake → PNG. Source HTML is persisted to Firebase Storage per slot (NOT inlined in Firestore — see capacity analysis below).
- Source HTML survives full IDB → Firestore → Storage roundtrip on a fresh device sign-in.
- Gauge Pointer tab gains an iframe live preview matching the Icons tab pattern.
- Zero regressions: existing PNG-only slots continue to work unchanged.

## Non-Goals

- Server-side rendering of HTML→PNG (browser canvas remains the bake engine).
- New Cloud Functions (none required — verified `firebaseStorageClient.ts` runs Storage SDK directly client-side; storage rules already grant `users/{uid}/imageSwitchers/{defId}/{rest=**}` recursive owner-write).
- Storefront / public-bucket exposure of switcher source HTML (private only).

## Capacity Analysis (justifies Storage-not-Firestore choice)

A weather pack has 29 slots. If each slot inlined source HTML into the Firestore doc:

| HTML size per slot | 29 slots total | Within 1 MiB Firestore doc limit? |
|--------------------|---------------:|:----------------------------------|
| 3 KB (typical) | ~87 KB | ✅ safe |
| 50 KB (bloated SVG paths) | ~1.45 MB | ❌ doc rejected |

→ Use the same per-file Storage upload pattern that icons/gauge-pointers already use (`sourcePath` + `sourceURL` + `sourceHash` in Firestore meta only, ~400 B per slot). 29 slots = ~12 KB doc = 1% of limit. Scales to hundreds of slots.

## Architecture (matches Spec 088 Phase A pattern)

- **Storage layout:** `users/{uid}/imageSwitchers/{defId}/slot_{i}.{html|png}`
- **Firestore meta per slot:** `{ slotIndex, label, code?, min?, max?, sourcePath?, sourceURL?, sourceHash?, bakedPath?, bakedDownloadURL?, bakedHash?, bakedVersion? }`
- **In-memory `RangeSlot` (extension):** `{…existing, sourceHtml?: string, sourceHash?: string }` — `sourceHtml` is the editable truth; `dataUrl` + `baked` is the rendered cache.
- **Stale-detection:** when `sha256(sourceHtml) !== sourceHash`, surface a "rebake needed" hint in UI.

## Compatibility

- Slots without `sourceHtml` behave exactly as today (PNG-upload-only path untouched).
- Existing Firestore docs are forward-compat: pull treats missing `sourceURL` as undefined and continues.
- IDB schema unchanged (full structured-clone of `ImageSwitcherDefinition`; new optional fields persist automatically).
- Storage rules unchanged (recursive `{rest=**}` already covers new HTML files).

## Acceptance

- 29-slot weather switcher save→reload round-trips both PNG and HTML on a different device.
- Pasting bad HTML in switcher row shows preview error gracefully (no crash, no blank PNG saved).
- Gauge Pointer tab iframe preview updates within 300 ms of typing (matches Icons-tab debounce).
- `npm run lint` and `tsc --noEmit` pass.
- Private deploy `npm run deploy:full:private` succeeds; `https://ai-erp-ite.github.io/Watch-Faces/?p=/studio/lab` loads new bundle hash.
