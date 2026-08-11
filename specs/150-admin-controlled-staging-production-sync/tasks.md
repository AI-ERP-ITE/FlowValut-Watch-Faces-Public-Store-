# Spec 150 Tasks

- [x] Implement the typed closed promotion registry and deterministic environment map.
- [x] Implement policy/state tests, including illegal step skipping and Admin edit restrictions.
- [x] Generate `flowvault-release.json` with Sync ID, commits, artifact hash, and complete file hashes.
- [x] Implement authenticated `adminDeploymentSync` discovery, audit, state, and protected-config API.
- [x] Add the five-step private Admin panel and per-part validation checklist.
- [x] Deploy the control endpoint and immutable manifest to isolated staging.
- [x] Formally compile/release Firestore rules, indexes, and Storage rules in staging.
- [x] Add and deploy production-only Live Paddle catalog, webhook, and disabled-checkout endpoints.
- [x] Verify production checkout stops before order creation and unsigned webhook input is rejected.
- [x] Record owner acceptance to reuse the existing GitHub token; keep it secret-bound and never display it.
- [ ] Finish the trusted runner/callback and production-preview transition.
- [x] Persist the Live Paddle browser token as protected public configuration.
- [x] Reconcile approved public catalog definitions and Paddle Live mappings; verify normalized public-definition parity and preserve excluded operational records.
- [ ] Run the missing declined-card staging test and FVIP reuse-rejection evidence without repeating accepted successful purchases.
- [ ] Complete all 17 review gates and create the isolated production preview.
- [ ] Owner accepts preview.
- [ ] Stop and request owner confirmation before production live-channel sync, Namecheap DNS, or a real Paddle payment.
