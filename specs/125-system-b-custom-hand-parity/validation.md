# Validation Checklist

- [x] Every `InteractiveCanvas` in the composer receives `customHandStyles`.
- [x] Main and AOD pointer elements are hydrated.
- [x] FVWC contains only custom hand records referenced by its source builds.
- [x] Old FVWC files without `customHandStyles` load with an empty collection.
- [x] Missing custom hand records produce an explicit import/load failure.
- [x] Unit tests pass.
- [x] Production build passes.
- [ ] Live entrypoint and hashed assets return HTTP 200.
