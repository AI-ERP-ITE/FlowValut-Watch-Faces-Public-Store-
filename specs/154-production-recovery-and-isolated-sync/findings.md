# Spec 154 Findings and Recovery Ledger

This file is the continuous evidence and decision ledger. Every material discovery, conflict, action and verification is recorded here before it is treated as complete.

## F001 — Incident boundary

Specs 148–151 required history retention, prohibited production data deletion and defined the Public Store release as separate from private Functions. Spec 152 nevertheless deleted 44 Functions and every document/descendant under 14 registered roots. Spec 153 corrected the promotion boundary to code-only but did not complete control-plane project isolation.

**Decision:** Spec 152 deletion/reset semantics are superseded. No cleanup registry is executable under Spec 154.

## F002 — Current function recovery state

On 2026-08-12, 37 required private Admin, Studio, Workshop, Parametric and supporting Functions were restored to production under codebase `private-admin`. A live metadata inventory found all 37 in `ACTIVE` state. The restored primary handler object matches Git object `a0c8b240e0f719fec6e39d274aa42aaafcf19ec8` from baseline commit `aa33d4ed514f8b73bc1f18240ca91abfa2e14c3b`. Seven support modules absent from that incomplete repository snapshot were reconstructed from their first preserved commit `a7234b00b7786d3b6e1804e914ed02b8c9093c5f` without substituting its later Sync handler.

**Boundary evidence:** The recovery package exported exactly 37 approved names. It contained neither `adminDeploymentSync` nor any of the 22 protected Public Store exports. Seven obsolete/Sandbox/PayPal functions remained excluded.

## F003 — Secret state

Production Secret Manager contains `GITHUB_TOKEN` version 1 in `ENABLED` state after owner entry through the masked FlowVault helper. No payload was accessed for verification. Other production secret payloads were not read or changed.

## F004 — Production data state before Spec 154 reconciliation

Read-only production inventory on 2026-08-12 found 165 root documents across the nine public master-data roots and no documents under the Spec 152 reset roots. Production Storage contained 1,542 objects totaling 1,081,700,088 bytes, including 188 release objects and preserved Workshop objects.

The managed backup exists at `gs://flowvault-prod-backup-63546256310/spec152-pre-refresh-20260811`. It contains 13 export objects totaling 3,005,354 bytes and was recorded by Spec 152 as containing 751 documents.

## F005 — Managed export selectivity

The Spec 152 backup is an all-collections export. Firestore rejected collection-filtered import requests with `The requested kinds/namespaces are not available`. No selective import wrote data.

**Decision:** Import the full backup only into a deletion-protected forensic recovery database, compare there, and copy approved/reconciled records additively into production. The recovery database is not the live catalog and does not isolate watchfaces from the store.

## F006 — Final architecture decision

The production business project remains complete and authoritative. Staging remains an isolated test tenant. A new third Firebase project will own the Sync controller and release-control state only. The existing expensive Sync implementation is preserved and moved, not rebuilt from scratch.

**Permanent invariant:** “Excluded from Sync” means outside Sync authority and can never mean deletion from Firebase.

## F007 — Forensic import and reconciliation

The managed export was imported into deletion-protected Firestore database `spec154-recovery-20260811` in production project `zeppfaceloader-b0b106e9`. The import did not target the live `(default)` database. The recovery database contains the preserved export corpus, including the Workshop trees.

A recursive, path-by-path comparison against live production identified 564 missing documents, 188 identical documents and zero conflicting documents. Public catalog/master-data documents already present in production were identical to the backup. The exact machine-readable evidence is `reconciliation-report.json`.

## F008 — Creator and Workshop recovery

The additive-only creator recovery selected 148 documents under `workshopProjects`, `userParametricLibraries`, `userParametricProgress` and `userParametricThemes`. It created only paths absent from live production, did not overwrite any existing document and performed no deletions. A subsequent idempotent verification pass returned `selected: 148`, `alreadyPresent: 148`, `restored: 0`, proving all selected documents are now present.

