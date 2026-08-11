# Spec 149 — Firebase Production Hosting Migration & Live Launch

**Created:** 2026-08-09  
**Status:** Approved 2026-08-10 — Phase 0 audit in progress; production cutover remains gated  
**Domain:** Public storefront, Firebase Hosting Classic, Firebase commerce backend, Paddle, Namecheap DNS, Resend, private GitHub source control  
**Depends on:** Specs 144, 145, 146, 147, and 148  

## 1. Purpose

Move the customer-facing FlowVault store at `https://www.fvwatchfaces.com` from GitHub Pages to Firebase Hosting Classic without exposing source code, crossing staging and production data, interrupting fulfillment, weakening security, losing SEO, or removing the ability to roll back.

This specification is the controlling contract for the migration. No production DNS, Paddle live setting, Firebase live release, GitHub Pages retirement, secret, database, Storage rule, or webhook change may occur outside its ordered gates.

## 2. Non-negotiable outcomes

1. `www.fvwatchfaces.com` and the approved apex-domain behavior are served by Firebase Hosting under the production Firebase project.
2. The private GitHub repository remains private and authoritative for source; Firebase receives only an allowlisted compiled public artifact.
3. Staging and production use separate Firebase projects, databases, buckets, Functions, Hosting releases, secrets, orders, entitlements, download counters, emails, and webhook destinations.
4. Staging uses Paddle Sandbox only. Production uses Paddle Live only. No missing environment value may silently select either account.
5. Checkout, verified payment, fulfillment email, QR installation, ZPK download, recovery, download limits, and store download counts continue end to end.
6. Public ZPKs cannot be fetched by unauthenticated direct Storage object access outside the approved entitlement path.
7. Production is deployed to a preview channel and accepted before the live channel or DNS is changed.
8. GitHub Pages remains a recoverable rollback artifact during the stability window.
9. SEO routes, metadata, sitemap, structured data, and invalid-route behavior are verified before cutover.
10. Every deploy and commit is explicit, reproducible, attributable, and environment-scoped.

## 3. Canonical environment topology

| Concern | Isolated staging | Production/live |
|---|---|---|
| Firebase project | `flowvault-staging-2026` | `zeppfaceloader-b0b106e9` |
| Hosting | `flowvault-staging-2026.web.app` plus preview channels | Production Firebase Hosting site plus `www.fvwatchfaces.com` |
| Paddle | Sandbox | Live |
| Paddle API | `sandbox-api.paddle.com` | `api.paddle.com` |
| Paddle credentials | Sandbox-only client token, API key, webhook secret | Independent live client token, API key, webhook secret |
| Firestore/Storage/Functions | Staging project only | Production project only |
| Orders/download counts | Staging-only documents | Production-only documents |
| Email | Clearly marked test messages to approved recipients | Customer-facing FlowVault email |
| Source | Private GitHub repository | Same private repository |

Environment must be selected explicitly at build and deploy time. Hostname inference and default fallbacks are forbidden for commerce operations.

## 4. Scope

### 4.1 Included

- Audit current staging deployment and parity.
- Complete and deploy remaining Spec 148 surfaces to staging only.
- Close public ZPK Storage access.
- Enforce project identity on orders, Paddle transactions, webhooks, catalog synchronization, fulfillment, email, recovery, and counters.
- Add production Firebase Hosting configuration without staging `noindex`.
- Add a tested production Content Security Policy and supporting headers.
- Add route-specific SEO metadata, automated sitemap generation, Product structured data, and static prerendering.
- Add route-level code splitting and enforce public bundle boundaries.
- Add monitoring, alerting documentation, health checks, and budget-alert runbook.
- Deploy staging and production-candidate builds to Firebase preview channels.
- Execute sandbox and non-charging production-opening acceptance tests.
- Attach the Namecheap domain to Firebase Hosting and change DNS only at the cutover gate.
- Update Paddle approved/default payment-link domain at the proper gate.
- Preserve and test rollback.
- Commit specifications and implementation separately to the private GitHub repository.

### 4.2 Excluded

- Moving the private studio/admin site during this migration.
- Migrating from Vite to Next.js or Firebase App Hosting.
- Implementing Spec 147 campaign management beyond prerequisites required by Spec 148 or launch safety.
- Creating live VIP codes before Sandbox acceptance and separate owner approval.
- Deleting GitHub repositories, Paddle entities, transactions, customers, Firestore rows, Storage objects, or notification destinations.
- Taking a real live Paddle payment before verification and domain approval permit it.

## 5. Launch invariants

### 5.0 Baseline clone and parity gate

