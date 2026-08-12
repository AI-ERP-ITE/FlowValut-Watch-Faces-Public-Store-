# Spec 154 Test Matrix

| ID | Verification | Required result |
|---|---|---|
| R01 | Backup metadata and forensic import | 751-document export imports successfully into deletion-protected recovery DB |
| R02 | Backup/current comparison | Complete missing/conflict/preserve ledger; zero implicit overwrites |
| R03 | Released-face dependency graph | Every previously released face has complete catalog/package/target/media/ZPK chain |
| R04 | Storage references | Every referenced preview/ZPK exists and is non-empty |
| R05 | Function separation | Expected sets exact, disjoint and ACTIVE |
| R06 | Private Admin authentication | Unauthorized denied; authorized Admin read succeeds |
| R07 | Studio/Workshop/Parametric | Controlled persistence and retrieval succeed without harming existing records |
| R08 | Public catalog and routes | Expected released faces and routes resolve |
| R09 | Delivery security | Direct unauthenticated paid-object read denied; authorized delivery path compatible |
| R10 | Commerce safety | Checkout remains gated; invalid webhook rejected; no real payment |
| S01 | Sync archive preservation | Current implementation hashes/packages retained |
| S02 | Control-project inventory | Only promotion-controller/control state present |
| S03 | IAM negative test | No production data, Storage-content, secret, Auth, Paddle, IAM or private-function authority |
| S04 | Exclusion semantics | Excluded/unknown production resources remain byte/state unchanged |
| S05 | Code-only preview | Staging release creates verified production preview with zero data transfer |
| S06 | Failure recovery | Failure is explicit, retryable and cannot delete production state |
| S07 | Stop gates | No live Sync, DNS change, checkout enablement or real payment without separate approval |

