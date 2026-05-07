# Spec 078 - True Mask Editable Visibility Field

Purpose:
Replace compositing-like mask accumulation with direct editable scalar mask field behavior.

Core rule:
Masks are editable visibility fields, not blended transparency layers.

Workflow rule:
Tasks are executed strictly one-by-one.
After each task: report evidence and wait for user approval before next task.
