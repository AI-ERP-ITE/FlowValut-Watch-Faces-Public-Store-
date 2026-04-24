# Implementation Plan: Shadow Clamp (Black Threshold)

## Scope
Implement Shadow Clamp in BackgroundPhotoEditor preview and save pipelines, integrated with existing adjustment workflow and flicker analysis.

## Steps
1. Add local state shadowClamp with default 47.
2. Add reusable hard clamp helper for ImageData.
3. Insert clamp in preview render pipeline after final adjustments and before analyzeFlicker.
4. Insert clamp in save/export pipeline to keep output aligned with preview.
5. Add Detail slider UI under Sharpness with range 30-60 and step 1.
6. Ensure reset restores shadowClamp to default.
7. Build and verify no TypeScript errors.

## Success Criteria
- Slider updates canvas and flicker output in real time.
- Flicker panel reflects clamped buffer analysis.
- Build passes.
