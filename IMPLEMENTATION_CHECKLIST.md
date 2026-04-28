# Implementation Checklist
[ ] Caveman say: Before make new logic, always look at similar component pipeline. If other element already do thing, use same way or improve. No reinvent wheel unless must. (Best practice!)

Complete workflow for every bug fix or feature added to this codebase.  
Follow all phases in order — do not skip steps.

---

## Repo & Site Reference

| Item | Value |
|---|---|
| Git repo root | `app/` (NOT workspace root) |
| Current resolved root (this workspace) | `D:\Zepp Watchface maker website\Kimi_Agent_Untitled Chat\app` |
| Source code | `app/src/` |
| Build output | `app/dist/` |
| Deployed folder | `app/docs/` |
| Branch | `main` |
| GitHub repo | https://github.com/AI-ERP-ITE/Watch-Faces |
| Live site | https://ai-erp-ite.github.io/Watch-Faces/ |
| Studio | https://ai-erp-ite.github.io/Watch-Faces/studio/ |

### Repo Guard (Run Before Any Deploy)

```powershell
# You MUST be in app repo, not workspace-root specs repo
$repoRoot = (git rev-parse --show-toplevel).Trim()
$repoRootNorm = $repoRoot -replace '/', '\\'
$repoLeaf = Split-Path -Path $repoRootNorm -Leaf

if ($repoLeaf -ne 'app') {
  throw "Wrong git repo root: $repoRootNorm. Switch to ...\\Kimi_Agent_Untitled Chat\\app before build/deploy."
}

Write-Output "Repo root OK: $repoRootNorm"
```

### Critical Deployment Invariant (Must Always Hold)

- [ ] This repo deploys from `app/docs/` only (there is no `workspace-root/docs/` deploy target)
- [ ] Website route uses `app/docs/index.html`
- [ ] Studio route uses `app/docs/studio/index.html`
- [ ] Both HTML files must point to the latest built asset hash from `app/dist/assets/`
- [ ] If one route is updated and the other is not, deployment is considered failed

### Entry Surface Clarification (Prevent White/Blank Page)

- [ ] If hosting serves from root `index.html`, root `assets/` must mirror `dist/` hashes
- [ ] If hosting serves from `docs/`, both `docs/index.html` and `docs/studio/index.html` must mirror `dist/` hashes
- [ ] Never leave production HTML with `/src/main.tsx` source entry
- [ ] Production HTML must reference `/Watch-Faces/assets/index-*.js` and matching CSS hash

### 404 Triage Guard (Do Not Misdiagnose)

- [ ] A route-level 404 alone is not root cause on GitHub Pages SPA fallback
- [ ] First inspect loaded script src in rendered HTML before concluding failure reason
- [ ] If script src is `/src/main.tsx`, treat as deployment mismatch immediately
- [ ] If script src is hashed asset and still failing, then investigate auth/route/runtime logic

## Build Target Exposure Rules (Public vs Private)

- [ ] Build target is explicitly set before build (`VITE_BUILD_TARGET=public|private`)
- [ ] Public build does not register internal routes (`/studio`, `/studio/lab`, `/admin`, `/tools`)
- [ ] Private build registers internal routes and keeps existing studio/admin behavior
- [ ] Public build is validated using `npm run build:public`
- [ ] Private build is validated using `npm run build:private`

### Build Commands

```powershell
# Public storefront-only build
npm run build:public

# Private internal build
npm run build:private
```

## Backend Authority Rules (Sensitive Operations)

- [ ] Frontend sensitive mutations use backend bridge only
- [ ] No direct GitHub REST write fallback for publish/catalog/lab sync
- [ ] Backend enforces auth + authorization before mutation
- [ ] Backend validates payload schema and allowed writable paths

---

## Phase 1 — Understand & Locate

