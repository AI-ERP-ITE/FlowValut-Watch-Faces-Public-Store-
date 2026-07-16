# Spec 121 — PNG Hand Hub Device Normalization

## Status

**Complete — implemented, validated, privately deployed, and closed on 2026-07-16.**

Implementation commit: `2a9c7fee`

Private deployment commit: `17c51703` (`index-SUaR0KS2.js`)

## Problem

PNG Hand Pack sources are retained as high-resolution editable masters. Hour, minute, and second masters are normalized into fixed device assets, but the hub was baked using its opaque master pixels as one-to-one device pixels. A 2× pack therefore produced a hub approximately twice the intended size on the Interactive Canvas and on the watch even though its all-master composer preview looked proportionate.

## Goal

Normalize only PNG Hand Pack hubs from master space into device space while preserving the existing HTML/SVG hub behavior, pointer pivots, time-pointer center logic, and Zepp `TIME_POINTER` runtime contract.

## Requirements

1. Derive the PNG pack's master-to-device scale from the three existing hand output heights: 140, 200, and 240 pixels.
2. Use the median height conversion so a single unusually cropped master cannot dominate the hub size.
3. Apply the conversion only to the baked hub output and its stored `coverWidth`/`coverHeight`.
4. Preserve the original hub PNG master unchanged for future editing and Firebase source sync.
5. Leave HTML/SVG hubs on their established authored logical-size path.
6. Preserve existing PNG records unchanged because some contain manually reduced hub masters; apply normalization only when a pack is created or deliberately updated.
7. Keep Interactive Canvas and ZPK export on the same normalized baked hub asset and dimensions.

## Acceptance Criteria

1. A 2× pack whose hand art heights are 280, 400, and 480 maps a 60×60 hub master to a 30×30 device hub.
2. A 1× pack whose hand art heights are 140, 200, and 240 keeps a 30×30 hub at 30×30.
3. Non-square hub aspect ratio is preserved.
4. Existing PNG records do not auto-migrate or change appearance.
5. Existing HTML/SVG records do not enter the PNG migration.
6. TypeScript, the repository verifier, and the private production build pass.

## Non-Goals

- Repairing Golden 01/02 source-image positioning.
- Changing time-pointer center calculations or rearrangement behavior.
- Changing HTML/SVG pointer rendering.
- Changing Firebase authorization, storage paths, or Zepp generator contracts.

## Closure

All requirements are implemented. TypeScript/private production compilation passed, the repository verifier passed 52/52 checks, and the canonical private deployment pushed matching root, Studio, and Parametric entrypoints. Existing HTML/SVG hubs remain on render version 4; newly created or deliberately updated PNG hubs use render version 5. Older PNG records are preserved to avoid double-scaling manually corrected masters.
