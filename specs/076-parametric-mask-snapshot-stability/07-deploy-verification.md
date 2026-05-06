# 07 - Deploy and Verification Protocol

## Target Classification

This work targets PRIVATE route family:

1. Remote: `origin`
2. Base: `/Watch-Faces/`
3. Route family: `/Studio` and `/studio/parametric` checks as required by existing project behavior.

## Build and Deploy Requirements

1. Build with project-approved scripts.
2. Ensure docs deployment targets receive updated hashed assets.
3. Ensure both main index and studio index reference new hashes.
4. Remove stale hashed assets no longer referenced.

## Required Live Verification URLs

1. `https://ai-erp-ite.github.io/Watch-Faces/`
2. `https://ai-erp-ite.github.io/Watch-Faces/?p=/Studio`
3. `https://ai-erp-ite.github.io/Watch-Faces/?p=/Studio/parametric`
4. `https://ai-erp-ite.github.io/Watch-Faces/studio/parametric`

## Required Checks

1. Hard refresh and incognito verification.
2. Hashed JS/CSS URLs return HTTP 200.
3. Parametric page loads without auth-route mismatch.
4. Core scenario smoke test on deployed build.

## Deployment Evidence

Record all of the following:

1. Commands executed.
2. Remote pushed.
3. Commit hash(es).
4. New bundle hash(es).
5. URL-by-URL verification outcomes.
