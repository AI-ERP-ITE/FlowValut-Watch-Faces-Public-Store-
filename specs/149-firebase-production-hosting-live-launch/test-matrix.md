# Spec 149 — Acceptance Test Matrix

| Area | Scenario | Expected result |
|---|---|---|
| Environment | Staging build with missing environment | Build fails loudly |
| Environment | Staging build with live Paddle token/API target | Build or server startup fails |
| Environment | Production build with Sandbox Paddle token/API target | Build or server startup fails |
| Isolation | Staging checkout completes | Only staging order, entitlement, email audit, and counters change |
| Isolation | Production endpoint receives signed staging/foreign-project event | 2xx ignored; zero mutation/email/counting |
| Isolation | Local-identity webhook references missing local order | Non-2xx or terminal security handling; no fulfillment |
| ZPK security | Direct unauthenticated Storage read | Denied |
| ZPK security | Entitled browser download | Correct purchased variant downloads |
| ZPK security | Entitled QR/Zepp installation | Correct purchased variant installs |
| ZPK policy | Refresh/replay | No duplicate charge or duplicate entitlement |
| ZPK policy | Attempts exceed approved total | Further delivery denied with support guidance |
| Checkout | Normal campaign purchase | Paddle uses synchronized campaign Price |
| Checkout | VIP mode during campaign | Paddle starts from standard Price; no stacking |
| Checkout | Valid one-time VIP code | Correct percentage applied; one redemption and fulfillment |
| Checkout | Redeemed/invalid/expired/archived code | Rejected; no unauthorized fulfillment |
| Checkout | Declined/abandoned VIP checkout | Code remains available |
| Checkout | Concurrent use of same VIP code | At most one completed fulfilled order |
| Hosting | Staging root and deep routes | HTTP success, correct SPA/prerender behavior, noindex |
| Hosting | Production candidate root and deep routes | HTTP success, indexable where intended |
| Headers | Production response | CSP, nosniff, referrer, permissions, cache policy present |
| CSP | Paddle Checkout | Opens, loads payment fields, completes Sandbox transaction |
| CSP | Firebase catalog/functions | Requests succeed only to allowlisted endpoints |
| CSP | Unexpected external script/frame | Blocked |
| SEO | Product URL without JavaScript | Unique title/description/canonical/product content present |
| SEO | Sitemap after release | New/changed face URLs appear exactly once |
| SEO | Invalid product URL | Correct not-found/noindex behavior; no soft-404 index page |
| Performance | Cold storefront | Recorded against baseline; no approved regression |
| Performance | Public bundle | Route-split; private/admin modules absent; size threshold passes |
| Security | Compiled Hosting artifact scan | No API key classified as secret, server secret, webhook secret, source map, or private source |
| Security | Browser console/network inspection | No server credential or sensitive customer/order data exposure |
| Email | Sandbox success | Marked test email reaches approved purchaser; Reply-To correct |
| Email | Production success | Branded customer email and Paddle receipt behave as approved |
| DNS | Cutover | `www` resolves to Firebase; mail MX/SPF/DKIM/DMARC unchanged |
| TLS | Custom domain | Valid Firebase-managed certificate; no mixed content |
| Paddle Live | Pre-live test | Checkout opens with correct live product/price; no charge taken |
| Rollback | Firebase frontend regression | Previous known-good Firebase release restored |
| Rollback | Firebase Hosting/domain failure | Exported GitHub Pages DNS can be restored without deleting data |
| Git | Docs commit | Contains only specs/docs and no secrets |
| Git | Implementation commits | Explicit files, private `origin`, tests recorded, no public source push |

