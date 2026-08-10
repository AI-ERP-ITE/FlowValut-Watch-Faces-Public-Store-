# FlowVault staging operations readiness

## Native budget control

- Project: `flowvault-staging-2026`
- Budget: `FlowVault Staging Monthly 10 USD`
- Period and amount: monthly, USD 10
- Thresholds: 50%, 90%, and 100% of actual spend
- Delivery: billing administrators/users plus the Google Monitoring email channel `FlowVault Operations Budget Alerts`
- Operations recipient: `operations@fvwatchfaces.com`
- Enforcement: alerts only; the budget does not pause Functions, Hosting, Storage, checkout, webhooks, or fulfillment

The operations mailbox may receive a Google verification message for the notification channel. If one arrives, the mailbox owner must confirm it. The channel is already linked to the budget.

## Existing Google Monitoring surfaces

The staging project currently exposes the native Google-service dashboards for Cloud Storage and Logs. Google Monitoring reports zero custom dashboards. No duplicate dashboard has been added.

The separate FlowVault commerce observability work remains T070/T071. If implemented, it belongs in Google Cloud Console under **Monitoring > Dashboards**, not in the customer storefront or the private Studio. It should summarize checkout creation, webhook processing, fulfillment, email, QR/ZPK delivery, cross-project ignores, download anomalies, and VIP Discount failures from native logs/metrics.