No approved migration change may be accepted merely because the public storefront renders. Before staged improvements or end-to-end commerce acceptance, `flowvault-staging-2026` must be proven functionally equivalent to the current working platform baseline.

The sanitized parity manifest must compare Functions, Firestore, Storage, Auth, rules, indexes, required secret bindings, Hosting, Paddle, Resend, and every intentional environment difference.

The clone is functional, not shared state. Staging must never share production orders, entitlements, customers, transactions, download counters, webhook mutations, or Storage writes. Project IDs, URLs, secrets, Paddle environment, email labeling, indexing, and customer-impacting flags are required differences.

Every difference is classified as exactly one of: required environment substitution, approved change, accidental divergence, or missing clone surface. Accidental divergence and missing surfaces block checkout acceptance. A single canonical staging environment file and explicit deployment manifest must prevent per-Function configuration drift.

### 5.1 Project isolation

Every order and Paddle transaction must include immutable `custom_data` containing at least:

- `firebaseProjectId`
- `environment`
- `orderId`
- `offerId`
- policy/schema revision

Every state-changing server endpoint must compare the runtime Google Cloud project ID, configured FlowVault environment, expected Paddle environment, and incoming identity. Mismatch must fail closed.

A correctly signed webhook for another FlowVault project returns an idempotent 2xx ignored response and performs **no** lookup, mutation, fulfillment, email, counter increment, or retry. A local-identity event with invalid local state is a processing failure and must not be acknowledged as successful.

### 5.2 Secret isolation

- Server API keys and webhook secrets use Firebase Secret Manager and are never Vite variables.
- Browser builds may contain only the appropriate Paddle client-side token and public Firebase web configuration.
- Staging and production secrets are independent even when names are similar.
- The build must fail if environment or required token is missing or has the wrong prefix.
- Secret scanning covers the complete Hosting artifact, staged Git paths, source maps, logs, and generated metadata.

### 5.3 Source isolation

- Firebase Hosting uploads only an isolated generated public directory.
- Public deployment must not use `git add -A`, repository-root mirroring, or public-repository source commits.
- Sourcemaps remain disabled for production.
- Public build aliases must exclude studio/admin/private modules.
- The private GitHub remote remains the sole code remote used by the new Firebase Hosting workflow.

## 6. Storage and entitlement security

The existing unconditional public read rule for released ZPK paths must be removed.

Approved delivery model:

1. Customer access begins only after authoritative Paddle server verification and local order validation.
2. Server resolves the exact purchased package and watch variant.
3. Server issues a short-lived, order-bound download URL or streams through an authenticated entitlement endpoint.
4. Direct Firebase Storage reads are denied by rules.
5. URL lifetime, download allowance, regeneration allowance, 24-hour/approved policy window, idempotency, and total attempts follow Spec 146.
6. QR code points to the same controlled entitlement resource; it does not bypass counting or expiration.
7. Revoking public Storage reads must be tested against browser download and Zepp QR installation before production deployment.

No existing ZPK object is deleted as part of this change.

## 7. Firebase Hosting configuration

Separate explicit configs are required:

- Staging config: staging site, staging artifact directory, `X-Robots-Tag: noindex, nofollow, noarchive`.
- Production config: production site, production artifact directory, no staging `noindex` header.

Both configs must include:

- SPA/static-prerender routing in correct precedence order.
- Immutable one-year caching only for fingerprinted assets.
- Revalidation/no-cache policy for HTML, sitemap, robots, catalog manifests, and mutable metadata.
- `X-Content-Type-Options: nosniff`.
- Frame protections compatible with Paddle Checkout.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- Restrictive `Permissions-Policy`.
- HSTS after the Firebase custom domain is active and HTTPS is verified.
- A complete, tested CSP.

The CSP must explicitly account for FlowVault, Firebase Functions, Firebase/Google assets actually used, Paddle.js, Paddle Checkout frames/connections, hosted images/fonts, and required analytics. It must not use broad wildcards merely to make tests pass. Start in report-only mode if required, review violations, then enforce before cutover.

## 8. SEO and routing

### 8.1 Required indexable pages

- Home
- Collection
- Design model
- Device-compatible catalog
- Category
- Product/face
- Offer purchase landing page where appropriate
- Legal pages

### 8.2 Per-route requirements

Each indexable route must have initial-HTML:

- Unique title and meta description.
- Canonical `https://www.fvwatchfaces.com/...` URL.
- Open Graph and Twitter metadata.
- Meaningful preview image.
- Breadcrumb and Product/Offer JSON-LD where applicable.
- Visible primary content and internal links without requiring crawler-side JavaScript.

Release/catalog synchronization must regenerate `sitemap.xml` and prerendered pages deterministically. Staging output must remain noindex even though it contains production-like content.

