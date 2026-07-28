# Spec 127 — Literal System A Render/Build Parity in System B

## Requirement

Preserve System B's working editable V2 layer while making its rendering and
pointer-export foundation literal System A behavior.

## Verified baseline

The following files are already byte-identical:

- `src/components/InteractiveCanvas.tsx`
- `src/lib/zpkBuilder.ts`
- `src/lib/jsCodeGenerator.ts`

The remaining pointer divergence is the export preparation embedded in
`StudioApp.tsx`, which System B bypasses before calling the copied ZPK builder.

## Implementation

1. Preserve `editableV2.ts` and editable archive patching as the isolated
   editable layer.
2. Copy System A pointer source resolution, pivot extraction, geometry baking,
   no-crop behavior, effect padding, and effects baking into a System B export
   preparation module.
3. Run that preparation on every main/AOD source config before editable
   compilation.
4. Restore `handStyles.ts` byte parity with System A.
5. Keep canvas, normal builder, and runtime generator byte-identical and add
   automated hash parity validation.
6. Remove optional `select_list`, which causes the second text-selection screen.
7. Use the default variant preview as both edit-group selection images instead
   of generating a black transparent square with white edges.

## Restrictions

- No System A source changes.
- No replacement pointer equations.
- No alpha-bound pointer cropping.
- No editable behavior inside copied normal builder/generator files.
- Editable changes remain isolated under `system-b-editable/src/system-b`.

## Validation

- Exact-copy file hashes match System A.
- Custom HTML, PNG, legacy, and built-in hands use System A preparation.
- Prepared pointer dimensions and pivots match System A rules.
- Editable runtime contains no `select_list`.
- Selection images use a real variant preview.
- Generated archive retains editable manifest/group/runtime behavior.
