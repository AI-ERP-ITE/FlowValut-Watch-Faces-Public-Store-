# 18 - T-073 Deployment Evidence Capture

## Task

T-073 Deployment evidence capture.

## Goal

Record commit hashes and bundle hash evidence for deployed state.

## Git Evidence

Current branch/head:

1. Branch: `main`
2. HEAD: `eac483fe5bc706b7c3cd8c46eb668272fba28bdd`

Recent deployment-related commits:

1. `eac483f` - fix: mirror studio routes in root deploy
2. `1864561` - fix: publish direct studio parametric route entry
3. `e64295f` - feat: complete snapshot stability gates through T-072 checks and deploy sync

Remote alignment:

1. `origin/main` points to `eac483f`.

## Live Bundle Evidence

Live root probe result:

```json
{"status":200,"live_js":"index-Bft5S59Y.js","live_css":"index-CrlChUe_.css","len":3722}
```

Deployed asset family verified 200:

1. `/Watch-Faces/assets/index-Bft5S59Y.js`
2. `/Watch-Faces/assets/index-CrlChUe_.css`
3. `/Watch-Faces/assets/index-uKNApi86.js`
4. `/Watch-Faces/assets/tablerIconRenderer-DWXkuZ5s.js`

## Route Evidence (Final T-072 recheck dependency)

1. `/Watch-Faces/` -> 200
2. `/Watch-Faces/?p=/Studio` -> 200
3. `/Watch-Faces/?p=/Studio/parametric` -> 200
4. `/Watch-Faces/studio/parametric` -> 200 (via canonical redirect to trailing slash)

## T-073 Conclusion

T-073 acceptance met.

1. Commit hash evidence captured.
2. Live bundle hash evidence captured.
3. Route + asset evidence linked to deployed commit state.
