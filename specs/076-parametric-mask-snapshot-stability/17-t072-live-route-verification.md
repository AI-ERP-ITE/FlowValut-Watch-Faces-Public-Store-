# 17 - T-072 Live Route Verification

## Task

T-072 Live route verification.

## Goal

Verify required live URLs load and deployed asset URLs return HTTP 200.

## Checks Executed

### Required route URLs

1. `https://ai-erp-ite.github.io/Watch-Faces/`
2. `https://ai-erp-ite.github.io/Watch-Faces/?p=/Studio`
3. `https://ai-erp-ite.github.io/Watch-Faces/?p=/Studio/parametric`
4. `https://ai-erp-ite.github.io/Watch-Faces/studio/parametric`

Observed:

```json
{"Url":"https://ai-erp-ite.github.io/Watch-Faces/","Status":200,"Length":3720,"HasRoot":true,"LoginLike":false}
{"Url":"https://ai-erp-ite.github.io/Watch-Faces/?p=/Studio","Status":200,"Length":3720,"HasRoot":true,"LoginLike":false}
{"Url":"https://ai-erp-ite.github.io/Watch-Faces/?p=/Studio/parametric","Status":200,"Length":3720,"HasRoot":true,"LoginLike":false}
{"Url":"https://ai-erp-ite.github.io/Watch-Faces/studio/parametric","Status":"ERROR","Message":"The remote server returned an error: (404) Not Found."}
```

### New deployed asset URLs expected from local T-070/T-071 output

1. `https://ai-erp-ite.github.io/Watch-Faces/assets/index-Bft5S59Y.js`
2. `https://ai-erp-ite.github.io/Watch-Faces/assets/index-CrlChUe_.css`
3. `https://ai-erp-ite.github.io/Watch-Faces/assets/index-uKNApi86.js`
4. `https://ai-erp-ite.github.io/Watch-Faces/assets/tablerIconRenderer-DWXkuZ5s.js`

Observed:

```json
{"Url":"https://ai-erp-ite.github.io/Watch-Faces/assets/index-Bft5S59Y.js","Status":"ERROR","Message":"The remote server returned an error: (404) Not Found."}
{"Url":"https://ai-erp-ite.github.io/Watch-Faces/assets/index-CrlChUe_.css","Status":"ERROR","Message":"The remote server returned an error: (404) Not Found."}
{"Url":"https://ai-erp-ite.github.io/Watch-Faces/assets/index-uKNApi86.js","Status":"ERROR","Message":"The remote server returned an error: (404) Not Found."}
{"Url":"https://ai-erp-ite.github.io/Watch-Faces/assets/tablerIconRenderer-DWXkuZ5s.js","Status":"ERROR","Message":"The remote server returned an error: (404) Not Found."}
```

### Live root currently references (remote state probe)

Extracted from current live root HTML:

1. JS: `index-CDJ9EufH.js`
2. CSS: `index-BztddQwl.css`

Both return 200, confirming live site is still on previous bundle.

## Diagnosis

T-072 blocked by deployment state mismatch:

1. Local docs sync completed (T-071), but changes are not yet reflected on GitHub Pages live host.
2. As a result, required new asset URLs 404 on live.
3. Direct route `.../studio/parametric` currently 404 on live.

## T-072 Status

Blocked.

Done criteria not met yet because all required target routes/assets are not HTTP 200 on live host.

## Unblock Action

1. Push deployment commits to remote branch used by GitHub Pages.
2. Wait for Pages publish.
3. Re-run T-072 URL and asset checks.
