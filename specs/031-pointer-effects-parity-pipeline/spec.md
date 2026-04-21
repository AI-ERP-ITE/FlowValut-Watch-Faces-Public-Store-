# Feature Specification: Pointer Effects + Parity Pipeline

**Feature Branch**: `[031-pointer-effects-parity-pipeline]`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: User description: "Pointer Effects + Parity Pipeline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adjust Pointer Visual Effects (Priority: P1)

As a watchface author, I can edit pointer appearance using brightness, contrast, saturation, and opacity controls so I can visually tune pointer packs without replacing assets.

**Why this priority**: Pointer adjustment is the core user-visible value in this feature and must be functional as the MVP.

**Independent Test**: Can be fully tested by applying each control to a pointer pack and confirming visible changes in preview while saving and reopening preserves the same values.

**Acceptance Scenarios**:

1. **Given** a pointer pack is loaded, **When** the author changes brightness, contrast, saturation, and opacity, **Then** the pointer appearance updates immediately in the editing preview.
2. **Given** effect values are changed and saved, **When** the project is reopened, **Then** the same values are restored and the pointer renders with the same appearance.
3. **Given** default values are selected, **When** no effect changes are made, **Then** pointer output matches existing behavior.

---

### User Story 2 - Enforce Preview/Export Parity (Priority: P1)

As a watchface author, I need strict parity between composer preview, adjustment preview, and baked export so final output matches what I see while editing.

**Why this priority**: Mismatch across views directly breaks trust in the pipeline and causes rework.

**Independent Test**: Can be fully tested by running the same pointer configuration through all three stages and confirming parity with deterministic comparison steps.

**Acceptance Scenarios**:

1. **Given** a pointer configuration with non-default effects, **When** it is viewed in composer preview, adjustment preview, and baked export, **Then** all three outputs are visually equivalent within defined tolerance.
2. **Given** effect values are modified repeatedly, **When** the author rechecks all three outputs, **Then** parity is maintained for every saved state.

---

### User Story 3 - Support Both Pointer Pack Modes (Priority: P2)

As a watchface author, I can use both source-based custom pointer packs and legacy normalized pointer packs with the same effect controls and parity guarantees.

**Why this priority**: Existing projects rely on legacy packs while new workflows require source-based packs.

**Independent Test**: Can be fully tested by applying identical effect settings to one source-based pack and one legacy normalized pack and validating successful preview/export parity for both.

**Acceptance Scenarios**:

1. **Given** a source-based custom pointer pack, **When** effects are applied, **Then** preview and export remain in parity.
2. **Given** a legacy normalized pack, **When** the same effects are applied, **Then** preview and export remain in parity without migration requirements.

### Edge Cases

- A pointer pack lacks one or more expected pointer assets: the system keeps unaffected pointers functional and reports which assets are missing.
- Effect values at min/max bounds are applied without crashes or undefined visual output.
- A project switches between source-based and legacy normalized packs after effects are configured: effect values remain valid and deterministic for the active pack type.
- Existing projects that never touched pointer effects continue rendering unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide pointer editing parameters for brightness, contrast, saturation, and opacity.
- **FR-002**: The system MUST allow users to update each pointer effect parameter independently.
- **FR-003**: The system MUST preserve pointer effect values across save/reload for projects that use pointer packs.
- **FR-004**: The system MUST apply the same pointer effect configuration in composer preview, adjustment preview, and baked export.
- **FR-005**: The system MUST guarantee deterministic parity of pointer rendering across composer preview, adjustment preview, and baked export for the same input state.
- **FR-006**: The system MUST support source-based custom pointer packs for pointer effects and parity flow.
- **FR-007**: The system MUST support legacy normalized pointer packs for pointer effects and parity flow.
- **FR-008**: The system MUST remain backward compatible so projects with no pointer effect edits keep current visual behavior.
- **FR-009**: The system MUST keep the feature scope limited to pointer effects and parity pipeline behavior, without reworking unrelated unfinished or completed items from spec 030.
- **FR-010**: The system MUST expose clear validation outcomes when parity checks fail, including which stage differs.

### Acceptance Criteria

- **AC-001**: Brightness, contrast, saturation, and opacity controls are available for pointer editing and can be changed independently.
- **AC-002**: For a fixed project state, composer preview, adjustment preview, and baked export produce matching pointer visuals under deterministic comparison.
- **AC-003**: Source-based custom pointer packs and legacy normalized packs both pass the same parity checks.
- **AC-004**: Projects that do not use pointer effects continue to render as before without required migration.
- **AC-005**: Any parity failure can be reproduced and traced to a specific stage using deterministic verification steps.

### Deterministic Verification

1. Prepare two fixtures: one source-based custom pointer pack and one legacy normalized pointer pack.
2. For each fixture, set identical non-default values for brightness, contrast, saturation, and opacity.
3. Capture output from composer preview, adjustment preview, and baked export using the same project state and viewport settings.
4. Compare outputs pairwise using a fixed comparison method and fixed tolerance; repeat comparison twice to confirm stable results.
5. Record pass only if all pairwise comparisons for a fixture are within tolerance in both repeated runs.
6. Record fail with stage-specific mismatch details if any pair exceeds tolerance.
7. Repeat steps 2-6 with default values to confirm backward-compatible baseline behavior.

### Non-Goals

- Reworking, reopening, or completing old unfinished/completed items from spec 030.
- Introducing new pointer editing controls beyond brightness, contrast, saturation, and opacity in this scope.
- Redesigning unrelated composer, background editor, or export features not required for pointer parity.

### Key Entities *(include if feature involves data)*

- **Pointer Effect Profile**: User-selected brightness, contrast, saturation, and opacity values applied to a pointer pack state.
- **Pointer Pack Source Type**: Classification of pack input as source-based custom or legacy normalized.
- **Parity Verification Result**: Deterministic pass/fail artifact describing stage comparisons and mismatch stage when failing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tested pointer projects can adjust brightness, contrast, saturation, and opacity in pointer editing flows.
- **SC-002**: At least 95% of parity verification runs across both pack types pass on first run for unchanged input state.
- **SC-003**: 100% of parity failures identify at least one specific mismatching stage (composer preview, adjustment preview, or baked export).
- **SC-004**: 100% of baseline projects without pointer effect edits preserve pre-feature visual output.

## Assumptions

- Existing pointer pack loading behavior remains unchanged and available for both source-based and legacy normalized paths.
- Deterministic comparison uses one agreed fixed tolerance definition that is consistent across verification runs.
- This feature is delivered as a minimal, backward-compatible enhancement focused only on pointer effects and parity validation.
- Existing project save/load mechanisms can store and restore additional pointer effect values.
