# 20 - T-041 Live Repro Verification

Date: 2026-05-07
Task: T-041 Live repro verification
Status: Done

## Route verification
Verified live HTML on all required routes:
1. `https://ai-erp-ite.github.io/Watch-Faces/`
2. `https://ai-erp-ite.github.io/Watch-Faces/?p=/studio`
3. `https://ai-erp-ite.github.io/Watch-Faces/?p=/studio/parametric`

All routes returned:
1. JS hash: `index-DTSnu2uU.js`
2. CSS hash: `index-CrlChUe_.css`

## Asset HEAD checks
1. `https://ai-erp-ite.github.io/Watch-Faces/assets/index-DTSnu2uU.js` -> 200
2. `https://ai-erp-ite.github.io/Watch-Faces/assets/index-CrlChUe_.css` -> 200
3. `https://ai-erp-ite.github.io/Watch-Faces/assets/tablerIconRenderer-DYZseAfo.js` -> 200

## Propagation note
1. First live read returned older hash (`index-BWUPkOsR.js`).
2. Recheck with cache-busted requests confirmed deployment propagation to new hash.

## Outcome
Live deployment is serving the new private bundle and required assets are available. T-041 done.