Invalid product/model routes must not become indexable HTTP-200 soft-404 content. A defined `/not-found` policy and noindex behavior are required.

## 9. Performance requirements

- Route modules are dynamically imported where safe.
- Public initial bundle excludes admin/studio/release tooling.
- Build reports compressed and uncompressed chunk sizes.
- A bundle-size regression threshold is enforced.
- Paddle loading may be prepared without opening checkout or leaking secrets.
- Catalog and fingerprinted assets have correct CDN/browser caching.
- Acceptance records cold and warm timings separately for storefront render, checkout interactive, entitlement display, ZPK download start, and QR installation handoff.

The migration does not claim that Hosting alone accelerates Paddle or webhook processing.

## 10. Spec 148 deployment contract

Spec 148 remains staging-only until all its unchecked implementation and Sandbox tasks are complete.

Before any live VIP Discount is created:

1. Paddle Sandbox permissions and Discount catalog are audited read-only.
2. Discount adapter CRUD/archive operations are implemented and unit tested.
3. Admin generation/list/archive/retry operations are authenticated, rate-limited, masked, and audited.
4. Standard-price VIP checkout is proven not to stack with campaign price.
5. Webhook verification proves environment, standard Price, percentage, totals, FlowVault Discount identity, and atomic one-time claim.
6. Valid, invalid, expired, archived, reused, declined, abandoned, concurrent, foreign, and cross-environment cases pass.
7. Email, invoice, QR, ZPK, recovery, and download limits remain correct.

Live code generation remains disabled behind an explicit production enablement flag until a later owner approval.

## 11. Monitoring, budgets, and operational readiness

Required monitoring surfaces:

- Hosting availability and error rate.
- Public catalog/health endpoint.
- Checkout-order creation latency and failures.
- Paddle verification and webhook status/retry counts.
- Fulfillment latency and failures.
- Email send failures.
- QR/ZPK token issuance and download failures.
- Cross-project events ignored.
- Download-counter anomalies.
- Spec 148 Discount synchronization/redemption failures.

Budget alerts must be configured for staging and production, with documented thresholds and owner notification. Alerts do not cap spend; this limitation must be stated in the runbook.

No automatic billing shutdown may be introduced because it could interrupt paid fulfillment.

## 12. Git and release discipline

The existing dirty worktree is treated as owner state and preserved.

Required commit structure:

1. Spec/docs commit: Spec 149 and deployment documentation only.
2. Security/isolation implementation commit.
3. Hosting/SEO/performance implementation commit.
4. Spec 148 implementation commit if not already cleanly separable.
5. Generated artifacts are committed only if intentionally tracked by the private repository.
6. Root repository pointer commit, if required, touches only the nested `app` pointer.

Before every commit:

- List staged files.
- Reject mixed docs and runtime implementation.
- Scan staged content for secrets.
- Confirm target remote is the private `origin`.
- Record commit hash and test evidence.

The public GitHub remote receives no new production source or secret. It is frozen as a rollback artifact during the stability window.

## 13. Namecheap domain migration

The domain remains registered at Namecheap. Hosting migration changes DNS records, not ownership or registration.

Ordered domain procedure:

1. Add `www.fvwatchfaces.com` and the intended apex behavior to the production Firebase Hosting site.
2. Firebase supplies domain-verification and destination DNS records.
3. Inventory and export the current Namecheap DNS zone before modification.
4. Lower relevant TTL in advance where Namecheap permits.
5. Add Firebase verification records without deleting the working GitHub records prematurely.
6. Wait for Firebase verification and SSL provisioning readiness.
7. At cutover, replace only the exact GitHub Pages `www`/apex records with the exact Firebase-provided records.
8. Preserve mail MX, SPF, DKIM, DMARC, Resend, PrivateEmail, and unrelated records unchanged.
9. Verify from multiple resolvers and a clean browser that HTTPS, canonical host, SPA routes, and assets work.

The exact DNS values are not hard-coded in this specification because Firebase generates them for the selected Hosting site. They must be copied verbatim from the Firebase console during the gated cutover.

## 14. Paddle live-domain migration

After Firebase serves the production candidate and before customer traffic is accepted:

- Add/approve `https://www.fvwatchfaces.com` in Paddle Live as required.
- Set the live default payment link to the Firebase-hosted approved checkout page.
- Confirm production Paddle.js uses production environment and the live client token.
- Confirm server calls use `api.paddle.com` with the live API key.
- Confirm the live notification destination points only to production Functions and uses its independent signing secret.
- Open a live checkout and verify products/prices without taking a payment until Paddle permits the controlled live transaction.

