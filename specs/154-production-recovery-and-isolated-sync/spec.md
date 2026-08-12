# Spec 154 — Production Recovery and Isolated Sync Control Plane

**Created:** 2026-08-12
**Status:** Approved for execution
**Supersedes:** Spec 152 deletion/reset behavior and any interpretation of an exclusion as deletion
**Preserves:** Spec 148 business history, Spec 149 launch/security gates, Spec 150 workflow goals, Spec 151 frozen-release work, and Spec 153 code-only promotion boundary

## Objective

Restore FlowVault production to a complete, end-to-end operational business system containing every previously released face and all required private/public capabilities, while moving the already-built Sync control logic into a new isolated Firebase project so a Sync defect cannot delete or overwrite production business state.

Completion means verified business behavior, not merely successful deployment.

## Non-negotiable outcomes

1. Every previously released watchface is reconciled across its public catalog identity, Offer, SKU, Product Model, technical target/package, preview media, released ZPK, public route and delivery path.
2. Required Admin, Studio, Workshop, Parametric, GitHub bridge, release, catalog, storefront and customer-facing Functions are present and verified.
3. Production Auth, secrets, keys, tokens, webhook secrets, Paddle configuration and existing enabled secret versions are preserved. No secret payload is read, printed, exported, regenerated, rotated or placed in source, logs, commands, browser automation or chat.
4. The existing Sync implementation is preserved as recovery material and moved—not rewritten from scratch—into a new isolated control-plane project.
5. Sync promotes code and approved infrastructure only. It never owns business data, product data, watchface assets, Auth, Paddle state, secrets or private Functions.
6. No deletion is authorized by this specification.
7. DNS changes, Live checkout enablement and real Paddle payments remain separate stopped gates.

## Authoritative topology

### Production business project

`zeppfaceloader-b0b106e9` remains authoritative for:

- released watchfaces, ZPKs, previews and product media;
- product/catalog master data and public read models;
- orders, entitlements, delivery state, metrics and audit history;
- Firebase Auth and production Storage/Firestore;
- Live Paddle mappings and target-owned configuration;
- the `private-admin` Function codebase;
- the `storefront` Function codebase;
- production Hosting and preview/live channels.

### Staging test project

`flowvault-staging-2026` remains an isolated application-test tenant. Its data is not production master data and is never promoted into production.

### New Sync control project

A new Firebase project will contain only:

- Sync controller Functions;
- Sync IDs and state-machine records;
- immutable release metadata and verification evidence;
- operation locks, callbacks and sanitized audit records;
- Cloud Build dispatch/control resources required for promotion.

It must contain no product catalog, watchface, customer, payment or creator data.

## Function ownership

### `private-admin`

Owns Admin, Studio, Workshop, Parametric, creator persistence, GitHub bridge, release-to-store and private maintenance endpoints. It is deployed independently and is never a Sync reconciliation target.

### `storefront`

Owns the customer-facing Public Store backend and commerce/delivery process logic explicitly included in a frozen Public Store release. Sync may deploy this named codebase but may not read or modify its business data or secret payloads.

### `promotion-controller`

Lives in the new Sync project. Owns acceptance, review, preview, locks, dispatch, callback status and rollback orchestration. It is not deployed into the production business project.

### Ownership invariant

Deploying one codebase cannot delete, rename, reconcile or update another codebase. Unknown Functions block an operation; they are never cleanup targets.

## Sync allowlist

Sync may promote only:

- Public Store frontend application code;
- navigation, layout, styling and environment-independent design assets;
- Public Store backend process/business logic;
- production-target Hosting output generated from production's read-only public catalog;
- versioned rules and indexes after explicit validation;
- fixed non-secret target bindings;
- release identity, hashes, attestations, preview state and rollback metadata.

## Absolute Sync exclusions

Sync has no read, write, comparison, import, export, reconciliation or deletion authority over:

- Firestore documents of every collection;
- Storage content objects of every path;
- watchfaces, ZPK/FVWF files, previews and product media;
- Offers, SKUs, products, models, collections, packages and targets;
- Studio, Workshop, Parametric and private Admin data;
- customers, orders, transactions, entitlements, counters, metrics and audits;
- Firebase Auth users;
- Paddle entities, mappings and configuration;
- secret values, keys, tokens and webhook secrets;
- `private-admin` and unknown Function codebases;
- IAM, billing and DNS.

