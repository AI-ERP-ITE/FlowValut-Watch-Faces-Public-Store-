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

## Mandatory post-clone QR acceptance

Firebase cloning remaps the project, Function host, Storage bucket, and protected delivery URL. A successful browser ZPK download does not prove Zepp compatibility. Every clone or live cutover must therefore pass a physical QR installation test after deployment.

The protected delivery endpoint must support `HEAD` and byte-range `GET` requests. Zepp can issue several requests for one installation, so rapid retries from the same client and entitlement are one logical transfer; they must not consume both initial download allowances. Verify the QR payload belongs to the target environment, the watch installs successfully, Function logs contain no unintended `403`, and the entitlement counter increases by exactly one logical transfer.

After deploying the staging download Function, run `node scripts/verifyLatestStagingQrTransport.mjs` from `firebase/`. It checks the latest paid entitlement with a non-consuming ranged `HEAD` request and fails unless the staging host, `.zpk` URL path, `206`, and range headers are correct. This automated check complements—but does not replace—the physical Zepp installation gate.
