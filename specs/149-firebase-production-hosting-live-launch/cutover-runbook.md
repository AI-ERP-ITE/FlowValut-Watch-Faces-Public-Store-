# Spec 149 — Live Cutover and Rollback Runbook

This runbook is intentionally incomplete until Phases 0–8 populate exact site IDs, preview release IDs, DNS values, commit hashes, and monitoring links. Never substitute guessed values.

## Go/no-go record

- Accepted private commit:
- Accepted staging preview URL/release: `https://flowvault-staging-2026.web.app` / `29bf8faa486473f9`
- Accepted production preview URL/release: `https://zeppfaceloader-b0b106e9--spec149-production-8qfjwid3.web.app` / `2fd309effd4e26af`
- Production Firebase Hosting site ID:
- Current GitHub Pages rollback commit: `dd4a62a0a42fe8a53c385efd2135838db2f96067`
- Current Namecheap web DNS export:
- Firebase-provided DNS records:
- Firebase SSL state:
- Paddle Live approved-domain state:
- Paddle Live default payment link:
- Production webhook destination:
- Owner approval timestamp:

## Pre-cutover

1. Confirm all Spec 149 tasks through T094 are complete.
2. Confirm no critical/high security finding is open.
3. Confirm staging Sandbox acceptance and production preview opening tests pass.
4. Confirm rollback release and DNS values are recorded.
5. Confirm Namecheap mail records are labeled **DO NOT MODIFY**.
6. Confirm checkout can be disabled independently of browsing.

## Cutover

1. Promote/clone the accepted production preview release to Firebase live.
2. Verify the Firebase default domain before changing public DNS.
3. In Namecheap, modify only the exact `@`/`www` records identified by Firebase.
4. Do not modify MX, SPF, DKIM, DMARC, `send`, Resend verification, or PrivateEmail records.
5. Wait for Firebase domain status and managed certificate readiness.
6. Verify `www.fvwatchfaces.com`, apex behavior, deep routes, assets, headers, catalog and checkout.
7. Verify Paddle Live default payment link and notification destination.
8. Run immediate smoke tests; then run the controlled purchase only when authorized.

## Rollback decision

Rollback immediately for cross-project mutation or secret exposure. For other failures, disable checkout first if browsing remains safe, then select:

- Firebase release rollback for frontend/config regression.
- DNS rollback to GitHub Pages for Firebase Hosting/custom-domain outage.
- Backend targeted rollback for Function regression, without deleting orders or Paddle entities.

## DNS rollback

1. Restore only the exported pre-cutover web records.
2. Preserve mail records unchanged.
3. Verify DNS from multiple resolvers.
4. Verify GitHub Pages TLS/domain behavior and that checkout state is safe.
5. Keep Firebase/Paddle/Firestore/Storage entities; do not clean them up.

## Post-cutover stability

- Monitor continuously during initial launch window.
- Review daily for the first seven days.
- Retain GitHub rollback for at least 30 days.
- Do not retire it without separate owner approval.
