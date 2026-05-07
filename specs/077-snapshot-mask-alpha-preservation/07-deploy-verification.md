# 07 - Deploy Verification

## Pre-Deploy

1. Run focused tests for snapshot/mask/renderer paths.
2. Confirm no relevant errors in changed files.
3. Ensure root entry is build-compatible before running deploy script.

## Deploy Steps

1. Run private deploy command.
2. Verify docs and root mirror are updated.
3. Confirm new bundle hash appears in docs and root entries.

## Post-Deploy

1. Verify route: /Watch-Faces/studio/parametric/
2. Verify auth-gated private shell still loads latest bundle.
3. Record implementation commit hash, deploy commit hash, bundle hash.
