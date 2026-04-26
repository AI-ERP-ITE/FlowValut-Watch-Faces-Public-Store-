# Process: Lab Auto-Sync + Backend Token Bridge

## Objective
Add secure(ish) backend-token sync for Lab assets while preserving existing local editing workflows.

## Process Rules
- Follow specsmd-mater stage order.
- Keep token logic server-side only.
- Reject repository writes outside allowlisted paths.
- Keep existing Lab save/delete behavior intact.

## Backend Rules
1. Read/write operations are limited to approved paths.
2. CORS and origin checks must be applied for browser usage.
3. Missing backend env vars must fail fast with explicit errors.

## Lab Sync Rules
1. Pull executes once when Icon Lab opens and backend URL exists.
2. Push executes per asset type (`icons`, `hands`, `fonts`) with debounce.
3. Fonts are serialized as Base64 and reconstructed losslessly.
