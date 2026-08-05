# Spec 138 Implementation Plan

1. Define one pure watch-test value policy and export-only element marker.
2. Apply it after FVWF persistence and before digit asset/layout generation.
3. Teach the ZPK generator to emit static image-text date, time, and numeric
   widgets when the marker exists.
4. Restore manual date/time canvas samples and verify source-state isolation.
5. Build, deploy the private Studio, and inspect the generated bundle.