## F009 — Commerce quarantine remains enforced

The recovery database also contains 54 missing operational records across orders, entitlements, download metrics/tokens, SKU entitlements and webhook idempotency. The preserved recovery instruction explicitly excluded these categories. They remain quarantined and were not imported. This does not affect the restored public catalog or Workshop trees.

## F010 — Existing Sync implementation preserved

The current Sync controller, runner scripts, Admin panel client and deployment configuration were captured by SHA-256 in `sync-preservation-manifest.md` before isolated-project materialization. No Sync source file was edited during capture, and no secret payload is included.

## F011 — Isolated Sync Firebase project created

Firebase project `flowvault-sync-control-154` was created with display name `FlowVault Sync Control` and project number `1038064898672`. Creation did not modify production project `zeppfaceloader-b0b106e9` or staging project `flowvault-staging-2026`.

## F012 — Sync deployment gate: embedded staging audience

Read-only dependency inspection found `promotionCallbackAudience` hard-coded in the preserved controller to `https://us-central1-flowvault-staging-2026.cloudfunctions.net/adminDeploymentSync`. Deploying that unchanged in `flowvault-sync-control-154` would leave callback authentication bound to staging and would not be an end-to-end working isolated controller. Changing it is a Sync source change and conflicts with the explicit freeze.

**Decision:** Do not deploy a knowingly broken controller. The new project remains empty of business functions/data while the exact preserved implementation and this one required relocation decision are retained for approval. Production recovery continues independently.

## F013 — Live function and catalog verification

A fresh production inventory returned 59 Functions and all 59 are `ACTIVE`: 37 carry codebase `private-admin`, while the remaining 22 are the protected public-store surface. `adminDeploymentSync` is absent, proving Sync is not mixed into production. The live `publicCatalog` endpoint responded successfully with 38 released entries.

## F014 — Approved callback relocation validated

The approved single Sync logic relocation changed `promotionCallbackAudience` from the staging function URL to `https://us-central1-flowvault-sync-control-154.cloudfunctions.net/adminDeploymentSync`. The complete Functions test suite passed 77/77. The isolation builder exported exactly `adminDeploymentSync` and passed its unrelated-function and secret-value contamination checks. Post-change hashes are: source entry `ee0343f29fd752e8fa080da79e9701ca040d2b1d66a0dfeb1424040d5b2f122e`; isolated bundle `959cd232e1ed73dbfbd68028d2d83cae55ff317f38debfBAF29c11804781b038` (case-insensitive SHA-256).

## F015 — Authentication and client-routing deployment gate

The existing Admin client authenticates against `flowvault-staging-2026` and routes both `adminVipPromoCodes` and `adminDeploymentSync` to the staging Functions origin. The isolated controller uses `getAuth().verifyIdToken`, which validates only tokens issued for its runtime Firebase project. Therefore a staging token cannot operate the isolated controller, even with the correct UID/claim. Deploying before separating the client route and establishing owner Auth/claim in the control project would create an unreachable controller.

**Decision:** Preserve strong authentication and stop before deployment. Do not copy a token, accept a foreign-project token, or weaken verification. Required next approval is limited to control-project Firebase Auth setup plus Admin-client routing of `adminDeploymentSync` only; staging commerce authentication and `adminVipPromoCodes` remain unchanged.

## F016 — Isolated Auth/client separation implemented

Firebase Auth was initialized in `flowvault-sync-control-154`. Web app `FlowVault Sync Admin` is `ACTIVE` with app ID `1:1038064898672:web:fd11e84f024d9136e21ab5`; its SDK configuration is public Firebase metadata and no secret was copied. The Admin client now maintains a separate named Firebase app/Auth session for Sync Control, sends only `adminDeploymentSync` to the control-project Functions origin, and leaves staging commerce plus `adminVipPromoCodes` on `flowvault-staging-2026`. The production application build completed successfully.

