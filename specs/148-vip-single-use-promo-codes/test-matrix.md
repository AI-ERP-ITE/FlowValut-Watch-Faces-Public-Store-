# Spec 148 — Acceptance Test Matrix

| Scenario | Checkout item | Expected result |
|---|---|---|
| Campaign, no VIP mode | Promotional Price | Campaign amount charged |
| VIP mode, valid 75% code | Standard Price | 25% of standard charged |
| VIP mode during campaign | Standard Price | Campaign ignored; no stacking |
| VIP mode, invalid code | Standard Price | Code rejected; no fulfillment unless standard payment completes |
| Redeemed code | Standard Price | Rejected; no second entitlement |
| Expired/archived code | Standard Price | Rejected |
| Declined card | Standard Price + valid code | Code remains usable |
| Abandoned Checkout | Standard Price + valid code | Code remains usable |
| Concurrent attempts | Standard Price | At most one completed/fulfilled order |
| Foreign/non-FlowVault Discount | Standard Price | Fulfillment blocked/reviewed |
| Cross-environment Discount | Standard Price | Rejected |
| Webhook replay | Original transaction | Idempotent success; no duplicate fulfillment |
| Refund | Historical transaction | Code stays redeemed; new code required if approved |

For every successful case, verify displayed Paddle totals, completed transaction, verified webhook, atomic redemption, order snapshot, entitlement, FlowVault email, Paddle invoice, QR, ZPK download, download limits, and credential non-exposure.

## Staging operator access verification (2026-08-10)

- Google sign-in is enabled for `flowvault-staging-2026` with the project support email configured.
- The OAuth client used by the private Admin permits the exact callback `https://flowvault-staging-2026.firebaseapp.com/__/auth/handler`.
- The private Admin successfully authenticated `aihossny@gmail.com`, listed promo-code status through `adminVipPromoCodes`, and enabled generation without creating a Discount.
- Generated codes use `FVIP` followed by 12 unambiguous uppercase alphanumeric characters.
