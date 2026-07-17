# Spec 122 — Conversation Traceability

This matrix prevents agreed requirements from being lost during phased implementation.

| Agreement | Authoritative coverage |
|---|---|
| One public page per genuine Design Model | `spec.md` FR-7/FR-8 |
| Color/material is a Variant, widgets are an Edition | Permanent hierarchy; FR-4/FR-7 |
| Device/resolution is a Technical Variant | Permanent hierarchy; FR-7/FR-9 |
| Revision is technical, not color naming | Permanent hierarchy; FR-4 |
| Physical watch “Model” terminology must become Device | Permanent hierarchy; FR-7; `data-model.md` |
| Finished non-editable timepiece strategy | Permanent hierarchy; FR-8 |
| Unique Models and Sellable SKUs are separate metrics | FR-7/FR-8 |
| Individual and Complete Color Collection pricing | FR-7 |
| Soft-opening singles $4 and three-color collection $12 | FR-7 |
| Offers own pricing; ZPKs do not | FR-7/FR-9 |
| Test name may be blank/generated/free-form | FR-2/FR-5 |
| Final customer name must overwrite embedded testing name | FR-5/FR-6 |
| Final name is generated through guided hierarchy | FR-4/FR-5 |
| Do not require store fields while testing | FR-1/FR-2 |
| Save permanent editable FVWF and temporary installable ZPK | FR-2 |
| Exact FVWF must be paired with exact tested ZPK | FR-2; `tests.md` |
| Organize trials under Admin instead of loose local folders | FR-1/FR-2 |
| Ordinary autosaves remain local | FR-11 |
| Open Admin build in a new Studio tab | FR-3 |
| Load FVWF, never parse ZPK to canvas | FR-3; Non-goals |
| One release path from Studio and Admin | FR-4 |
| Incomplete Admin item cannot simply be enabled | FR-4 |
| Publish ZPK should become Create Watch Test | FR-2 |
| Existing Offline action is non-destructive | FR-10; `state-machines.md` |
| Real Trash and Restore are required | FR-10 |
| Permanent deletion from Firebase is required | FR-10 |
| Hard-delete Storage failures must not be swallowed | FR-10; `tests.md` |
| Existing orphaned Firebase files must be discoverable | FR-10; `migration.md` |
| Protect current/purchased/referenced packages | FR-9/FR-10 |
| Do not rebuild approved ZPK solely for renaming | FR-6 |
| Repack metadata only and prove functional parity | FR-6; `tests.md`/`validation.md` |
| Approved source ZPK remains immutable | FR-6 |
| Collection/model/variant/edition duplicate checks | FR-4/FR-5 |
| Select existing hierarchy entries or create new ones | FR-4 |
| Technical target is detected from compatibility metadata | FR-4 |
| Customers receive compatible packages after purchase | FR-9 |
| Complete Color Collection grants all included SKUs | FR-7/FR-9 |
| Legacy URLs, orders, QR/downloads must survive | Compatibility requirements; `migration.md` |
| Do not auto-group old faces by similar name | Compatibility requirements; `migration.md` |
| Cloud usage should be measurable and cleanable | FR-11 |
| Binary uploads must avoid oversized JSON Function bodies | FR-11 |
| Private mutations use authenticated backend authority | FR-12 |
| Public/private route separation remains intact | FR-12; `tests.md` |
| Firebase + public + private deployment and live verification | FR-12; `deployment.md` |

