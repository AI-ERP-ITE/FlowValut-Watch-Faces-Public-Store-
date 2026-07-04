# specs/112-v3-target-platform-schema-alignment/tasks.md

## Task Checklist

- [x] T001 Create spec pack (plan/spec/tasks).
- [x] T002 Implement V3 module placement under targets.default.module.
- [x] T003 Implement st/sr platform fields for V3 platforms entries.
- [x] T004 Keep deviceSource and path watchface/index compatibility.
- [x] T005 Run build validation (npm run build:private).
- [x] T006 Verify emitted V3 manifest shape with quick generator probe.
- [x] T007 Record completion status and evidence.

## Execution Log

- T001 done: created plan.md, spec.md, tasks.md in specs/112-v3-target-platform-schema-alignment.
- T002 done: moved watchface module block from root into targets.default.module in V3 app.json generation.
- T003 done: added st/sr fields to each platform item via V3-only helper mapping logic.
- T004 done: retained deviceSource and watchface path watchface/index in emitted manifest.
- T005 done: npm run build:private succeeded after patch.
- T006 done: probe output confirmed HAS_TARGET_MODULE=true, HAS_ROOT_MODULE=false, PLATFORM_ST=r, PLATFORM_SR=w480, WATCHFACE_PATH=watchface/index.
- T007 done: all tasks complete; V2 generator file untouched.
