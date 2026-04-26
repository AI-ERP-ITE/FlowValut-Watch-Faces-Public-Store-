# Feature Specification: Lab Auto-Sync + Backend Token Bridge

**Feature Branch**: `[041-lab-auto-sync-backend-token]`  
**Created**: 2026-04-26  
**Status**: Draft

## Risk Flags (Required First)
1. Backend write endpoint with a repo token is a high-value target; unauthenticated write access can be abused.
2. CORS alone is not full security; requests can be replayed outside browser contexts.
3. Private repo usage increases blast radius if backend token leaks or endpoint is misconfigured.

## Problem Statement
Lab assets (icons, pointers, fonts) are browser-local only. Sync between devices is manual and inconsistent. Browser token storage is unsafe for project-level GitHub automation.

## Goal
1. Auto-pull and auto-push Lab assets using backend-managed GitHub token only.
2. Keep separate repo paths per Lab asset type.
3. Preserve existing Lab save/delete UX while adding background sync.

## Functional Requirements
1. The backend MUST keep GitHub token in server environment variables only (never in browser).
2. The backend MUST expose allowlisted read/write endpoints for repository contents and Lab manifests.
3. Lab sync MUST use separate paths:
   - `docs/studio/lab/icons/index.json`
   - `docs/studio/lab/hands/index.json`
   - `docs/studio/lab/fonts/index.json`
4. Icon Lab MUST auto-pull cloud state on open when backend URL is configured.
5. Icon Lab MUST auto-push changed asset types with debounce after local save/delete.
6. Font sync MUST preserve binary payloads through reversible serialization.

## Acceptance Criteria
1. Saving or deleting icons/pointers/fonts triggers background sync to the corresponding repo path.
2. Opening Icon Lab on another browser session pulls and hydrates synced assets.
3. No GitHub token input is required for Lab sync in browser runtime.
4. Backend path validation blocks writes outside approved prefixes.