- [ ] Read the bug report or feature request carefully
- [ ] Identify which source file(s) need changing:
  - Canvas rendering → `src/components/InteractiveCanvas.tsx`
  - Engrave/bake logic → `src/StudioApp.tsx` (`renderEngraveFrameToPng`)
  - ZPK code generation → `src/lib/jsCodeGenerator.ts`
  - Element types / defaults → `src/types/`
  - Property panel UI → `src/components/PropertyPanel.tsx`
- [ ] Read the relevant section of the source file before editing
- [ ] If it touches ZPK output, cross-check against `specs/` or `docs/` spec documents

---

## Phase 2 — Implement

- [ ] Make the TypeScript/TSX changes
- [ ] Do NOT add features, comments, or refactors beyond what was asked
- [ ] For multiple independent edits, use `multi_replace_string_in_file` in one call
- [ ] Include 3–5 lines of context around every replaced string
- [ ] Check for errors after editing:
  ```powershell
  # From app/
  npx tsc --noEmit
  ```

---

## Phase 3 — Build

```powershell
$app = ((git rev-parse --show-toplevel).Trim()) -replace '/', '\\'
if ((Split-Path -Path $app -Leaf) -ne 'app') { throw "Wrong repo root: $app" }
Set-Location $app
npm run build
```

Target-aware build clarification (preferred):

```powershell
# Public storefront-only validation
npm run build:public

# Private internal validation (after env preflight)
npm run build:private
```

- [ ] Exit code 0, no TypeScript errors
- [ ] `dist/assets/index-*.js` has a new hash (different from the previous build)
- [ ] Search compiled output to confirm the fix is present:
  ```powershell
  Select-String "unique string from your fix" dist/assets/index-*.js
  ```

---

## Phase 4 — Deploy to GitHub Pages

```powershell
$app = ((git rev-parse --show-toplevel).Trim()) -replace '/', '\\'
if ((Split-Path -Path $app -Leaf) -ne 'app') { throw "Wrong repo root: $app" }

# Copy assets
Copy-Item "$app\dist\assets\*" "$app\docs\assets\" -Force

# Copy both HTML entry points  ← BOTH are required
Copy-Item "$app\dist\index.html" "$app\docs\index.html" -Force
Copy-Item "$app\dist\index.html" "$app\docs\studio\index.html" -Force

# Optional hotfix parity when root index is observed serving production traffic
Copy-Item "$app\dist\index.html" "$app\index.html" -Force
Copy-Item "$app\dist\assets\*" "$app\assets\" -Force
Get-ChildItem "$app\assets\" | Where-Object { -not (Test-Path "$app\dist\assets\$($_.Name)") } | Remove-Item -Force

# Remove stale hashed assets that no longer exist in dist
Get-ChildItem "$app\docs\assets\" | Where-Object { -not (Test-Path "$app\dist\assets\$($_.Name)") } | Remove-Item -Force

# Enforce JS hash parity between website and studio entries
$webJs = (Select-String -Path "$app\docs\index.html" -Pattern "index-[A-Za-z0-9_-]+\.js" | Select-Object -First 1).Matches.Value
$studioJs = (Select-String -Path "$app\docs\studio\index.html" -Pattern "index-[A-Za-z0-9_-]+\.js" | Select-Object -First 1).Matches.Value
if ($webJs -ne $studioJs) {
  throw "Deploy blocked: docs/index.html ($webJs) != docs/studio/index.html ($studioJs)"
}
Write-Output "Hash parity OK: $webJs"

# Commit and push
git -C $app add -A
git -C $app commit -m "Fix/Feature: <short description>"
git -C $app push origin main
```

- [ ] Both `docs/index.html` and `docs/studio/index.html` updated (forgetting studio = black page)
- [ ] Old hashed asset files removed from `docs/assets/`
- [ ] `git push` succeeded (pull + rebase first if rejected)
- [ ] Verify asset hash matches in both HTML files:
  ```powershell
  Select-String "index-" docs/index.html
  Select-String "index-" docs/studio/index.html
  ```
