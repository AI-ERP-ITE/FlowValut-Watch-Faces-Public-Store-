# Spec 063: Lighting Owner State Machine

## Goal
Implement strict ownership between circumference light direction and 3D depth lighting so only one controller affects render at a time.

## Core Rules
1. If 3D depth is OFF, circumference light direction is enabled and active.
2. If 3D depth is ON, circumference light direction is disabled and inactive.
3. No lighting presets for direction; direction is manual and continuous.
4. Depth presets set all depth controls and then become custom after manual edits.

## Planned Tasks
1. Data model updates for ownership and active/inactive serialization.
2. UI state machine for enable/disable and dim behavior.
3. Renderer routing so only active owner drives lighting.
4. Depth preset inheritance behavior and custom-state transition.
5. Validation: typecheck, build, deploy, and route verification.
