# ZPK canonical-name allowlist

The release repacker accepts both V2 and V3 device manifests but changes only JSON values whose final key is `appName` or `description` in these manifests:

```text
face.zpk
├── app.json                         outer installer manifest
├── device.zip
│   └── app.json                     device-side V2/V3 manifest
└── app-side.zip
    └── app.json                     app-side companion manifest
```

Recursive `appName` handling covers `app.appName` and localized/i18n name-bearing objects without inventing version-specific paths. A non-empty `description` becomes `Custom watch face - <canonical name>`; an empty description becomes the canonical name.

Every other JSON path and every non-manifest ZIP entry is immutable. The parity report records SHA-256 for outer entries and entries inside both nested archives. Missing manifests, corrupt ZIP/CRC data, fewer than three rewritten naming layers, unexpected JSON differences, changed payload hashes, or pre-existing release paths fail closed.

The V2/V3 fixtures in `src/lib/zpkReleaseRepacker.test.ts` contain outer, app-side, and device-side manifests plus fixed binary payloads. They verify positive repacks, nested payload parity, missing-entry rejection, and corrupt nested-package rejection.
