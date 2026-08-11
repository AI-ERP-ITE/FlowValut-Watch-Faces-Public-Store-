# Spec 150 Copy and Mapping Checklist

| Part | Treatment | Validation | Status |
|---|---|---|---|
| Application source and business logic | Copy exactly | Same frozen app revision; normalized artifact parity | Implemented; trusted-runner evidence pending |
| Backend source and fulfillment logic | Copy exactly | Same frozen backend revision and passing tests | 74/74 tests pass |
| Hosting artifact | Copy exactly except registered environment outputs | Sync manifest contains all file paths and SHA-256 values | Staging Sync ID deployed |
| Firestore rules and indexes | Copy exactly | Cloud rules compiler plus release | Passed in staging |
| Storage rules | Copy exactly | Cloud rules compiler plus release | Passed in staging |
| Firebase project and Function origins | Fixed map | Staging and production IDs/origins are hard-coded in typed registry | Passed |
| Paddle environment and API origin | Fixed map | Sandbox maps only to Live; cross-environment request rejected | Passed in code/tests |
| Paddle product and Price IDs | Protected Admin mapping | Independent `paddle.production` mapping; no Sandbox ID reuse | Endpoint deployed; reconciliation pending |
| Paddle browser token | Protected Admin value | Live token only; browser-safe; versioned | Persistence pending |
| SEO, canonical, robots and indexing | Automatic adjustment | Staging noindex; production preview canonical/indexing checks | Staging passed; preview pending |
| CORS origins | Automatic adjustment | Closed HTTPS allowlist generated from protected registry | Preview-origin defect fixed; disabled gate returns 503 |
| Email environment label | Automatic adjustment | STAGING vs PRODUCTION labels | Preview verification pending |
| API keys, webhook secrets, GitHub token | Secret references only | Secret Manager binding; no value in Git/Hosting/Firestore/UI | Paddle rotated; GitHub rotation pending |
| Customers, transactions, orders and Auth users | Never copy | Zero import/export paths and zero payload presence | Passed by policy; cloud reconciliation pending |
| Entitlements, tokens, reservations and counters | Never copy | Zero import/export paths and zero payload presence | Passed by policy; cloud reconciliation pending |
| Webhook/idempotency/email/audit history | Never copy | Production-owned only | Passed by policy; cloud reconciliation pending |
| Private/customer Storage | Never copy | Only explicitly released application artifacts may promote | Policy implemented; artifact inventory pending |
| DNS and real payment | Separate stopped gate | No Namecheap call; checkout false; no payment | Passed |

Current staged identity: `sync-ed5f3c4b-719b225c-0819acdf46bb`, Hosting version `fc9f236bbce49026`, 159 manifest files plus the manifest itself.
