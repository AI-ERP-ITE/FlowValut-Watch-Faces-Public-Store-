# Deploy Runbook (Speckit-Aligned)

## Objective
Deploy safely with explicit build target, commit segregation, artifact parity, and live verification.

## Repo/Path Invariants
1. Git repo root for deployment operations: `app/`
2. Source path: `app/src/`
3. Build output: `app/dist/`
4. Deploy path: `app/docs/`
5. This topology requires root mirror parity when serving root entrypoint (`--mirror-root` behavior):
   - root `index.html`
   - root `assets/**`

## Mandatory Build Target Rule
1. Do not use ambiguous default build for deployment validation.
2. Use explicit target:
   - `npm run build:public`
   - `npm run build:private`

## Private Build Preflight (required for private target)
1. Required env vars:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
2. Run:
```powershell
node scripts/requirePrivateFirebaseEnv.mjs
```
3. If preflight fails, private deployment is blocked.

## Recommended Deploy Commands
From `app/`:
```powershell
# private target deploy
npm run deploy:docs:private

# public target deploy
npm run deploy:docs:public
```
Fallback/manual sync (equivalent flow):
```powershell
node scripts/deployDistToDocs.mjs --target=<public|private> --mirror-root
```

## Manual Artifact Sync Logic (if needed)
```powershell
$app = ((git rev-parse --show-toplevel).Trim()) -replace '/', '\\'
if ((Split-Path -Path $app -Leaf) -ne 'app') { throw "Wrong repo root: $app" }

# docs artifacts
Copy-Item "$app\dist\assets\*" "$app\docs\assets\" -Force
Copy-Item "$app\dist\index.html" "$app\docs\index.html" -Force
Copy-Item "$app\dist\index.html" "$app\docs\studio\index.html" -Force

# root mirror artifacts (required by repo topology when root serves traffic)
Copy-Item "$app\dist\index.html" "$app\index.html" -Force
Copy-Item "$app\dist\assets\*" "$app\assets\" -Force
Get-ChildItem "$app\docs\assets\" | Where-Object { -not (Test-Path "$app\dist\assets\$($_.Name)") } | Remove-Item -Force
Get-ChildItem "$app\assets\" | Where-Object { -not (Test-Path "$app\dist\assets\$($_.Name)") } | Remove-Item -Force
```

## Hash Parity Gates (mandatory)
1. Website and studio entrypoints must reference same JS hash.
2. Root and docs entrypoints must reference existing asset hashes.
3. No production HTML may contain `/src/main.tsx`.

Check parity:
```powershell
$webJs = (Select-String -Path "docs/index.html" -Pattern "index-[A-Za-z0-9_-]+\.js" | Select-Object -First 1).Matches.Value
$studioJs = (Select-String -Path "docs/studio/index.html" -Pattern "index-[A-Za-z0-9_-]+\.js" | Select-Object -First 1).Matches.Value
if ($webJs -ne $studioJs) { throw "Deploy blocked: docs hash mismatch" }
```

## Commit Segregation Policy (mandatory)
1. Never mix docs/spec files with implementation runtime files in one commit.
2. For docs/spec-only deployment package:
   - include only `app/specs/**` and related markdown docs.
3. If root repo pointer update is required, do separate root-pointer-only commit.

## Commit/Push Commands
From `app/` for docs/spec-only package:
```powershell
git add app/specs/066-dual-shape-controller-source-routing
# if running in app repo root, use: git add specs/066-dual-shape-controller-source-routing

git commit -m "Spec 066: dual-shape controller source routing package"
git push origin main
```

## Live Verification Logic
1. Verify website and studio entrypoints resolve to matching hashed assets.
2. Verify referenced JS/CSS URLs return HTTP 200.
3. Deep-route verification on GitHub Pages should use SPA redirect path too:
   - `/Watch-Faces/?p=/studio`
   - direct `/Watch-Faces/studio` alone can 404 under SPA fallback and is not standalone failure proof.

## Deployment Failure Conditions
1. Mixed commit classes (docs + implementation together).
2. Hash mismatch between website/studio entries.
3. Root/docs hash drift in mirrored topology.
4. Production HTML points to `/src/main.tsx`.
5. Hash URLs not live (non-200).

## Completion Criteria
1. Build target explicit and successful.
2. Artifacts synced with parity.
3. Commit class clean and pushed.
4. Live verification checks pass.
