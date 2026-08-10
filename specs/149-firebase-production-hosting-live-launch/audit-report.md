# Spec 149 — Phase 0 Audit Report

**Audit date:** 2026-08-10  
**Mode:** Read-only remote inventory plus local build/tests; no Firebase deploy, Paddle mutation, DNS change, or production change  

## Executive status

The migration is feasible on the existing Vite/Firebase architecture. Firebase Hosting Classic is provisioned in both canonical projects. The current code builds and its existing tests pass, but production cutover is blocked by security, environment-identity, SEO, performance, and operational gaps listed below.

## Verified environment inventory

| Environment | Project | Web app | Hosting sites |
|---|---|---|---|
| Staging | `flowvault-staging-2026` | `FlowVault Staging Web` | `flowvault-staging-2026.web.app` |
| Production | `zeppfaceloader-b0b106e9` | `FlowVault` | default site plus legacy `flowvault-staging.web.app` site |

Firebase CLI 15.26.0 runs under Node 22.16.0 and the authenticated owner account can access exactly these two Firebase projects.

Staging currently exposes 19 commerce/public Functions. Production exposes 64 mixed public, commerce, workshop, admin, and private Functions. Staging is therefore a data/content clone but not a literal runtime inventory clone. This is acceptable only after every omitted Function is classified as intentionally private/live-only or required in staging.

## Baseline validation

- Backend TypeScript build: pass.
- Backend automated tests: 65/65 pass.
- Environment-separation script: pass for configured frontend targets.
- Staging public build: pass.
- Compiled public credential scan: pass across 20 files.
- Main JavaScript: 799.36 KB minified / 243.69 KB gzip.
- CSS: 120.38 KB / 21.93 KB gzip.
- Paddle chunk: 11.88 KB / 4.51 KB gzip.
- Vite reports a static/dynamic import conflict and an oversized main chunk.

Passing local separation checks do not cover the missing `firebaseProjectId` Paddle transaction/webhook contract discovered in source review.

## Current live DNS and Hosting

- Apex `fvwatchfaces.com` uses the four GitHub Pages A records.
- `www.fvwatchfaces.com` is a CNAME to `ai-erp-ite.github.io`.
- Live root returns HTTP 200 from `GitHub.com`.
- Live root has HSTS but lacks the CSP, frame, nosniff, permissions, and referrer headers planned for Firebase production.
- Live `robots.txt` returns 404.
- Live `sitemap.xml` returns 404.

The Namecheap zone export is still required before cutover because DNS resolution does not inventory MX, SPF, DKIM, DMARC, Resend, and PrivateEmail records comprehensively.

## Spec 148 status

Implemented locally and/or deployed to staging:

- VIP pricing mode and public selector.
- Paddle Discount adapter create/archive behavior.
- Single-use configuration and metadata.
- Guarded `adminVipPromoCodes` Function deployed in staging.
- Standard-price VIP checkout selection.
- Campaign stacking rejection.
- Atomic same-transaction redemption idempotency primitives.
- Unit tests for generation, percentage policy, Discount configuration, and redemption behavior.

Not yet accepted:

- Read-only Paddle Sandbox catalog/permission audit.
- Full Admin list/filter/archive/retry/copy UX evidence.
- Complete project-ID isolation.
- Real Sandbox valid/invalid/expired/reused/declined/abandoned/concurrent matrix.
- Localized/tax totals and end-to-end email/QR/ZPK/recovery proof with VIP codes.
- Owner Sandbox acceptance.

## Critical and high-priority findings

### F149-01 — GitHub PAT stored as plain Function environment data

**Severity:** Critical launch blocker  
**Status:** Unresolved

Legacy deployed Functions contain a GitHub PAT in plain runtime environment configuration instead of Firebase Secret Manager. A read-only Firebase CLI diagnostic response exposed the value in local command output.

Required remediation:

1. Revoke/rotate the existing token.
2. Store the replacement in each required project’s Secret Manager.
3. Bind it only to Functions that require GitHub access.
4. Remove `GITHUB_TOKEN` from ordinary environment configuration.
5. Deploy targeted Functions and verify no metadata command returns the value.

### F149-02 — Public ZPK Storage read

**Severity:** Critical commercial access-control blocker  
**Status:** Unresolved

`storage.rules` allows unauthenticated reads under `/zpk/{file}`. Paid artifacts must be delivered only through order-bound entitlement logic before production cutover.

### F149-03 — Missing Firebase project identity in Paddle contract

**Severity:** High  
**Status:** Unresolved

Transaction/webhook validation checks `orderId` and Paddle environment but does not enforce `firebaseProjectId`. Shared Sandbox notification behavior can therefore cross project boundaries if matching local identifiers or logic permit it.

### F149-04 — Production Hosting config is actually legacy staging config

**Severity:** High  
**Status:** Unresolved

`firebase/firebase.json` targets the legacy `flowvault-staging` site, uses `.staging-hosting`, and sends `X-Robots-Tag: noindex`. A separate production config/artifact path is required.

### F149-05 — Live SEO artifacts missing

**Severity:** High  
**Status:** Unresolved

The live site returns 404 for both `robots.txt` and `sitemap.xml`; product routes also lack complete initial-HTML prerender/structured data coverage.

### F149-06 — Incomplete CSP

**Severity:** High  
**Status:** Unresolved

Staging CSP currently controls only `frame-ancestors`, `base-uri`, and `object-src`. It is not a complete resource policy.

### F149-07 — Oversized monolithic public bundle

**Severity:** Moderate  
**Status:** Unresolved

The 799 KB initial JavaScript chunk includes modules that Vite cannot split because they are both statically and dynamically imported. Route-level splitting and public/private boundary verification are required.

### F149-08 — Dirty nested repositories

