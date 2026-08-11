# Spec 149 — Implementation Plan

No phase begins until the preceding phase has evidence and its stop conditions are clear.

## Phase 0 — Baseline and evidence

1. Capture nested-repository status and ownership of existing changes.
2. Inventory production/staging Firebase projects, sites, Functions, rules, indexes, buckets, secrets by name, and web apps.
3. Inventory Paddle Sandbox/Live credentials by prefix, notification destinations, catalog mappings, and approved domains without printing secrets.
4. Capture current GitHub Pages DNS, Namecheap DNS zone, live headers, route behavior, and rollback commit.
5. Audit Spec 148 completion against code, tests, and deployed surfaces.
6. Produce a gap report. No writes or deploys.

## Phase 1 — Specification approval

1. Owner reviews Spec 149, tasks, test matrix, and cutover runbook.
2. Resolve open decisions.
3. Commit documentation alone to private GitHub.

## Phase 2 — Isolation and delivery security

0. Generate and approve the complete baseline clone/parity manifest. Restore missing platform surfaces and normalize staging configuration before applying or accepting migration changes.

1. Add immutable deployment identity to order/transaction contracts.
2. Add runtime project/environment guards to all commerce mutation paths.
3. Add foreign-project webhook ignore behavior and local-invalid-state failure behavior.
4. Replace public ZPK reads with controlled entitlement delivery.
5. Update Storage/Firestore rules and tests.
6. Run red-team rules audit and emulator/cloud verification.

## Phase 3 — Spec 148 completion

1. Complete Paddle Discount adapter and authenticated admin APIs.
2. Complete Admin UX, masking, audit, archive, retry, and bounded batch behavior.
3. Complete transaction/discount verification and concurrency tests.
4. Deploy only targeted staging Functions and rules.
5. Run the complete Sandbox matrix.

## Phase 4 — Hosting, SEO, and performance

1. Create explicit staging and production Hosting configs and artifact directories.
2. Add CSP report-only collection/testing, then enforcement.
3. Add route SEO model, prerender generator, sitemap/robots generation, structured data, and not-found policy.
4. Add route-level dynamic imports and bundle thresholds.
5. Add isolated build/deploy scripts that never push public Git artifacts.
6. Add monitoring/health instrumentation and budget-alert runbook.

## Phase 5 — Preview acceptance

1. Deploy staging candidate to a named preview channel.
2. Run static, browser, sandbox commerce, security, and isolation tests.
3. Fix failures and issue a new immutable candidate.
4. Deploy production candidate to production preview channel.
5. Verify live configuration without charging.

## Phase 6 — Production readiness

1. Create/verify production Firebase Hosting site.
2. Verify independent live secrets and catalog mappings.
3. Export Namecheap DNS and record GitHub rollback values.
4. Add Firebase custom domain and complete non-disruptive verification.
5. Prepare Paddle Live approved/default domain changes.
6. Record go/no-go evidence and owner approval.

## Phase 7 — Cutover

1. Promote the exact accepted production candidate to Firebase live.
2. Change the exact Namecheap web DNS records.
3. Verify DNS, SSL, canonical host, routes, headers, catalog, and checkout opening.
4. Update/verify Paddle Live default payment link and notification destination.
5. Run controlled live acceptance when authorized.

## Phase 8 — Stability and handoff

1. Monitor for at least 30 days before retiring GitHub rollback.
2. Track Hosting, commerce, webhook, fulfillment, email, and downloads.
3. Document incident and rollback procedures.
4. Mark Spec 149 complete only after stability criteria pass.