Google provider enablement is not yet saved: Firebase Console reports that the signed-in account lacks provider-management permission even though an independent IAM read confirms `aihossny@gmail.com` has `roles/owner`. No weaker sign-in provider or foreign-project token acceptance was substituted.

## F017 — Billing deployment gate

The new control project is on Firebase Spark. Cloud Functions deployment requires linking a billing account/upgrading the project to Blaze. This is a billing-bearing external change and is not performed implicitly. Until explicitly approved, the tested single-function bundle remains undeployed and production/staging remain unchanged.

## F018 — Isolated controller deployed and access boundary verified

Billing is enabled on `flowvault-sync-control-154`, Google sign-in is enabled, and the deletion-protected `(default)` Firestore database exists in `nam5`. Cloud Functions bootstrap required enabling the project-local Firestore and Compute APIs plus granting its Cloud Functions service agent `roles/artifactregistry.reader`; no production/staging resource was changed by those bootstrap actions.

`adminDeploymentSync` is deployed as the only Function in the control project. It is `ACTIVE`, Node.js 22, codebase `promotion-controller`, deployment hash `05c03838628ca8c9d285bb019b1f05ff837d610f`, with zero secret bindings. A request without a bearer token returns HTTP 401 `Missing bearer token`.

The preserved dispatch implementation next requires its runtime identity `flowvault-sync-control-154@appspot.gserviceaccount.com` to submit builds in production and act as the two existing runner identities. The attempted IAM command was rejected before any policy mutation because this is a cross-project privilege grant. Exact proposed grants awaiting explicit approval:

- production project: `roles/cloudbuild.builds.editor` to the control runtime;
- production review runner: `roles/iam.serviceAccountUser` to the control runtime;
- production deploy runner: `roles/iam.serviceAccountUser` to the control runtime.

No data-access, Storage-access, Secret Manager, Auth-admin, Paddle, owner or editor role is proposed.

## F019 — Approved runner IAM and private Admin deployment

The three explicitly approved grants are applied:

- control runtime has `roles/cloudbuild.builds.editor` on production;
- control runtime has `roles/iam.serviceAccountUser` on `flowvault-review-auditor`;
- control runtime has `roles/iam.serviceAccountUser` on `flowvault-deploy-runner`.

No broader production role was added. The private Admin bundle was built and pushed through its established GitHub Pages workflow at commit `9f8bd0f1`, bundle `index-CC_JaUzD.js`. Live read-back verified that the bundle contains the control-project ID/function origin and still contains the staging origin used by staging VIP/commerce. The private Admin domain `ai-erp-ite.github.io` is authorized in control-project Firebase Auth.

The first project-local Google sign-in is awaiting an owner click in the visible account chooser. The `launchController` custom claim cannot be applied until that sign-in creates the Auth user record.

## F020 — Canonical private Pages deployment verified

The private Admin/Studio bundle was rebuilt and deployed with the canonical `npm run deploy:full:private` workflow. Verification passed 57/57. Origin `main` is commit `768db5a4495f99ead78a7fb3422d07e7ade2c620`; the public remote was not touched and remains at `dd4a62a0a42fe8a53c385efd2135838db2f96067`. Live private routes, SPA redirect routes, and the standalone editable-watchfaces entrypoint return HTTP 200 with hashed production assets and no `/src/main.tsx` reference. The deployed private bundle is `index-4o7h_ghN.js`; System B is `index-CZEDKuxZ.js`.

## F021 — Private Function transport restored; owner authorization still gated

All 37 Functions labelled with codebase `private-admin` were missing their Gen 1 `roles/cloudfunctions.invoker` binding after restoration. With explicit owner approval, `allUsers` transport invocation was restored on exactly those 37 functions. This does not bypass application authorization: the preserved handlers still verify Firebase ID tokens and require `admin=true` or an exact `ADMIN_UIDS`/`ADMIN_EMAILS` allowlist match. Independent IAM verification passed 37/37, and the `workshopList` preflight from `https://ai-erp-ite.github.io` now returns HTTP 204 with the expected origin, methods and authorization headers.