Changing DNS does not change Paddle IDs. Live catalog mapping must already be valid before checkout is enabled.

## 15. Preview and acceptance gates

### Gate A — Static and local

- Unit/integration tests pass.
- Functions build passes.
- Production and staging builds pass.
- Secret scans pass.
- Security-rule audit passes.
- CSP tests pass.
- Prerender/sitemap validation passes.
- Bundle limits pass.

### Gate B — Staging preview

- Deploy immutable candidate to a staging preview channel.
- Verify noindex, routes, headers, assets, catalog, and no private route exposure.
- Run complete Paddle Sandbox success and decline flows.
- Verify webhook, email, QR, ZPK, recovery, limits, counts, and project isolation.
- Complete Spec 148 Sandbox matrix.

### Gate C — Production preview

- Deploy the exact production candidate to a production Firebase preview channel.
- Keep customer live checkout disabled unless safe.
- Verify production API bases, live catalog mappings, headers, SEO artifacts, routing, and credential scan.
- Open Paddle Live Checkout only; do not charge until authorized.

### Gate D — Domain cutover

- Owner approves recorded Gate A–C evidence.
- Export current DNS.
- Change only required Namecheap web records.
- Verify Firebase SSL and canonical redirects.
- Run smoke tests immediately.

### Gate E — Controlled live acceptance

- Run one authorized low-value real purchase when Paddle permits.
- Verify invoice, FlowVault email, entitlement, QR, ZPK, limits, counters, idempotent refresh, and credential non-exposure.
- Monitor for the defined stability window.

## 16. Rollback

Rollback is prepared before cutover, not invented after failure.

Triggers include checkout failure, webhook/fulfillment failure, security header breakage, widespread route failure, DNS/SSL failure, cross-project mutation, secret exposure, or unacceptable error rate.

Rollback options, in order:

1. Clone the last known-good Firebase Hosting release to live for frontend-only regressions.
2. Disable checkout while preserving browsing for backend/fulfillment incidents.
3. Restore the exported Namecheap GitHub Pages DNS records if Firebase Hosting/domain service is the failure.
4. Keep production Firebase data and Paddle entities; never delete them during rollback.
5. Re-verify DNS, SSL, catalog, and checkout state after rollback.

GitHub rollback remains available for at least 30 days after successful cutover. Retirement requires a separate owner decision after monitoring evidence.

## 17. Acceptance criteria

1. Staging and production mutations are proven isolated.
2. Direct unauthenticated ZPK Storage reads fail while entitled download and QR installation succeed.
3. Spec 148 passes its complete Sandbox matrix.
4. Production build contains no secret, sourcemap, private route, or private source artifact.
5. CSP is enforced without breaking Paddle, Firebase, fonts, images, email-linked routes, or downloads.
6. Indexable routes contain correct initial HTML metadata and structured data; staging remains noindex.
7. Main public bundle is split and does not regress beyond the approved threshold.
8. Preview-channel candidate passes success, decline, replay, recovery, and cross-project tests.
9. Firebase production Hosting has a preserved prior/rollback release.
10. Namecheap web DNS points to Firebase while mail and verification DNS remain intact.
11. `www.fvwatchfaces.com` serves valid Firebase SSL and correct canonical routes.
12. Paddle Live opens with correct live products/prices and production endpoint configuration.
13. One authorized live transaction completes end to end when permitted.
14. Private GitHub commits are cleanly separated, scanned, pushed to `origin`, and recorded.
15. GitHub Pages rollback remains available throughout the stability window.

## 18. Required owner-assisted actions

Codex may prepare, inspect, build, test, and deploy within approved project scope. The owner must participate when an external console requires an existing signed-in session, displays generated values, or changes customer-impacting configuration:

- Confirm Firebase custom-domain ownership records if the CLI cannot complete them.
- Apply the exact Firebase DNS records in Namecheap at Gate D.
- Preserve all mail DNS entries.
- Approve Paddle Live domain/default-payment-link settings where dashboard-only.
- Approve the controlled first real payment.

Codex must provide exact field-by-field instructions at each such gate; the owner must not be asked to guess values.

## 19. Stop conditions

Stop immediately and do not proceed to the next gate if:

- Environment/project identity is ambiguous.
- Tests show staging writes production data or vice versa.
- A secret appears in a client artifact or log.
- Direct public ZPK access remains possible.
- Paddle catalog/credential environment is mixed.
- Required webhook delivery is failing.
- CSP blocks checkout or fulfillment.
- DNS instructions would overwrite mail records.
- The working tree cannot be committed without including unrelated owner changes.
- Rollback evidence is missing.