**Permanent rule:** “Excluded from Sync” means outside Sync authority. It can never mean “delete from Firebase.”

## Recovery method

1. Freeze mutation paths and capture current production/staging inventories.
2. Preserve current repositories, deployed release metadata, function inventories, rules/indexes, Hosting versions, Storage metadata and backup metadata.
3. Create a deletion-protected recovery database in the production Google Cloud project.
4. Import the complete Spec 152 backup only into that recovery database.
5. Compare recovery state to current production without exposing document payloads in repository evidence.
6. Reconcile production additively:
   - restore missing records and descendants;
   - preserve newer valid production records;
   - resolve conflicting records through an explicit conflict ledger;
   - never delete an unmatched record.
7. Reconcile every previously released face and its required files/relations.
8. Verify production independently of Sync.
9. Create the new isolated Sync project and copy the preserved Sync implementation into its dedicated codebase.
10. Apply least-privilege IAM and prove forbidden authority is absent.
11. Validate staging → review → production preview without live mutation.
12. Stop before live Sync, DNS or real payment unless separately approved.

The recovery database is forensic staging only. It does not become the live catalog and does not permanently isolate watchfaces from the production store.

## Secret handling

- Existing secret versions remain unchanged.
- Verification reads only secret name, version and enabled state.
- A secret payload is never copied programmatically between projects.
- If a new project requires an existing secret, the owner enters the same value using `scripts/flowvault-secret-entry.ps1` in a visible masked prompt.
- The Sync design must avoid secret-payload dependencies wherever possible.

## Recovery conflict policy

- Missing in production, present in backup: restore.
- Present and byte/logically identical: retain production.
- Present in both with production newer: retain production unless dependency validation proves corruption.
- Present in both with material conflict: record in `findings.md`, stop that record only, and continue independent recovery work.
- Present only in production: preserve.
- No comparison result authorizes deletion.

## Required verification

### Data and files

- Backup operation and recovery-database import complete.
- Root and descendant counts recorded for backup and production.
- All expected Workshop and Parametric records restored.
- All previously released face identities form complete dependency chains.
- Every referenced preview and released ZPK object exists with non-zero size.
- Public catalog APIs expose the expected released faces.

### Functions

- Exact expected names, codebase labels, runtime and ACTIVE state.
- `private-admin`, `storefront` and `promotion-controller` sets are disjoint.
- Private Admin authentication and representative read-only endpoints work.
- Studio/Workshop/Parametric operations pass controlled tests.
- Public Store functions remain compatible with restored data.

### Public Store end to end

- Home, collection, design, model, Offer and buy routes resolve.
- Main/AOD previews load.
- Released ZPK delivery remains protected from direct unauthenticated Storage access.
- Checkout stays disabled until its separate approval.
- Webhook signature rejection, order status and recovery safety checks pass without a real charge.

### Sync isolation

- Frozen Sync implementation is preserved by commit/package hashes.
- New project contains only control-plane resources.
- Runner has no datastore data, Storage-content, secret-payload, Auth-user, Paddle-mutation, IAM or private-function deletion authority.
- Adding an unrelated production Function/data/object does not change Sync output.
- Excluding a resource from a release demonstrably leaves it untouched.
- Preview deploy succeeds without production data mutation.

## Stop conditions

- Any action would delete or broadly overwrite production state.
- A required source/target cannot be identified exactly.
- A secret payload would need to be accessed outside masked owner entry.
- A planned Sync permission could mutate business data or private Functions.
- Released-face reconciliation identifies unresolved broken references.

## Acceptance criteria

1. Production works independently of Sync with all previously released faces.
2. Required private and public Functions are ACTIVE and correctly separated.
3. Admin → Workshop → Release to Store works against production-owned data.
4. Public browsing, previews, ZPK delivery, fulfillment/recovery safety and catalog APIs pass.
5. No secret, Auth, Paddle, DNS or token was changed without a separate explicit gate.
6. The existing Sync implementation operates from a new isolated project.
7. Sync can deploy only code/approved infrastructure and cannot delete or mutate Firebase business state.
8. Every task has measured evidence in `findings.md`.

