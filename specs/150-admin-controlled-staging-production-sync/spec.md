# Spec 150 — Admin-Controlled Staging-to-Production Synchronization

**Created:** 2026-08-10  
**Status:** Approved for implementation by owner on 2026-08-11; implementation and staged validation in progress  
**Domain:** Private Admin, Firebase Hosting Classic, Firebase Functions, Firestore, Storage, Secret Manager, Paddle Sandbox/Live, private GitHub source control  
**Depends on:** Specs 144, 145, 146, 147, 148, and 149  

## 1. Purpose

Provide FlowVault with a permanent, owner-operated release system inside the private Admin URL. Every successful cloud-staging deployment creates a Sync ID. The owner tests the real deployed staging environment, completes four or five explicit confirmation steps in Admin, and promotes that exact accepted release to production without asking a developer or agent to repeat or manually reconstruct the deployment.

The system promotes an accepted release; it does not maintain a separately rewritten production application. Staging and production use the same source and logic. Only the environment substitutions explicitly defined by this specification may differ.

## 2. Controlling principles

1. Cloud staging at `flowvault-staging-2026` is the functional acceptance environment. Local tests may supplement but never replace owner testing of the deployed staging URL.
2. A production synchronization is authorized only from an immutable Sync ID representing one exact cloud-staging deployment.
3. Any change after staging deployment creates a new Sync ID and requires new staging acceptance.
4. Production is generated from the same frozen source revision and deployment inputs as the accepted staging release. Production code or logic is never manually rewritten.
5. Environment substitutions are controlled by a closed, versioned allowlist. Any unrecognized difference blocks synchronization.
6. Operational state and secret values are never copied between Firebase or Paddle environments.
7. Ordinary website changes are self-service. Protected infrastructure or commerce configuration changes use a separate critical-change workflow.
8. No browser receives deployment credentials, Paddle API keys, webhook secrets, GitHub tokens, Firebase service-account private keys, or Resend API keys.
9. Every operation is authenticated, attributable, idempotent, auditable, resumable where safe, and reversible through a recorded rollback target.
10. Spec 149 gates remain controlling for the initial live launch, DNS cutover, and first real Paddle payment.

## 3. Canonical environment registry

The following mapping is authoritative until changed through the protected-configuration workflow. Ordinary Sync IDs cannot modify it.

| Concern | Staging/test | Production/live | Promotion behavior |
|---|---|---|---|
| Firebase project ID | `flowvault-staging-2026` | `zeppfaceloader-b0b106e9` | Fixed substitution |
| Functions region | `us-central1` | `us-central1` | Fixed invariant |
| Hosting origin | `https://flowvault-staging-2026.web.app` | `https://www.fvwatchfaces.com` | Fixed substitution |
| Functions base URL | Derived from staging project and region | Derived from production project and region | Deterministic substitution |
| Paddle environment | Sandbox | Live/production | Fixed substitution |
| Paddle API origin | `https://sandbox-api.paddle.com` | `https://api.paddle.com` | Fixed substitution |
| Paddle API secret reference | `PADDLE_SANDBOX_API_KEY` | `PADDLE_LIVE_API_KEY` | Secret reference only |
| Paddle webhook secret reference | `PADDLE_SANDBOX_WEBHOOK_SECRET` | `PADDLE_LIVE_WEBHOOK_SECRET` | Secret reference only |
| Paddle webhook Function | `paddleSandboxWebhook` | `paddleLiveWebhook` | Fixed environment endpoint |
| Paddle webhook event | `transaction.completed` | `transaction.completed` | Same behavior, isolated destination |
| Checkout token | Sandbox client token | Live client token | Protected public-config substitution |
| Search indexing | Disabled/noindex | Enabled after live-domain gate | Fixed policy |
| Email mode | Clearly labeled staging/test | Customer-facing production | Fixed policy |
| CORS | Staging and authorized preview origins | Production domain and authorized production previews | Generated from registry |
| Firestore, Storage, Auth | Staging-owned | Production-owned | Never copied |

The registry must exist in one typed, version-controlled deployment-policy source rather than scattered literals. The Admin UI may display the effective values but ordinary release operators cannot edit them.

## 4. Release classes

### 4.1 Ordinary Sync release

An ordinary release may include:

