# FlowVault Paddle environments

FlowVault uses one codebase with explicit `staging` and `production` deployment
profiles. Staging is hosted at `https://flowvault-staging.web.app` and can only
use Paddle Sandbox. Production is hosted at `https://www.fvwatchfaces.com`, can
only use Paddle production, and its current build fixes `VITE_CHECKOUT_ENABLED`
to `false`.

## Browser configuration

Use a local ignored `.env.staging` for the Sandbox browser token:

```dotenv
VITE_DEPLOY_ENVIRONMENT=staging
VITE_CHECKOUT_ENABLED=true
VITE_PADDLE_ENVIRONMENT=sandbox
VITE_PADDLE_CLIENT_TOKEN=test_...
VITE_PURCHASE_FUNCTIONS_BASE_URL=https://us-central1-zeppfaceloader-b0b106e9.cloudfunctions.net
```

Paddle client-side tokens are designed for Paddle.js and may be included in a
browser build. API keys and webhook secrets are backend-only and must never use
a `VITE_` name.

## Backend configuration

Create these Firebase Secret Manager values before deploying Sandbox purchase
functions:

- `PADDLE_SANDBOX_API_KEY`
- `PADDLE_SANDBOX_WEBHOOK_SECRET`

The prepared production functions use separate secret names and must not be
activated until the live Paddle account is approved:

- `PADDLE_LIVE_API_KEY`
- `PADDLE_LIVE_WEBHOOK_SECRET`

Non-secret runtime flags are shown in `firebase/functions/.env.example`.
Production checkout stays disabled with `PADDLE_LIVE_CHECKOUT_ENABLED=false`.

## Offer mappings

Every paid Offer requires independent identifiers in its Firestore snapshot:

```json
{
  "paddle": {
    "sandbox": { "productId": "pro_...", "priceId": "pri_..." },
    "production": { "productId": "pro_...", "priceId": "pri_..." }
  }
}
```

Checkout fails closed if the mapping for the selected environment is absent.
Never copy Sandbox IDs into the production mapping.

## Webhooks and data boundaries

Configure the Sandbox destination for `transaction.completed` at:

`https://us-central1-zeppfaceloader-b0b106e9.cloudfunctions.net/paddleSandboxWebhook`

The live destination is separately prepared as `paddleLiveWebhook`. Each handler
uses its own endpoint secret. Orders, webhook events, SKU entitlements, and
download tokens carry a Paddle `environment` field (`sandbox` or `production`). Operational and financial queries
must always filter on that field; Sandbox records are excluded from production
revenue and production entitlement decisions.

## Commands

- `npm run build:staging` builds the Sandbox storefront.
- `npm run scan:public-build` rejects backend credential patterns in `dist`.
- `npm run deploy:staging` builds, stages only approved public assets, scans, and
  deploys only the dedicated Firebase Hosting site.
- `npm run build:production` builds the current checkout-disabled public store.

The public full-deploy command also runs the credential scan. Do not use it from
a worktree containing unrelated changes because that workflow intentionally
publishes a complete release snapshot.

## Launch sequence

1. Complete and verify Sandbox checkout, webhook, entitlement, email, and signed
   download flows.
2. Obtain Paddle live approval and create separate live Products and Prices.
3. Set the live secrets and webhook destination.
4. Replace production Offer mappings with the live IDs.
5. Change the explicit production checkout switch to `true`, build, scan, and
   deploy the public release.