**Severity:** High release-process risk  
**Status:** Controlled, unresolved

Root and app repositories contain extensive pre-existing changes and generated dependency churn. Broad staging, cleanup, reset, and public-repository pushes are prohibited. All commits require explicit path allowlists and class separation.

## Current security-rules audit

```json
{
  "score": 1,
  "summary": "Critical paid-artifact exposure exists through unconditional public ZPK reads. Server-only commerce collections are denied correctly, and user asset paths have ownership checks, but upload validation and public metrics exposure need hardening review.",
  "findings": [
    {
      "check": "Business Logic vs. Rules",
      "severity": "critical",
      "issue": "Any unauthenticated client can read a known /zpk object path, bypassing paid entitlement controls.",
      "recommendation": "Deny client Storage reads for released ZPKs and serve only through an order-bound server entitlement path."
    },
    {
      "check": "Storage Abuse",
      "severity": "minor",
      "issue": "User-owned asset writes have identity checks but no rule-level size or content-type restrictions.",
      "recommendation": "Add validated size/content-type constraints compatible with each supported asset class."
    },
    {
      "check": "Public data minimization",
      "severity": "minor",
      "issue": "Download metric documents are publicly readable. This supports storefront counts but requires a strict non-sensitive aggregate schema.",
      "recommendation": "Expose only sanitized aggregate counts through a public endpoint or enforce a minimal validated document schema."
    }
  ]
}
```

## Phase 0 items still requiring external-console evidence

1. Paddle Sandbox and Live catalog/notification/domain inventory through Paddle tooling/dashboard.
2. Complete Namecheap DNS zone export.
3. Budget-alert configuration state in both Google Cloud projects.
4. Independent browser verification of staging HTTPS headers because the local PowerShell TLS client failed to negotiate the staging URL.

These do not authorize delaying local remediation work, but all must be complete before preview acceptance or cutover.

## Implementation evidence â€” 2026-08-10

- Project identity is now written to orders and Paddle transaction custom data, validated on browser confirmation and verified webhooks, and foreign-project events are acknowledged without local mutation.
- Client reads of `/zpk/**` and `/releases/**` are denied; public catalog/media endpoints no longer reveal paid package paths. The secure `downloadEntitlementPackage` Function is deployed in `flowvault-staging-2026`.
- Dedicated staging and production Hosting configurations now enforce environment-specific indexing, CSP, cache rules, security headers, and canonical trailing-slash behavior.
- Staging SEO generation produced 79 route artifacts plus `robots.txt` and `sitemap.xml`; stable staging route/header probes returned HTTP 200 with noindex and CSP.
- Public route splitting reduced the initial JavaScript artifact from 799.36 KB (243.69 KB gzip) to about 498.73 KB (151.30 KB gzip).
- Staging preview: `https://flowvault-staging-2026--spec149-launch-u6gfis23.web.app`.
- 66 backend tests and the category-slug regression tests pass.
- Remaining Sandbox gates: Paddle must accept `https://flowvault-staging-2026.web.app/` as the default/approved checkout URL; the isolated staging Firebase project needs its own `RESEND_API_KEY` secret before fulfillment-email acceptance.
- Production remains untouched. The exposed legacy GitHub credential must be rotated and a replacement Secret Manager version supplied before any dependent Function or production cutover deployment.

## Phase 1/2 recommendation

Proceed locally in this order:

1. Add project identity contracts and tests.
2. Implement controlled ZPK delivery and hardened rules/tests.
3. Migrate GitHub credential usage to Secret Manager bindings; remote deployment remains blocked until the existing PAT is rotated.
4. Reconcile Spec 148 tasks with code evidence and finish missing behavior.
5. Only then implement Hosting/SEO/performance work and deploy a preview candidate.

## Continuation evidence — 2026-08-10 15:24–15:47 EEST

- Preserved commits verified: app `cced6b11`, backend `aa33d4ed`, root pointer `3a8ca1ba`.
- The accepted staging Hosting release `b5bea0cc7fe93183` had regressed to 56 files and returned Firebase 404 for direct product routes. `deployStaging.mjs` bypassed the canonical SEO/Hosting preparation step.
- Staging deploy now reuses `prepare:hosting:staging`; 105 SEO routes and 159 files were regenerated, scanned, and released as `29bf8faa486473f9`. Direct `/design/memento-mori-01` navigation works again.
- Backend tests pass 71/71. Environment separation, public credential scan, and bundle thresholds pass.
- Declined-card behavior passed using Paddle Sandbox's official declined card. A previously consumed Sandbox-only FVIP code was rejected by Paddle Checkout as invalid; no payment was attempted.
- Formal rules review found no direct paid-object read and no critical cross-user access bypass. Remaining rule work is emulator coverage plus size/content-type/schema constraints for owner-written assets; Java is unavailable locally.
- Production and staging Hosting artifacts were generated from the same app commit and contain the same 159-file topology. Only environment identity, endpoint, Paddle mode/safety, canonical SEO origin, and indexing policy differ.
- Production preview `spec149-production` is deployed as release `2fd309effd4e26af`; root, prerendered product metadata, sitemap, robots, security headers, cache policies, and real 404 behavior pass. Firebase automatically adds preview-channel noindex.
- Production catalog CORS was updated only on `publicCatalog` and `publicStoreHierarchy`; both targeted read-only Functions deployed successfully and the preview now renders production catalog data.
- Production Secret Manager has enabled `RESEND_API_KEY` version 1. Required `PADDLE_LIVE_API_KEY`, `PADDLE_LIVE_WEBHOOK_SECRET`, and replacement `GITHUB_TOKEN` entries are missing. Live checkout remains disabled.
- GitHub Pages rollback commit is `dd4a62a0a42fe8a53c385efd2135838db2f96067`; no public-remote push or DNS change occurred.