- UI, styling, typography, spacing, responsive behavior, model-preview sizing, copy, legal content, and public assets.
- Storefront route or component changes.
- Shared application and Firebase Functions code.
- Email-template, QR/ZPK, fulfillment, recovery, transfer-limit, security-rule, index, SEO-generation, and monitoring-code changes, provided all required review gates pass.

An ordinary release cannot modify the canonical environment registry, secret values, production project/domain identity, Paddle environment, webhook destination ownership, product/price mappings, or data-isolation policy.

### 4.2 Critical Configuration Change

A protected change receives a separate ID such as `CFG-2026-0003`. This workflow is mandatory for:

- Firebase project, Hosting site, Functions region, database, bucket, or domain changes.
- Paddle environment, API origin, client token, API key reference, webhook destination, or product/price/discount mapping changes.
- Secret creation, replacement, rotation, permissions, or Function bindings.
- Authentication, deployment identities, GitHub credentials, email provider, or DNS changes.
- Changes to data-isolation boundaries, synchronization exclusions, checkout activation, or production feature gates.
- Material fulfillment, payment, security, transfer/recovery policy, or destructive migration changes.

Critical changes require stronger impact review, reauthentication, cloud validation, production preview, and explicit activation. They may never be smuggled into an ordinary Sync ID.

## 5. Sync ID creation

Every successful deployment to the canonical cloud-staging Hosting channel creates exactly one immutable Sync record. A suggested identifier is `FV-YYYY-NNNN`.

The record contains at least:

- Sync ID and status.
- Source repository and exact commit SHA.
- Backend/source dependency commit SHAs where applicable.
- Staging Firebase project and Hosting release ID.
- Staging deployment timestamp and actor/workflow identity.
- Hosting artifact manifest and normalized artifact hash.
- Functions source and deployed-version hashes.
- Firestore rules, Storage rules, and indexes hashes.
- Route count, route manifest, sitemap hash, asset manifest, and security-header policy hash.
- Sanitized environment-policy version.
- Required secret names and configured/missing status, never secret values.
- Paddle Sandbox catalog mapping version.
- Quality-gate results and evidence references.
- Owner acceptance identity and timestamp.
- Production preview and live release IDs when created.
- Previous production release and rollback target.

If creation of the Sync record fails, the staging deployment is visible but not promotable.

## 6. Admin release workflow

The private Admin URL presents one release card per Sync ID and a five-step state machine.

### Step 1 — Test Accepted

Button: **Test Accepted**

The owner confirms testing occurred against the displayed cloud-staging release and URL. The action freezes the candidate. It records the authenticated admin, time, staging release ID, and manifest hashes.

Required UI:

- Staging URL and release ID.
- Source commit and deployment time.
- Concise change summary.
- Confirmation that testing occurred on cloud staging.
- Warning that any new staging deployment creates a replacement Sync ID.

### Step 2 — Run Review Checks

Button: **Run Review Checks**

The trusted backend performs the gates in section 10. Results are stored individually with timestamps, evidence, and deterministic failure codes. The next action remains disabled until all required checks pass.

### Step 3 — Create Live Preview

Button: **Create Live Preview**

The trusted deployment service produces an isolated production Firebase preview from the frozen candidate, applying only registered production substitutions. It does not update the live Hosting channel, DNS, operational data, or take a Paddle payment.

The release card displays the preview URL, expiry, production-substitution report, normalized parity result, and health checks.

### Step 4 — Preview Accepted

Button: **Preview Accepted**

The owner confirms the displayed production preview. Recent reauthentication is required. Acceptance is invalidated if the preview, source commit, deployment policy, protected configuration, or required secrets change.

### Step 5 — Sync to Live

Button: **Sync to Live**

The owner must type `SYNC <Sync ID>` or complete an equivalently strong confirmation. The backend rechecks all immutable identifiers immediately before deployment, acquires a deployment lock, deploys the approved candidate in the specified order, runs post-deploy health checks, and records the result.

The action does not automatically change Namecheap DNS or authorize a first real Paddle payment unless a separately approved critical-change/cutover record explicitly includes that action.

## 7. State machine and concurrency

Required states:

