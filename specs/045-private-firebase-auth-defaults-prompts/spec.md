# Feature Specification: Prompt-Level Firebase Private Auth Defaults

**Feature Branch**: `[045-private-firebase-auth-defaults-prompts]`
**Created**: 2026-04-27
**Status**: Draft

## Problem Statement
Future agent runs can drift on private auth behavior, causing blank pages, missing login flow, or reintroduction of browser token dependency when implementing unrelated features.

## Goal
Encode private Firebase auth and backend-bridge expectations into Speckit prompts so any future implementation task defaults to the correct private-route behavior.

## Functional Requirements
1. A canonical Speckit master prompt MUST exist and be referenced by `specsmd-master.prompt.md`.
2. Prompt workflow MUST classify tasks by domain (private route, public storefront, shared core).
3. For private-route tasks, prompts MUST enforce these defaults:
   - `/login` route exists
   - private routes are auth-guarded
   - redirect preserves intended destination (`next` path)
   - missing Firebase config shows explicit guidance UI, not blank page
4. Prompt guidance MUST document where Firebase web config values are retrieved in Firebase Console.
5. Prompt guidance MUST require Google sign-in and authorized domain setup for GitHub Pages domain.
6. Prompt guidance MUST require backend bridge URL for sensitive private operations and disallow browser PAT dependency by default.

## Non-Goals
1. Rewriting runtime auth implementation in this spec task.
2. Changing public storefront auth model.
3. Changing backend function code.

## Acceptance Criteria
1. `.github/prompts/specsmd-master.prompt.md` routes through a canonical master prompt.
2. `.github/prompts/speckit.master.prompt.md` exists and contains private auth defaults and Firebase value-source guidance.
3. Future agent runs via `specsmd-master.prompt.md` include private auth default behavior without manual re-explanation.
