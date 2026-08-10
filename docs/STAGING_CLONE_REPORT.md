# FlowVault full staging clone report

Date: 2026-08-09

## Source and target

- Source: `zeppfaceloader-b0b106e9`
- Target: `flowvault-staging-2026`
- Staging URL: `https://flowvault-staging-2026.web.app`

## Copied state

- Firestore: 587 documents across every discovered root and nested collection.
- Historical state included: 15 orders, download tokens, entitlements, webhook events, commercial/deletion audits, and all Workshop build subcollections.
- Storage: 1,537 objects totaling 1,077,076,750 bytes.
- Firebase Authentication: one Google-authenticated account plus enabled Google provider and authorized domains.
- Public source/target parity: 6 collections, 1 public model, 23 public SKUs, 38 public technical packages, 23 public Offers, and 0 device records returned by both environments.

## Necessarily remapped infrastructure

- Firebase project ID, number, app ID, service accounts, Hosting site, Function URLs, and Storage bucket.
- Firestore reference/string fields containing the source Firebase project or bucket were rewritten to the target identity.
- Paddle Sandbox notification destination and signing secret are independent staging infrastructure.
- Paddle live checkout remains disabled in staging.
- Artifact Registry removes obsolete staging deployment images after seven days.

## Verification

- Staging public hierarchy matches the source public hierarchy counts.
- Storefront configuration endpoint responds successfully.
- Sandbox checkout CORS preflight returns 204 and allows only the staging origin.
- Public build credential scan passed.