```text
STAGING_DEPLOYED
→ STAGING_ACCEPTED
→ REVIEW_RUNNING
→ REVIEW_PASSED
→ PREVIEW_CREATING
→ PREVIEW_READY
→ PREVIEW_ACCEPTED
→ LIVE_SYNCING
→ LIVE
```

Failure and control states include `REVIEW_FAILED`, `PREVIEW_FAILED`, `LIVE_FAILED`, `SUPERSEDED`, `CANCELED`, and `ROLLED_BACK`.

Rules:

- Only one live synchronization may execute at a time.
- Repeated requests with the same idempotency key return the existing operation.
- A newer staging deployment does not silently change an accepted Sync ID.
- A Sync ID may be marked superseded but its evidence is retained.
- Failed partial deployments must expose the completed stages and safe recovery action.
- Client disconnects or repeated button presses must not start duplicate deployments.

## 8. Promotion and parity rules

Promotion uses the frozen source commit and recorded deployment inputs. It must not use an arbitrary current working tree or mutable local build.

### 8.1 Identical concerns

The following must be logically identical between accepted staging and the production candidate:

- Application and backend source.
- Checkout, webhook validation, fulfillment, email-template, QR/ZPK, recovery, transfer-limit, and repurchase logic.
- UI, content, routes, assets, rules, indexes, CSP policy, security behavior, and monitoring instrumentation.
- Build-tool and dependency lock versions.

### 8.2 Allowlisted substitutions

Only values generated from the canonical environment registry may differ:

- Firebase project identity and public web configuration.
- Project-derived Function URLs.
- Hosting origin and canonical SEO origin.
- Exact authorized CORS origins.
- Paddle Sandbox versus Live environment and API origin.
- Paddle client token.
- Secret Manager reference/binding names and secret versions selected by protected configuration.
- Paddle Sandbox-to-Live catalog mappings.
- Staging versus production email label/origin.
- Search indexing policy.
- Explicit production feature gates.

The comparison engine normalizes these fields to typed placeholders, compares the remaining artifacts, and fails closed on every unexpected difference.

### 8.3 Build handling

Byte identity is required where public configuration is not embedded. Where Firebase public configuration, Paddle client token, canonical origin, or indexing policy must be embedded at build time, staging and production are built deterministically from the same frozen source and compared after allowlisted normalization.

## 9. Permanent synchronization exclusions

No release, ordinary or critical, may copy the following from staging into production:

- Paddle customers, addresses, businesses, transactions, receipts, subscriptions, adjustments, or webhook delivery history.
- Firestore orders, entitlements, tokens, reservations, webhook events, email records, download/transfer/recovery counters, analytics, or authentication users.
- Customer/private Storage objects, generated entitlements, private ZPK deliveries, or customer uploads.
- Sandbox API keys, webhook secrets, credentials, logs, or environment state.

Public application assets and intentionally version-controlled catalog/content definitions may be promoted. Any one-time data migration requires a separate specification with dry-run output, explicit source and target collections, owner approval, backup, reconciliation, and rollback behavior.

## 10. Automated review gates

At minimum, **Run Review Checks** verifies:

1. The Sync ID refers to an existing canonical staging Hosting release.
2. The recorded commit and dependency commits are available in the private source repository.
3. Deployed staging Functions/rules/indexes correspond to the recorded candidate.
4. No uncommitted or later code is substituted for the accepted candidate.
5. Build, type, unit, and repository-defined validation checks pass; these supplement cloud acceptance.
6. Public artifact secret scan passes and source maps/private source are excluded.
7. Production contains no Sandbox Paddle token, key, endpoint, or enabled Sandbox checkout.
8. Staging contains no Live Paddle key, token, endpoint, or enabled Live checkout.
9. All required secret references exist and are accessible to only the intended Functions/service identities.
10. Firestore and Storage rules, indexes, Functions, routes, assets, CSP, headers, and SEO topology match after approved normalization.
11. Canonical URLs, robots policy, sitemap, structured data, direct routes, and invalid-route 404 behavior are correct for the target.
12. Paddle product/price/discount mappings are complete, active, currency/amount-correct, and environment-correct.
13. Production webhook destination and signing-secret identity are independent from Sandbox.
14. The release contains no data-copy operation for permanently excluded resources.
15. Production preview health endpoints and public read models respond successfully.
16. Monitoring, rollback target, deployment permissions, quotas, and deployment lock are ready.
17. Any protected-configuration change has a separately approved critical-change record.

