# T050–T053 — Installation, hosting, and firmware boundary

**Result:** MIXED / BLOCKED

Four local, hash-locked controls were produced:

- visible FlowVault fixture ZPK;
- official P9 per-pixel-alpha ZAB;
- official P10 widget-opacity ZAB;
- P11 binary-label compatibility ZPK.

Authenticated install QR generation could not run because Zeus reports no
login, no simulator connection, and no Developer Bridge. The configured private
GitHub token returned HTTP 401 before any lookup or upload, so no remote files
were created and hosted-byte comparison could not be performed.

No exact-package digital P9/P10 watch screenshots exist. The previously supplied
watch screenshot is valid evidence of the original symptom, but it is not tied
to the P9/P10 hashes and therefore cannot satisfy G7.

No generic or fabricated QR was presented as an official Zepp install QR.

## Evidence

- `evidence/firmware/T050-install-control-manifest.json`
- `evidence/firmware/T050-T053-boundary-status.json`
- `evidence/firmware/install-controls/`
- `evidence/tooling/create-firmware-install-controls.mjs`
- `evidence/tooling/host-firmware-install-controls.mjs`