An authenticated live Admin request now reaches the handler but returns HTTP 403 `Forbidden: admin access required`. Deployment metadata confirms the restored functions have neither `ADMIN_UIDS` nor `ADMIN_EMAILS`; legacy Runtime Config contains no Admin allowlist key. The recovery record also contains no preserved UID/email value. No guessed identity, replacement secret, weakened check, or unauthorized Firebase Auth mutation was introduced. Exact owner authorization remains the final gate before data-backed Admin acceptance testing.

## F022 — Production owner authorization and Admin acceptance complete

The production Firebase Auth inventory contains exactly one enabled user. With explicit owner approval, the existing user's custom claims were preserved and `admin: true` was added; no API key, password, refresh token, secret, UID, email, webhook configuration or Sync setting was changed. The claim was re-read through Identity Toolkit and verified true. The browser session was signed out and back in through the application's normal Google/Firebase flow so a fresh ID token contained the restored claim.

Live non-destructive Admin acceptance then passed:

- Workshop loaded 14 projects with their build counts and stored sizes.
- Catalog loaded 38 watchface entries (39 selector options including the no-override choice).
- Admin SKU lifecycle loaded 24 rows.
- Download analytics completed without an authorization or transport error and currently returned zero metric rows.
- Storage Maintenance dry-run completed with 648 managed objects / 781.8 MB and zero possible orphans / 0 B.

No upload, save, patch, release, lifecycle mutation, delete, permanent-delete, migration apply, QR regeneration or Sync control was invoked during acceptance.

## F023 — Complete Admin feature-contract review and final missing endpoint

A post-recovery review compared every endpoint referenced by the current Admin, Studio, Workshop, Parametric, GitHub bridge and user-library clients against the live production inventory. The contract contained 38 private endpoints; 37 were present. The sole missing endpoint was `adminPaddleCatalog`, which Spec 152 explicitly deleted and the current Release Wizard still invokes for its visible Paddle Sandbox status/sync/reconcile/archive and dry-run controls. This proves the function is required by the current Admin surface and satisfies the earlier gate that Sandbox-payment functions remain excluded unless separately proven necessary.

The exact preserved implementation was restored as only `private-admin:adminPaddleCatalog`, Node.js 20. The complete backend suite passed 77/77 before deployment. The existing enabled `PADDLE_SANDBOX_API_KEY` Secret Manager version 2 was bound without reading, regenerating or changing its payload. No other Function, Hosting target, rule, data, public-store surface or Sync controller was deployed. Post-deploy metadata shows `ACTIVE`, codebase `private-admin`, Node.js 20, the expected secret name/version, and the standard `allUsers` transport invoker binding while Firebase Admin authorization remains enforced. CORS preflight from the private GitHub Pages origin returns HTTP 204 with `GET,POST,OPTIONS` and authorization headers.

The final non-destructive Admin review passed with no authorization error: 14 Workshop projects, 38 catalog entries, hierarchy/SKU rows loaded, all 14 project-delete controls disabled while builds remain, and Storage dry-run completed with 648 managed objects / 781.8 MB / zero possible orphans. Write, release, lifecycle, archive, deletion, upload, patch, QR regeneration and Sync actions were not executed.

## Action ledger

