# Spec 151 Test Matrix

| ID | Test | Required result |
|---|---|---|
| P01 | Compare built public artifact with deployed staging manifest | Exact match |
| P02 | Fetch accepted staging release identity | Matches bound Sync ID |
| P03 | Change one accepted Hosting byte | Review fails hash validation |
| P04 | Change retained backend/rules package | Review fails hash validation |
| P05 | Inspect Review/Preview/Sync workflow | No checkout, install, or build |
| P06 | Create Preview | Retrieves accepted Firebase package only |
| P07 | Compare invariant staging/Preview files | Every path and hash matches |
| P08 | Compare runtime bindings | Only fixed mapped values differ |
| P09 | Change protected config after Preview acceptance | Acceptance invalidates |
| P10 | Repeat one transition | Idempotent; no duplicate deployment |
| P11 | Run concurrent actions for one Sync ID | One operation lock wins |
| P12 | Inspect release package | No operational data or secret values |
| P13 | Inspect replacement staging inventory | Only separated Public Store build present |
| P14 | Exercise existing commerce smoke path if code changed | Behavior remains compatible |
| P15 | Attempt production/DNS/payment during corrective work | Remains blocked |

