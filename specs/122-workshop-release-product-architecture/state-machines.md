# Spec 122 — State Machines

## Workshop Build

```text
Create Watch Test
        ↓
     TESTING ─────────────→ TRASHED
        │                     │
        │ Mark Approved       │ Restore
        ↓                     ↓
     APPROVED ─────────────→ previous valid state
        │
        │ successful release
        ↓
     PROMOTED
```

Rules:

- APPROVED/PROMOTED builds are immutable snapshots.
- A PROMOTED build cannot be permanently deleted while referenced.
- Restoring returns to the recorded valid previous state.

## Store Product/SKU

```text
DRAFT → READY → LIVE ⇄ OFFLINE → ARCHIVED
  ↑       │       │        │
  └───────┴──── edit/revalidate ────┘
```

Rules:

- DRAFT may be incomplete and is never public.
- READY is complete and validated but not public.
- LIVE requires at least one current compatible Technical Package and active Offer.
- OFFLINE retains all data, packages, entitlements, and history.
- ARCHIVED is retired and is not hard-deleted when orders or packages reference it.

## Technical Package

```text
BUILDING → VALIDATING → READY → CURRENT → SUPERSEDED
                │          │         │
                └→ FAILED  └─────────┴→ TRASHED (only if unreferenced)
```

Rules:

- Only a verified package becomes READY.
- At most one CURRENT package exists per SKU + Technical Target.
- Promoting a new revision makes the old CURRENT package SUPERSEDED.
- Purchased/current/audit-required packages cannot be permanently deleted.

## Administrative actions

### Take Offline

Changes only public availability. It is not deletion and must never be labeled soft delete.

### Move to Trash

Records previous state and deletion metadata. No object or document is removed.

### Restore

Validates dependencies, restores previous state, and clears active trash markers while retaining audit history.

### Delete Permanently

Allowed only for eligible TRASHED records after typed confirmation and server-side dependency checks. Firestore deletion occurs only after every expected Storage deletion succeeds or is explicitly confirmed already absent.

