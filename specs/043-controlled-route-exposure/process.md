# Process: Controlled Route Exposure

1. Analyze current router and identify private route imports.
2. Introduce build-target-controlled route module selection.
3. Keep public module free of private route registration.
4. Apply UX auth guard for private routes only.
5. Remove frontend direct-write fallbacks to GitHub for sensitive operations.
6. Build and validate both targets.
7. Document deployment guidance in implementation checklist.
