# Spec 089 — End-to-End Review Checklist

Use AFTER all tasks complete and post-deploy verification passes.

## Architectural conformance
- [ ] Source HTML stored in Firebase Storage (NOT inlined in Firestore). Confirmed `sourcePath`/`sourceURL` round-trips through `pushSwitcherDefinition`/`pullSwitcherDefinitions`.
- [ ] Per-slot SHA-256 hash short-circuits unchanged uploads (`existing.sourceHash === newHash` skip).
- [ ] Pattern matches existing icon/gauge-pointer Storage flow (`firestoreLabSync.ts`).

## Type safety
- [ ] `RangeSlot.sourceHtml` and `RangeSlot.sourceHash` declared optional → no breaking change for existing slots.
- [ ] `SlotMeta` interface in `imageSwitcherSync.ts` mirrors new fields → Firestore writes/reads typed.

## UI polish
- [ ] Slot row HTML editor collapses by default (only PNG thumbnail + buttons visible) to keep table compact.
- [ ] Iframe preview bounded (max 96×96 px) to avoid pushing layout.
- [ ] Gauge Pointer preview matches Icons-tab visual style (border, bg toggle, zoom).

## Backward compatibility
- [ ] Existing switcher definitions in Firestore (without `sourcePath`) load without errors.
- [ ] PNG-upload-only path unchanged; legacy slots show no "rebake needed" badge.

## Cleanup integrity
- [ ] `deleteSwitcherFromCloud` removes both `.png` AND `.html` per slot.
- [ ] No orphan files left in `users/{uid}/imageSwitchers/{defId}/` after delete.

## Capacity safety
- [ ] 29-slot weather pack Firestore doc < 50 KB (well under 1 MiB).
- [ ] Source HTML files capped only by Firebase Storage quota (not Firestore doc size).

## Security
- [ ] Storage rules confirmed: only owner can read/write `users/{uid}/imageSwitchers/{*}/{rest=**}`.
- [ ] No PAT/token exposure anywhere in new UI.
- [ ] Iframe preview uses `srcdoc` (not `src` to remote URL) — no cross-origin risk.
- [ ] No new Cloud Functions, no new HTTP endpoints, no new authn surface area.

## Deploy hygiene
- [ ] Bundle hash documented in commit message and `ISSUE_LOG.md` resolution note.
- [ ] `CNAME` files unaltered (private deploy doesn't touch them, but verify).
- [ ] Root `index.html` restored to dev shell post-deploy.
- [ ] `git -C app log origin/main` shows the deploy commit at top.

## Issue log integrity
- [ ] ISSUE_LOG.md #14 → ✅ Resolved (with commit hash + bundle hash).
- [ ] ISSUE_LOG.md #15 → ✅ Resolved (with commit hash + bundle hash).
