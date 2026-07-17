# Spec 122 — Deployment Runbook

## Order

1. Complete implementation and local validation for the approved phase.
2. Load and validate private Firebase environment variables.
3. Run Firebase CLI preflight through `npx` with explicit project.
4. Build Firebase Functions.
5. Deploy only changed Functions first.
6. Deploy Firestore rules/indexes or Storage rules explicitly when changed.
7. Verify Functions and frontend/backend environment contracts.
8. Run canonical public/private builds.
9. Run the atomic public deploy, which also restores the private bundle.
10. Verify both remotes and live sites.

## Firebase commands

Run from the appropriate Firebase directories:

```powershell
npx -y firebase-tools@latest --version
npm run build
npx -y firebase-tools@latest deploy --project <project-id> --only "functions:<changedA>,functions:<changedB>"
npx -y firebase-tools@latest functions:list --project <project-id>
```

If rules/indexes change:

```powershell
npx -y firebase-tools@latest deploy --project <project-id> --only firestore:rules,firestore:indexes
npx -y firebase-tools@latest deploy --project <project-id> --only storage
```

## Pages command

After all required approval and validation gates:

```powershell
npm run deploy:full:public
```

This pushes the public artifact bundle to `public/main`, rebuilds the private bundle, and pushes the private restoration to `origin/main`. Docs-only deploy scripts are forbidden.

## Required verification report

- Firebase project and exact endpoints deployed
- Successful deploy output per endpoint/rules surface
- `functions:list` result
- Public remote commit
- Origin remote commit
- Public bundle hash
- Private bundle hash
- HTTP status for public homepage and `catalog.json`
- HTTP status/hash verification for private root and SPA redirect routes
- Successful Workshop create/open test
- Successful metadata-only release/parity test
- Successful legacy route/order/download test

