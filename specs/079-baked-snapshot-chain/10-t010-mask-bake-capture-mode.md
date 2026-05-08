# 10 - T-010 Mask-Bake Capture Mode

Date: 2026-05-08
Task: T-010 Add optional mask-bake capture mode in snapshot renderer
Status: Done

## Changes
1. Added `bakeMaskIntoSnapshot?: boolean` to `ElementSnapshotCaptureInput`.
2. Updated `sanitizeElementForEngine` to accept options.
3. Kept default behavior (remove mask).
4. Added conditional preserve behavior when bake mode is true.

## Files
1. `engine/snapshot/snapshotRenderer.ts`
