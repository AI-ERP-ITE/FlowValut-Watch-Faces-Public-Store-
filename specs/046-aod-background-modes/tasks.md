# Tasks: AOD Background Modes

## Planned Tasks

- [ ] T001 Add AOD background mode fields to shared config/types.
- [ ] T002 Add AOD background mode controls in AOD editor UI.
- [ ] T003 Add AOD background upload path using existing crop/editor tooling.
- [ ] T004 Add AOD solid-color option and preview representation.
- [ ] T005 Add AOD no-background (black) option behavior.
- [ ] T006 Route preview background resolution by active mode + selected AOD strategy.
- [ ] T007 Update export pipeline to package AOD background assets conditionally.
- [ ] T008 Update code generator to emit AOD background behavior per mode.
- [ ] T009 Split generation errors into design validation vs backend upload failures.
- [ ] T010 Persist/recover AOD background settings through source.json round-trip.
- [ ] T011 Validate with TypeScript/Problems scan on all touched files.

## Verification Checklist

- [ ] V001 AOD mode selector appears only in AOD editor context.
- [ ] V002 Upload AOD background affects AOD only; MAIN remains unchanged.
- [ ] V003 Solid color fills full AOD canvas in preview and export.
- [ ] V004 None/black mode emits no AOD background asset/widget.
- [ ] V005 Build/export still succeeds with unchanged main background path.
- [ ] V006 Error copy distinguishes missing design inputs from backend bridge failures.
- [ ] V007 Round-trip load restores selected AOD background mode + payload.
