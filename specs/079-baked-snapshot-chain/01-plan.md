# 01 - Plan

## Goal
Add a dedicated baked snapshot chain workflow:
1. Snapshot captures current visible silhouette.
2. New layer is created from that baked snapshot.
3. New layer carries no editable mask history and no effect stack overlays.

## Scope
1. Add capture option to include current mask when requested.
2. Add editor action: Snapshot -> New Baked Layer.
3. Ensure new baked layer is snapshot-source-only and mask-clean.
4. Add focused tests for snapshot sanitize behavior.

## Non-goals
1. Remove existing snapshot render source flow.
2. Rewrite layer model or storage format.
3. Change export protocol.
