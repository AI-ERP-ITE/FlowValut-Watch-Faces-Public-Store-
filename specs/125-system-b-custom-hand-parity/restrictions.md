# Restrictions

- No System A source changes.
- No replacement or mutation of the shared custom-hand IndexedDB records.
- No fallback from an unresolved `custom_hand:*` key to a built-in hand.
- No schema-version bump; the added FVWC collection is backward compatible.
- No deployment through a docs-only script.