Every failed gate must provide a human-readable explanation without printing secrets.

## 11. Paddle configuration model

Paddle configuration has three classes:

1. Fixed environment behavior: Sandbox for staging, Live for production, with fixed API origins.
2. Secret references: API keys and notification-destination secrets live only in Secret Manager.
3. Protected catalog mappings: stable FlowVault Offer IDs map to separate Sandbox and Live Paddle product, price, and discount IDs.

Example logical mapping:

```text
FlowVault Offer: memento-mori-01
Sandbox Product/Price: pro_... / pri_...
Live Product/Price:    pro_... / pri_...
```

Paddle entity IDs are not derived by string replacement. The protected mapping is versioned, validated against both Paddle environments, and displayed read-only on ordinary Sync cards. Creating or changing a Live mapping is a critical configuration change.

The production webhook is fixed to the project-derived `paddleLiveWebhook` endpoint and subscribes at least to `transaction.completed`. Its secret is generated by Paddle and stored as `PADDLE_LIVE_WEBHOOK_SECRET` without exposure to the browser, logs, source, or Admin responses.

## 12. Secret handling

- Secret values are entered or transferred only through approved secure tooling into Firebase/Google Secret Manager.
- The Admin UI shows secret name, configured/missing state, selected version, last rotation time, and consuming Functions; it never reads or displays secret payloads.
- The existing staging GitHub token may be reused in production pursuant to the owner's explicit risk acceptance, but it remains a Secret Manager value and is bound only to required private-release Functions.
- Secret reuse expands blast radius and must be recorded in the critical-change audit entry.
- Secret values must never appear in Git, Firestore, Hosting artifacts, browser storage, query parameters, deployment logs, or chat transcripts.
- Rotation changes invalidate pending preview acceptance when the affected production behavior could change.

## 13. Admin authorization and backend trust boundary

The Admin page is a control interface only. Deployment runs in a trusted backend or CI identity.

Required protections:

- Firebase Authentication plus a dedicated deployment-admin custom claim/role.
- Server-side claim enforcement on every read and mutation.
- Recent reauthentication for preview acceptance, Live synchronization, rollback, and protected configuration.
- App Check where compatible, CSRF protection, strict origin enforcement, and single-use nonces.
- Least-privilege deployment service identity scoped to the exact projects and resources required.
- No service-account key or GitHub deployment token in frontend code.
- Immutable append-only audit records with actor, action, before/after sanitized state, timestamps, evidence hashes, and outcome.
- Rate limits, deployment lock, idempotency keys, and explicit prevention of concurrent live operations.
- Admin UI must not permit arbitrary shell commands, arbitrary Firebase project IDs, arbitrary deployment paths, arbitrary webhook URLs, or arbitrary secret retrieval.

## 14. Deployment ordering

The exact dependency-aware order is implementation-defined and tested, but it must ensure that public traffic never reaches incompatible backend behavior. A normal sequence is:

1. Revalidate frozen candidate and production configuration.
2. Record current production Hosting and Function rollback versions.
3. Deploy compatible indexes and rules where required.
4. Deploy backward-compatible Functions and verify health.
5. Promote the accepted Hosting preview artifact/configuration to the live channel.
6. Run direct-route, API, security-header, catalog, and webhook health checks.
7. Mark the Sync ID `LIVE` only after all required checks pass.

Schema or behavior changes that are not backward compatible require an expand/migrate/contract plan in a separate specification.

## 15. Rollback

Every Live Sync card exposes **Rollback** when a verified prior release exists. Rollback requires recent reauthentication and typed confirmation.

Rollback may restore Hosting and compatible Function/rule versions. It must not delete customers, orders, Paddle entities, Firestore documents, Storage objects, webhook history, emails, or secrets. Data repair is not implied by code rollback and requires separate reconciliation.

The system retains:

- Previous and current production release IDs.
- Source commits and manifests.
- Deployment logs and health results.
- Rollback attempt and outcome.
- GitHub Pages rollback reference during the Spec 149 stability window.

## 16. Admin user experience

The release dashboard must show:

