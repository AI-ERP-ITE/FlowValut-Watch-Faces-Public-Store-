# Implementation Plan

1. Add a persisted optional boolean to `WatchFaceElement`.
2. Add a Weekday/Month-only switch in `PropertyPanel`.
3. Extract the Spec 129 binary-alpha finalizer into a pure utility.
4. Invoke it after label rasterization and before PNG encoding only when the
   element toggle is enabled.
5. Add pure-function, persistence, and source integration tests.
6. Run private build and deploy through the canonical private deployment flow.

