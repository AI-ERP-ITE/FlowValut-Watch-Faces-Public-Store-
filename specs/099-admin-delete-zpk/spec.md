# Spec 099 — Admin Delete ZPK

## Goal
Allow admins to delete ZPK entries from the admin page, with the restriction that only ZPKs with status `offline` can be deleted.

## User Flow
1. Admin navigates to the admin page → ZPK list
2. Each ZPK row shows a "Delete" button
3. If ZPK status is NOT `offline` (e.g. `enabled`, `active`, `published`) → button is disabled + tooltip: "Set to Offline before deleting"
4. If ZPK status IS `offline` → button is enabled (red/destructive style)
5. Admin clicks Delete → confirmation dialog: "Delete ZPK '<name>'? This cannot be undone."
6. Admin confirms → delete from Firebase Storage + Firestore document removed
7. Row disappears from list, success toast shown

## Deletion Scope
- **Firebase Storage**: delete the ZPK file at its storage path (e.g. `zpk/<id>.zpk` or whatever path is stored in the Firestore doc)
- **Firestore**: delete the document from the ZPK collection
- Both must succeed; if Storage delete fails (file not found is OK — treat as already deleted), still delete Firestore doc

## UI
- Delete button: red/destructive, small, placed at end of each ZPK row
- Disabled state: grayed out, cursor not-allowed, tooltip explaining why
- Confirmation dialog: simple modal or browser `confirm()` — keep minimal

## Status Check
- Status field on Firestore ZPK doc: check `status === 'offline'` (case-insensitive)
- Any other value (`enabled`, `active`, `published`, `live`, etc.) = locked, cannot delete

## Implementation Notes

### AdminPanel.tsx (or wherever ZPK list is rendered)
- Add delete button per row
- On click: check `zpk.status === 'offline'`, if not → show toast error, return
- Show confirm dialog
- Call `deleteZpkEntry(zpkId, storagePath)` API function

### Firebase API function (new: `deleteZpkEntry`)
- File: `app/src/lib/studioFirebasePublishApi.ts` (or adjacent admin API file)
- Steps:
  1. `deleteObject(storageRef(storage, storagePath))` — ignore 404
  2. `deleteDoc(doc(firestore, 'zpk', zpkId))`

## Constraints
- Only admins can see/use this (already gated by admin auth)
- Never delete if status != 'offline' — enforce on frontend AND treat as invariant (no backend-only enforcement needed for now)
- Storage path must be read from Firestore doc field (not hardcoded)
