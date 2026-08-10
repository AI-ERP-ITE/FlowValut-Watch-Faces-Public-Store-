# Spec 149 — Dependency-Ordered Tasks

## Phase 0 — Audit only

- [x] T001 Capture status reports for root, app, and public artifact repositories without modifying owner files. Worktrees are dirty and require explicit-path commits.
- [x] T002 Inventory staging and production Firebase resources.
- [x] T003 Inventory environment-variable and secret **names/prefixes only**; never print values. Plain local assignment removed and dependent Functions bound to Secret Manager; credential rotation/replacement remains a production cutover gate.
- [ ] T004 Inventory Paddle Sandbox/Live catalogs, webhooks, and domain state read-only.
- [ ] T005 Export current Namecheap web/mail DNS and GitHub Pages rollback values.
- [x] T006 Audit Spec 148 implementation and deployment gaps against local source, deployed Function names, and 65 passing backend tests; Sandbox evidence remains pending.
- [x] T007 Record current live/staging configuration, live DNS/headers/routes, baseline bundle sizes, and previously observed checkout/fulfillment timings. Independent staging TLS/header recheck remains in acceptance.

## Phase 1 — Contract

- [x] T010 Owner approves Spec 149 (2026-08-10).
- [ ] T011 Resolve any open architecture or policy decisions.
- [ ] T012 Commit Spec 149/docs only to private `origin`.

## Phase 2 — Environment isolation

- [x] T013 Generate sanitized full-platform parity manifest: Functions, Firestore, Storage, Auth, rules, indexes, secrets, Hosting, Paddle and Resend.
- [x] T014 Classify every difference as environment substitution, approved change, accidental divergence, or missing clone surface.
- [x] T015 Restore every missing baseline Function surface required by the current platform; cloned data remains isolated staging state.
- [x] T016 Normalize all staging Functions through one canonical environment configuration and explicit deployment manifest.
- [x] T017 Prove the staging Function runtime has no unexplained missing/extra surface before commerce acceptance.

- [x] T020 Add immutable deployment identity to orders and Paddle custom data.
- [x] T021 Enforce runtime Firebase project and FlowVault environment guards.
- [x] T022 Enforce Paddle API/token prefix and base URL guards.
- [x] T023 Ignore verified foreign-project webhooks without mutations.
- [x] T024 Fail local malformed/missing-order events without acknowledging success.
- [ ] T025 Add catalog-sync, fulfillment, email, recovery, and counter isolation tests.
- [x] T026 Prove staging purchases do not change production state. The accepted staging order is absent from production Firestore and the automated Firebase/Paddle separation gate passes.

## Phase 3 — ZPK security and rules

- [x] T030 Replace unconditional public ZPK Storage reads.
- [x] T031 Implement short-lived order-bound delivery for browser and QR.
- [x] T032 Preserve Spec 146 total download/regeneration limits.
- [ ] T033 Add Storage and Firestore rule tests.
- [ ] T034 Run red-team rules audit and achieve approved score/no critical findings.
- [ ] T035 Prove direct read fails and entitled browser/Zepp delivery succeeds. Direct anonymous paid-object read fails and entitled browser ZPK delivery succeeds; physical Zepp QR installation remains owner-device acceptance.

## Phase 4 — Spec 148 staging completion

- [ ] T040 Complete all unchecked Spec 148 implementation tasks.
- [x] T041 Run all Spec 148 unit/concurrency/security tests (66 backend tests passing).
- [x] T042 Deploy targeted staging Functions/rules only.
- [ ] T043 Execute all Spec 148 Sandbox cases.
- [ ] T044 Verify no stacking and single completed redemption.
- [ ] T045 Keep live VIP generation disabled.

## Phase 5 — Hosting and security headers

- [x] T050 Create explicit production Firebase Hosting configuration.
- [x] T051 Preserve staging noindex and remove it only from production configuration.
- [x] T052 Configure HTML/metadata versus fingerprinted-asset caching.
- [x] T053 Build complete CSP allowlist from observed requirements.
- [ ] T054 Test CSP report-only violations.
- [x] T055 Enforce CSP and verify Paddle/Firebase/images/fonts/downloads. The stable staging URL is Paddle-Sandbox-approved and the successful checkout/download path passed under the enforced CSP.
- [ ] T056 Add HSTS after custom-domain HTTPS readiness.

