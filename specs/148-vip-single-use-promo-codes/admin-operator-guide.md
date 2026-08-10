# VIP promo-code operator flow

## Where generation happens

Generation is available on the existing private FlowVault site:

1. Open `https://ai-erp-ite.github.io/Watch-Faces/admin/`.
2. Sign in through the existing private Firebase Google-auth guard.
3. Expand **Admin Tools**.
4. In **VIP single-use code**, select **Connect Staging Commerce**.
5. Sign in to the isolated `flowvault-staging-2026` Firebase project when prompted.
6. Choose a whole-number percentage from 1 through 90.
7. Select **Generate one-time VIP code**.
8. Copy the full code immediately. FlowVault stores only its hash and masked display form; the full code is shown once.

The rest of Studio/Admin remains connected to the original Firebase project. Only the VIP panel uses the isolated staging identity and `adminVipPromoCodes` Function. The panel cannot create a live Paddle code.

## What generation creates

One click creates both persistent Sandbox records:

- a FlowVault `vipPromoCodes` document in staging Firestore; and
- a Paddle Sandbox percentage Discount that is enabled for checkout, non-recurring, universal, and limited to one use.

The generated code applies to one transaction. Paddle code entry occurs inside Checkout. VIP mode replaces the active campaign price with the standard Price before Paddle applies the VIP percentage, preventing campaign stacking.

## Status and archive

The panel lists only masked codes, percentage, lifecycle status, and any redeemed order identifier. **Refresh code status** reloads the isolated staging records. An unused code may be archived in both FlowVault and Paddle Sandbox. Redeemed codes are immutable and are never deleted.

## Required Sandbox acceptance

Before live enablement, test valid 10%, 50%, 75%, and 90% purchases; campaign replacement; invalid/archived/reused codes; declined and abandoned payments; concurrency; localized/tax totals; email and invoice; QR/ZPK; download/recovery limits; and cross-project isolation. Live generation remains disabled until a separate approval.
