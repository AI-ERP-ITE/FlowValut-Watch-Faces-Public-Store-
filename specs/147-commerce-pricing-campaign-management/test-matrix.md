# Spec 147 — Acceptance Test Matrix

| Scenario | Public display | Paddle selection | Required result |
|---|---|---|---|
| No campaign | Standard | Standard Price ID | Exact match |
| Store-wide campaign | Promotional | Promotional Price ID | All eligible Offers match |
| One Offer campaign | Promo only for target | Per-Offer active ID | Non-targets unchanged |
| Collection campaign | Promo for resolved collection Offers | Per-Offer active IDs | Preview equals mutation set |
| Variant/edition campaign | Promo only for resolved hierarchy | Per-Offer active IDs | Other variants unchanged |
| Higher-specificity overlap | Winning specific campaign | Winning Price ID | Deterministic |
| Equal conflict | No change | No change | Activation blocked |
| Scheduled start | Old price until start | Old active ID | Browser not required |
| Scheduled end | Standard/next campaign after end | Matching active ID | Browser not required |
| Paddle partial failure | Last ready price or unavailable | No unverified switch | Never mismatch |
| Retry | Same Product reused | Correct replacement Price | No duplicate Product |
| Rollback | Prior revision | Prior resolved Price | Audited new revision |
| Historical order | Original charged amount | Original Product/Price IDs | Never rewritten |
| Cross-environment request | No change | No change | Rejected |

Every displayed amount must be compared against Paddle-returned formatted totals. Frontend math or reformatting of Paddle-formatted strings is forbidden.
