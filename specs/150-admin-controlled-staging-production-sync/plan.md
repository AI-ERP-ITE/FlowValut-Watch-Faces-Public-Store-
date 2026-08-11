# Spec 150 Implementation Plan

1. Define one typed, closed promotion registry with six treatments: copy exactly, fixed map, environment adjustment, protected Admin value, secret reference, and never copy.
2. Generate an immutable Sync ID and complete Hosting file manifest for every staging artifact.
3. Store Sync state, gate evidence, protected public configuration, and audit rows in server-only Firestore collections.
4. Add the five owner confirmations to the private Admin URL.
5. Add a trusted runner that promotes only the frozen release, validates normalized parity, creates a production preview, and records rollback evidence.
6. Configure Live Paddle catalog mappings and browser token independently; never move Sandbox objects or credentials.
7. Validate staging gates, then create an isolated production preview. Stop before DNS and any real payment.

The runner fails closed when source cannot be reproduced, a policy item is unknown, a required gate lacks evidence, an excluded data class is present, or checkout/DNS/payment authorization is absent.
