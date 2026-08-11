# Spec 151 — Firebase Staging Release Promotion

## Status

Approved for immediate corrective implementation on 2026-08-11. Production,
DNS, and real Paddle payments remain stopped gates.

## Corrected business flow

Firebase staging is the source of truth after deployment:

1. Public Store code is built and deployed to the isolated Firebase staging
   project.
2. The owner tests that deployed cloud website.
3. Test Accepted freezes the exact Firebase staging release and its complete
   manifest.
4. Review reads and verifies that frozen Firebase release.
5. Production Preview mirrors the frozen release and applies only the fixed,
   documented production environment mapping.
6. Sync promotes the accepted Preview without rebuilding.

GitHub is used only before staging deployment to version source. Review,
Preview, and Sync must not check out, rebuild, or copy application code from
GitHub.

## Isolation rule

The Public Store staging **release unit** is isolated before Sync. It consists
of Public Store Hosting plus a separately packaged `storefront` backend
codebase. Studio, creator, widget, ZPK/FVWF, Parametric, Workshop, and unrelated
Admin code are built/deployed separately and are not members of that release
unit.

Sync does not maintain a blacklist of Studio URLs, widget names, font names, or
creator file extensions. It mirrors every file in the accepted Public Store
staging manifest. If an unwanted file is present in staging, staging is not
accepted and its build separation must be corrected before creating a Sync ID.

The currently deployed staging release predates this correction and contains a
switcher export and creator fonts. It must be replaced once with a clean Public
Store staging release. This is a staging build-boundary repair, not permanent
filename filtering in Sync.

Read-only Firebase inventory on 2026-08-11 also found 64 Functions in the
staging project, including Studio, Workshop, Parametric, Lab, GitHub bridge, and
unrelated Admin functions. Therefore the Firebase project as a whole is not the
promotion object. Spec 151 creates a separate `storefront` Functions codebase;
Sync mirrors that accepted codebase package exactly and ignores other codebases
by construction, not by scanning their filenames.

## Frozen release package

The staging deployment creates and retains one immutable release package that
contains:

- the exact Hosting files deployed to Firebase staging;
- the separate `storefront` backend package deployed and tested in staging;
- Firestore rules, indexes, and Storage rules used by that staging release;
- a complete path, size, and SHA-256 manifest;
- the runtime-binding schema and fixed staging/production mapping;
- the accepted public catalog/media snapshot where content promotion is needed.

The release package is stored in Firebase/Google Cloud under its release ID.
GitHub commits are audit metadata only and are not a promotion source.

## Exact-copy and fixed-adjustment model

### Copied exactly

- Public Store application JavaScript and CSS.
- Customer-facing layouts, text, purchase, fulfillment, recovery, and transfer
  logic.
- Public product media and accepted public catalog snapshot.
- the complete accepted `storefront` backend codebase package.
- Security rules and indexes associated with the Public Store package.

### Fixed environment bindings

Only this versioned map may differ:

- staging Firebase project → production Firebase project;
- staging Functions origin → production Functions origin;
- staging Hosting origin → production canonical origin;
- Paddle Sandbox → Paddle Live;
- Sandbox browser token → protected Live browser token;
- Sandbox API/webhook secret references → production secret references;
- staging CORS origins → fixed production origins;
- staging `noindex` → production canonical/indexing behavior;
- staging email label → production email label;
- Live checkout remains disabled until the separate real-payment approval.

These bindings live outside invariant application code. A binding change creates
a new configuration version and invalidates prior Review/Preview acceptance.

### Never copied

- customers, transactions, orders, entitlements, counters, reservations;
- webhook/idempotency history and notification history;
- Firebase Auth users;
- private Storage objects and temporary customer delivery artifacts;
- Sandbox or production secret values and Paddle transactions.

## Sync identity and state

A Sync ID binds to:

- Firebase staging Hosting release ID;
- immutable release-package URI and SHA-256;
- complete Hosting manifest hash;
- backend package hash;
- rules/index hashes;
- public content snapshot hash;
- environment-map version;
- protected production configuration version.

States:

1. `STAGING_DEPLOYED`
2. `TEST_ACCEPTED`
3. `REVIEW_PASSED`
4. `PRODUCTION_PREVIEW_READY`
5. `PRODUCTION_PREVIEW_ACCEPTED`
6. `PRODUCTION_SYNCED`

Each action is idempotent and protected by a per-Sync-ID operation lock. Any
change to a bound hash or version invalidates downstream acceptance.

## Acceptance criteria

- The replacement staging release contains only the intended Public Store
  deployment produced by the separated public build.
- Test Accepted binds to the actual Firebase staging release, not merely Git
  commit IDs.
- Review, Preview, and Sync contain no GitHub checkout, dependency installation,
  frontend/backend build, or source reconstruction.
- Every mirrored Hosting file matches the accepted staging manifest.
- Public backend deployment uses the retained package that was deployed to
  staging; it is not rebuilt.
- Only the fixed environment-binding documents differ between staging and
  production, and every difference is reported.
- Operational data and secrets are never included in a release package.
- Existing successful checkout/recovery evidence remains accepted unless the
  commerce implementation changes.
- Production, DNS, and real Paddle payments remain unchanged during corrective
  implementation and staging validation.
