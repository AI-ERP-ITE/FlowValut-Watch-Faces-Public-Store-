# AI Analysis Compiler Guide

This guide defines the canonical JSON analysis contract for the analysis-first compiler pipeline.

## Purpose
- AI returns analysis only.
- AI does not return final SVG or HTML.
- Deterministic compiler owns final rendering output.

## Output Mode
- Response must be strict JSON only.
- No markdown fences.
- No explanatory text.
- No comments.

## Required Top-Level Models
The JSON object must contain all fields:
- `requirementsModel`
- `geometryModel`
- `layerModel`
- `lightingModel`
- `colorModel`
- `textureModel`
- `complianceHints`

## Strict vs Flexible Policy
Use this balance to avoid over-restriction:
- Strict at top-level:
  - all required model keys must be present
  - output remains strict JSON-only
- Flexible inside models:
  - additional nested fields are allowed when useful
  - unknown details can be represented as partial values
  - uncertainty must be declared in `complianceHints.riskyZones`

This policy is: schema strict, semantics soft.

## Canonical Layer Order
Layer stack is back-to-front and uses this semantic order when roles are present:
1. `background` (essential)
2. `texture_base` (optional)
3. `decorative_base` (optional)
4. `dial_markers` (optional)
5. `complications` (optional)
6. `hands` (essential)
7. `hand_cover` (optional)
8. `foreground_fx` (optional)

## Matrix Design
Use a hybrid matrix:
- Global matrix for watch-wide constraints.
- Element matrix for per-element requirements.

### Global Matrix Fields
- `canvas_size`: `{ width, height }`
- `theme_intent`: short style intent statement
- `canonical_layer_order`: fixed role list above
- `color_palette`: extracted hex colors
- `lighting_direction`: global light direction in degrees
- `texture_policy`: where textures are allowed and material intent
- `clipping_policy`: clip ownership and clipping constraints
- `validation_gates`: expected PASS/FAIL checks

### Element Matrix Fields
One row per element with:
- `element_id`: stable unique identifier
- `element_type`: semantic type
- `semantic_role`: what it represents
- `layer_role`: one canonical role
- `z_index`: explicit numeric order
- `bounds`: `{ x, y, width, height }`
- `anchor_or_pivot`: optional pivot/anchor when needed
- `style`: color/opacity/stroke/font metadata
- `texture_material`: optional material metadata
- `clip_ref`: optional clipping reference id
- `depends_on`: upstream layer or element dependencies
- `data_binding`: optional data metric mapping
- `required_count_rule`: min/max expectations
- `fallback_rule`: deterministic fallback behavior

## Model Details

### requirementsModel
Must contain:
- `requiredElements`: array of rules
  - `elementType`
  - `minCount`
  - optional `maxCount`
- optional `watchResolution`

### geometryModel
Must contain:
- `canvas`: `{ width, height }`
- `elements`: array of geometric rows
  - `id`, `type`, `x`, `y`, `width`, `height`
  - optional `centerX`, `centerY`

Rendering guidance for stable preview quality:
- Add geometry rows for visible subparts (ticks, numerals, subdials, bridge, slot, screws, hands).
- Use tight bounds around each part.
- Avoid generic near-full-canvas bounds for non-background elements.
- Reserve full-canvas bounds primarily for the `background` element.

### layerModel
Must contain:
- `layerStack`: ordered array
- each layer requires:
  - `id`
  - `role`
  - `zIndex`
  - `dependsOn`
  - `clipRefs`
  - `mustContain`
  - `elements`

Important shape constraint:
- `layerModel` is an object containing `layerStack`; it is not a raw array.

### lightingModel
Must contain:
- optional `globalLightDirectionDeg`
- `highlights` array
- `shadows` array

### colorModel
Must contain:
- `palette` array
- optional `dominantColor`
- `contrastPairs` array

### textureModel
Must contain:
- `materials` array with material intent per element

### complianceHints
Must contain:
- `notes` array
- `riskyZones` array with reasons

## Allowed Extension Fields
Inside each required model, additional properties are allowed when they improve analysis quality.

Examples:
- `geometryModel.elementGroups`
- `colorModel.paletteRoles`
- `textureModel.blendHints`
- `layerModel.renderHints`

Extension fields must never replace required canonical fields.

## Hard Constraints
- Do not include final rendered SVG.
- Do not include final rendered HTML.
- Do not include external asset URLs.
- Keep ids deterministic and stable.
- All layer dependencies must point backward in stack order.
- z-index values must be unique and strictly increasing.

## Failure Policy
If any required model cannot be inferred reliably:
- still return valid JSON object,
- include partial best-effort values,
- add explicit risk notes under `complianceHints.riskyZones`.

## Minimal Skeleton
```json
{
  "requirementsModel": { "requiredElements": [] },
  "geometryModel": { "canvas": { "width": 480, "height": 480 }, "elements": [] },
  "layerModel": { "layerStack": [] },
  "lightingModel": { "highlights": [], "shadows": [] },
  "colorModel": { "palette": [], "contrastPairs": [] },
  "textureModel": { "materials": [] },
  "complianceHints": { "notes": [], "riskyZones": [] }
}
```