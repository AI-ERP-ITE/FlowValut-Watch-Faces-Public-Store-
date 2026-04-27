# Plan: AOD Background Modes

## Implementation Plan
1. Extend shared types/state to store AOD background mode and optional payloads (image/color).
2. Add AOD-mode-only UI section in studio panel for selecting background strategy.
3. Reuse existing upload/crop/photo-edit pipeline for dedicated AOD background asset path.
4. Add solid-color AOD rendering path with deterministic full-screen output.
5. Add no-background path that emits no AOD background widget.
6. Wire preview rendering so MAIN and AOD previews resolve different background sources.
7. Update export build config and asset assembly to include AOD background data when needed.
8. Update JS/ZPK generation to consume explicit AOD background strategy.
9. Improve error classification in generation flow (design validation vs backend upload).
10. Update source.json read/write for full round-trip persistence.
11. Validate with TypeScript/Problems scan on touched files.

## Scope Guard
- Keep main background requirement unchanged in this pass.
- Do not alter private/public route exposure behavior.
- Do not change backend bridge implementation in this feature.
