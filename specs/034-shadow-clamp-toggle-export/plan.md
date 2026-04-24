# Plan: Optional Shadow Clamp with Export Apply

1. Add `shadowClampEnabled` state (default false).
2. Add Detail toggle UI for enabling/disabling clamp behavior.
3. In preview pipeline, apply clamp only when enabled, then run flicker analysis.
4. In save/export pipeline, apply clamp only when enabled.
5. Keep reset action restoring both threshold and toggle defaults.
6. Run build and verify no regressions.
