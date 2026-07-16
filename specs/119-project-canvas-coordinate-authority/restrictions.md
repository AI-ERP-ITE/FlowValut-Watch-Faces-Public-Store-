# Spec 119 — Restrictions

- Do not modify any TIME_POINTER center, pointer center, bounds, hand dimension, pivot, ratio, cover, preview, asset-preparation, or generator logic.
- Do not include TIME_POINTER in generic position rearrangement.
- Do not modify HTML project construction, import, parsing, baking, rendering, sizing, positioning, reference-canvas behavior, or background construction.
- Do not add resolution-mismatch prompts or rearrangement behavior to the HTML workflow.
- Do not resize HTML-parsed or HTML-generated artwork.
- Do not scale element bounds width/height during position-only rearrangement.
- Do not change the gauge renderer's 145px anchor, crops, shared scale, or normalized pivot.
- Do not change icon, IMG_LEVEL frame, switcher frame, digit glyph, complete-day image, or animation-frame sizing contracts.
- Do not reinterpret IMG_PROGRESS width as ordinary image width.
- Do not add a redundant canvas-profile schema if existing `config.resolution` is sufficient.
- Do not silently convert legacy FVWF files.
- Do not mutate the loaded project before the user confirms and conversion validation succeeds.
- Do not modify Firebase Functions, Firebase model/spec-group data, Firestore, Storage, authentication, or compatibility behavior.
- Do not alter V2/V3 generator routing.
- Do not deploy to the public remote.
- Do not mix spec documentation and implementation code in one commit.
- Do not implement any runtime task before explicit user approval.