- [ ] Hash parity gate passed (same JS hash in website and studio entries)
- [ ] Verify BOTH live routes after push (not only homepage):
  ```powershell
  # should load homepage
  start "https://ai-erp-ite.github.io/Watch-Faces/?v=$(Get-Date -Format yyyyMMddHHmmss)"
  # should load studio page with latest JS
  start "https://ai-erp-ite.github.io/Watch-Faces/studio/?v=$(Get-Date -Format yyyyMMddHHmmss)"
  ```

---

## Phase 5 — Run Verify Script

```powershell
cd "D:\Zepp Watchface maker website\Kimi_Agent_Untitled Chat\app"
node scripts/verify.mjs
```

- [ ] All checks pass (0 failed)
- [ ] Inspect `.verify-output/*.png` visually if any rendering tests changed
- [ ] If a new fix was added, add a corresponding test to `scripts/verify.mjs`:
  - Pixel-level canvas checks go in sections 1 or 2
  - Logic / data checks go in sections 3–5
  - Source code presence checks go in section 6

### Current verify.mjs coverage (26 checks)

| Section | What it tests |
|---|---|
| 1. Engrave Frame Baking | Shadow pixels render; fill is present; circle corners are transparent (clipped) |
| 2. Icon Hue/Sat/Colorize | source-atop composite; 100% / 50% opacity blending; no-effect passthrough |
| 3. Week Format Arrays | Full / short / initial labels; undefined defaults to short |
| 4. ZPK Asset Name Patterns | engrave_*.png, weather_N.png, hand *.png naming |
| 5. Custom Hand Key Lookup | Key match → custom dataUrls; unknown key → built-in fallthrough |
| 6. Source Code Assertions | Weather label text; iconLibraryKey refresh; customHandStyles wiring; engrave fill ordering |

---

## Phase 6 — Browser Smoke Test

1. Hard-refresh the live site: `Ctrl + F5` at https://ai-erp-ite.github.io/Watch-Faces/
2. Open the Studio: https://ai-erp-ite.github.io/Watch-Faces/studio/
3. Reproduce the original scenario that triggered the bug
4. Generate a test watchface (.zpk)
5. Extract the .zpk (rename to .zip, open) and inspect generated files:
   - `watchface/index.js` — widget structure, coordinates, asset paths
   - `app.json` — configVersion, targets structure

---

## Phase 7 — Commit Verify Script Updates

If `verify.mjs` was updated:
```powershell
git -C $app add scripts/verify.mjs
git -C $app commit -m "Test: <describe new checks added>"
git -C $app push origin main
```

---

## Common Mistakes — Never Do These

| Mistake | Consequence |
|---|---|
| Building but not copying `dist/` → `docs/` | GitHub Pages serves old code |
| Copying only `docs/index.html`, skipping `docs/studio/index.html` | Studio page goes blank |
| Not removing stale hashed assets from `docs/assets/` | Old JS bundles linger, can cause 404s |
| Pushing without pulling first | Push rejected; lost time |
| Hard-refresh skipped during browser test | Browser cache serves old code, false negative |
| Editing `docs/` at workspace root | Not deployed — wrong folder |
| Declaring success without running `verify.mjs` | Bugs ship undetected |

---

## Quick Reference — Files Most Often Edited

```
app/src/
  StudioApp.tsx                    ← engrave bake, icon library key, element defaults
  components/
    InteractiveCanvas.tsx          ← canvas rendering: icons, hands, colorize, shadows
    PropertyPanel.tsx              ← element property UI, labels, pickers
  lib/
    jsCodeGenerator.ts             ← ZPK watchface/index.js code generation
    customHandStore.ts             ← IndexedDB custom hand records
  types/                           ← WatchFaceElement, EngraveFrame, etc.
scripts/
  verify.mjs                       ← headless test suite (node scripts/verify.mjs)
```