| Time | Action | Mutation | Result |
|---|---|---:|---|
| 2026-08-12 | Restored isolated `private-admin` codebase | Yes | 37/37 Functions ACTIVE |
| 2026-08-12 | Selective import attempts against all-collections backup | No data written | Rejected safely before import |
| 2026-08-12 | Created Spec 154 | Repository only | Recovery/isolation contract established |
| 2026-08-12 | Created deletion-protected forensic database and imported managed backup | Forensic database only | Backup corpus available without touching live `(default)` |
| 2026-08-12 | Compared forensic backup recursively with live production | Read-only | 564 missing, 188 identical, 0 conflicts |
| 2026-08-12 | Restored Workshop and Parametric creator records additively | Yes | 148/148 selected documents verified present; no overwrite/delete |
| 2026-08-12 | Attempted operational recovery authorization check | No data written | Blocked because preserved instruction excludes commerce records; 54 remain quarantined |
| 2026-08-12 | Captured current Sync implementation hashes | Repository only | Exact pre-isolation manifest recorded; secret payloads excluded |
| 2026-08-12 | Created isolated Sync Firebase project | New control project only | `flowvault-sync-control-154` / `1038064898672` |
| 2026-08-12 | Inspected isolated controller dependencies | Read-only | Deployment gated by hard-coded staging callback audience; no broken deployment performed |
| 2026-08-12 | Verified live production Functions and catalog endpoint | Read-only | 59/59 ACTIVE; 37 private + 22 public; 0 Sync; 38 catalog entries returned |
| 2026-08-12 | Applied approved Sync callback audience relocation | Repository only | 77/77 tests pass; isolated export and contamination gates pass |
| 2026-08-12 | Inspected Admin authentication/client routing | Read-only | Foreign-project token incompatibility found; deployment paused before unreachable release |
| 2026-08-12 | Registered isolated Sync Admin web app and initialized Auth | Control project only | Project-owned public SDK configuration created; no secret copied |
| 2026-08-12 | Separated Sync client authentication and routing | Repository only | App build passes; staging commerce route/auth unchanged |
| 2026-08-12 | Verified owner IAM and deployment plan gate | Read-only | Owner role present; Console provider UI inconsistent; Spark plan blocks Functions deployment |
| 2026-08-12 | Enabled Google sign-in and created deletion-protected control Firestore | Control project only | Provider enabled; metadata-only database ready in `nam5` |
| 2026-08-12 | Deployed isolated promotion controller | Control project only | Exactly 1 Function ACTIVE; unauthenticated request rejected with HTTP 401 |
| 2026-08-12 | Attempted runner IAM authorization | No IAM change | Blocked pending explicit cross-project privilege approval |
| 2026-08-12 | Applied three explicitly approved runner grants | Production IAM only | Build submission plus act-as on two named runners; no broader role |
| 2026-08-12 | Deployed private Admin Sync routing | Private GitHub Pages only | Commit `9f8bd0f1`; bundle `index-CC_JaUzD.js` verified live |
| 2026-08-12 | Deployed canonical private Admin/Studio bundle | Private GitHub Pages only | Commit `768db5a4495f99ead78a7fb3422d07e7ade2c620`; 57/57 checks; public remote untouched |
| 2026-08-12 | Restored private Function invoker transport | Production IAM only | Exactly 37/37 `private-admin` functions verified; CORS preflight HTTP 204 |
| 2026-08-12 | Tested authenticated Workshop read | Read-only | Handler reached; HTTP 403 because no preserved Admin claim/allowlist is active |
| 2026-08-12 | Restored sole production owner's Admin claim | Firebase Auth claim only | Existing claims preserved; `admin: true` independently verified |
| 2026-08-12 | Ran non-destructive Admin acceptance | Read-only | Workshop 14; catalog 38; SKUs 24; analytics completed; Storage dry-run 648 objects / 781.8 MB / 0 orphans |
| 2026-08-12 | Audited complete private frontend/function contract | Read-only | 37/38 present; only `adminPaddleCatalog` missing and proven required by current Release Wizard |
| 2026-08-12 | Restored `adminPaddleCatalog` | Production Function only | ACTIVE; Node.js 20; existing Sandbox secret v2; CORS/IAM verified; total private contract 38/38 |
| 2026-08-12 | Re-ran quick Admin feature review | Read-only | No auth errors; Workshop/catalog/hierarchy/Storage passed; destructive and Sync controls not invoked |