- Current production release and health.
- Latest staging deployment and its Sync ID.
- Progress indicator for all five steps.
- Enabled/disabled buttons with reasons.
- Change summary and protected-change detection.
- Staging and preview links.
- Quality-gate result list.
- Read-only environment and Paddle mapping summary.
- Secret configured/missing indicators without values.
- Deployment progress, timestamps, actor, and logs safe for display.
- Previous production release and rollback readiness.

The interface must remain safe across refreshes. Long-running jobs continue server-side, and the page reconnects to their recorded status.

## 17. Initial implementation and launch sequence

The approved sequence for introducing this system is:

1. Approve Spec 150.
2. Implement the environment registry, Sync record model, trusted deployment service, Admin workflow, gates, audit log, locking, and rollback support.
3. Deploy the implementation to cloud staging.
4. Test the Admin workflow against real staging deployments and isolated production preview channels, including failure, refresh, duplicate-click, supersession, and rollback simulations. No real payment or DNS change is required.
5. Provision Paddle Live API key, client token, product/price/discount mappings, notification destination, and webhook secret through the protected-configuration workflow.
6. Reuse the approved GitHub token through Secret Manager without exposing it.
7. Run the full review and production preview using the latest owner-accepted staging Sync ID.
8. Complete the remaining Spec 149 launch gates.
9. Stop for explicit owner confirmation before Namecheap DNS changes or the first real Paddle payment.
10. After initial launch acceptance, ordinary future Sync IDs use the self-service five-step workflow without developer/agent involvement.

Paddle Live credentials are therefore not prerequisites for specifying or implementing the core Sync mechanism. They are required before validating Live catalog/webhook readiness, enabling Live checkout, or completing the initial production launch.

## 18. Acceptance criteria

1. Every canonical cloud-staging deployment creates a unique immutable Sync ID visible in Admin.
2. The owner can complete Test Accepted, Run Review Checks, Create Live Preview, Preview Accepted, and Sync to Live without developer intervention.
3. A change after staging acceptance cannot alter or silently reuse the accepted Sync ID.
4. Production uses the same frozen source and logic as the accepted staging release.
5. Normalized parity proves that every difference is explicitly allowlisted.
6. Unknown differences, missing secrets, mixed Paddle environments, incomplete catalog mappings, failed checks, or protected changes block Live synchronization.
7. The environment registry supplies all fixed staging-to-production values without manual entry during ordinary synchronization.
8. Secrets remain exclusively in Secret Manager and never reach the browser or repository.
9. No customer, transaction, order, entitlement, counter, webhook history, Auth user, or private Storage object is copied from staging.
10. Admin authentication, deployment authorization, reauthentication, audit, locking, idempotency, and duplicate-click protection are verified.
11. Production preview creation never changes DNS, the live Hosting channel, or initiates a real Paddle payment.
12. Live synchronization records and verifies a rollback target.
13. Failure at any stage produces a clear safe state and does not falsely mark the Sync ID Live.
14. Critical configuration changes cannot pass through the ordinary Sync workflow.
15. Initial DNS cutover and first Live Paddle payment remain separately owner-confirmed under Spec 149.

## 19. Explicit exclusions

- No arbitrary deployment console or shell in the Admin browser.
- No editing or viewing raw secret values through Admin.
- No automatic DNS changes in an ordinary Sync.
- No automatic first real Paddle transaction.
- No deletion of historical releases, Paddle entities, customers, orders, audit records, or rollback evidence as cleanup.
- No staging-to-production operational data clone.
- No production implementation that diverges from or rewrites accepted staging behavior.

## 20. Open implementation decisions

The implementation plan must resolve these without weakening this contract:

- Trusted deployment runner: dedicated CI workflow, Cloud Build, or narrowly scoped Firebase/Google Cloud service.
- Immutable artifact storage and retention period.
- Exact Admin route and deployment-admin role provisioning.
- Normalized artifact manifest format and signing/attestation mechanism.
- Function/rules/index deployment ordering and rollback granularity.
- Maximum preview lifetime and release-history retention.
- Whether a second human approval is required for protected infrastructure changes after initial launch.

These choices may be decided during planning. The fixed environment identities, isolation rules, five-step owner workflow, closed substitution allowlist, secret boundary, and Spec 149 launch stop gates are not open for reinterpretation.
