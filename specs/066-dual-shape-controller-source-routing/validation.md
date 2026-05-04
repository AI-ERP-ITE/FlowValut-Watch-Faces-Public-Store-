# Validation Gates (066)

## Stage Gates
1. Contract gate: each controller group has declared source (`geometry`, `silhouettePath`, `silhouetteAlpha`, `postComposite`).
2. Safety gate: no stack reorder and no pivot/transform semantic change.
3. Surface gate: mask does not overwrite original geometry source.

## Build/Type Gates
1. `npx tsc -b` passes.
2. Project build target used explicitly when deployment validation is run (`npm run build:public` or `npm run build:private`).

## Behavior Gates
1. Masked-edge depth/shadow/light response follows final silhouette.
2. Texture/gradient/material placement parity with baseline preserved.
3. Post-composite grading controls still apply at final composite stage.

## Deployment Gates
1. Deploy artifacts are committed from `app/docs/**` and (when mirrored) root `index.html` + root `assets/**`.
2. Website and studio entrypoints reference matching hashed bundle.
3. Referenced JS/CSS hash URLs return HTTP 200.
4. Entry HTML must not reference `/src/main.tsx`.