## Phase 6 — SEO and performance

- [x] T060 Add route-specific metadata contracts.
- [x] T061 Generate Product structured data (breadcrumb refinement remains optional).
- [x] T062 Generate current sitemap and robots during build/release.
- [x] T063 Prerender all indexable storefront routes.
- [x] T064 Implement invalid-route/soft-404 prevention. Valid routes are prerendered, `/success/**` is the only dynamic SPA rewrite, `/store` redirects to `/`, and unknown staging URLs return HTTP 404.
- [x] T065 Add route-level code splitting.
- [x] T066 Add bundle boundary and size regression checks. The staging artifact passes explicit largest-JS, total-JS, and largest-CSS ceilings.
- [x] T067 Verify no private route/module/source enters public artifacts. Public reads were split from the Admin/Studio Firebase-auth module; credential/private API markers are absent, and the only `/admin` text is the intentional robots denial.

## Phase 7 — Monitoring and cost controls

- [ ] T070 Add public health and commerce observability.
- [ ] T071 Add webhook, fulfillment, email, QR/ZPK and cross-project metrics/logging.
- [x] T072 Document and configure staging budget alerts. Native Google Cloud budget `FlowVault Staging Monthly 10 USD` is scoped to `flowvault-staging-2026`, alerts at 50%, 90%, and 100% of actual spend, and links the `FlowVault Operations Budget Alerts` email channel for `operations@fvwatchfaces.com`.
- [ ] T073 Document and configure production budget alerts.
- [x] T074 Confirm alerts do not automatically disable paid fulfillment. The budget is configured as alerts-only; no spend-cap enforcement or automatic billing shutdown is enabled.

## Phase 8 — Preview validation

- [x] T080 Deploy immutable staging candidate to preview channel (`spec149-launch`, expires 2026-08-17).
- [ ] T081 Run full static/security/browser test matrix.
- [ ] T082 Run successful and declined Sandbox checkouts. Successful $4.00 localized checkout passed; declined-card case remains.
- [ ] T083 Verify webhook, email, QR, ZPK, limits, counters, refresh idempotency and recovery. Webhook, email Function, ZPK, and one-transfer counter passed; inbox receipt, physical QR, refresh UI, limits, and recovery remain.
- [ ] T084 Run cross-project negative tests.
- [ ] T085 Deploy exact production candidate to production preview channel.
- [ ] T086 Open live Paddle Checkout without taking payment.
- [ ] T087 Obtain owner go/no-go approval.

## Phase 9 — Git and release preservation

- [ ] T090 Create separated implementation commits with explicit staged paths.
- [ ] T091 Run staged-content secret scan before each commit.
- [ ] T092 Push only to private `origin` and record commit hashes.
- [ ] T093 Record current GitHub Pages release and DNS rollback values.
- [ ] T094 Freeze, but do not delete, the public GitHub Pages artifact.

## Phase 10 — Domain and Paddle cutover

- [ ] T100 Add production Firebase custom domain.
- [ ] T101 Verify Firebase-provided DNS records and SSL readiness.
- [ ] T102 Export Namecheap zone and preserve mail records.
- [ ] T103 Promote accepted Firebase candidate to live.
- [ ] T104 Replace only GitHub web DNS records with Firebase-provided records.
- [ ] T105 Verify multi-resolver DNS, HTTPS, canonical redirects and routes.
- [ ] T106 Update/verify Paddle Live approved/default payment link.
- [ ] T107 Verify production webhook destination and signing secret isolation.
- [ ] T108 Run immediate smoke tests.

## Phase 11 — Controlled live acceptance and stability

- [ ] T110 Run one owner-authorized live purchase when Paddle permits.
- [ ] T111 Verify Paddle invoice and FlowVault email.
- [ ] T112 Verify QR, ZPK, limits, counters and refresh idempotency.
- [ ] T113 Monitor errors, latency, webhooks and fulfillment.
- [ ] T114 Keep GitHub rollback for at least 30 days.
- [ ] T115 Obtain separate owner approval before any rollback retirement.
