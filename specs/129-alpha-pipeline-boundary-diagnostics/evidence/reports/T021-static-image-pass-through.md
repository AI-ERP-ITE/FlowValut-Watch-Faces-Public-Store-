# T021 — Untouched Static-Image Pass-Through

**Executed**: 2026-07-29  
**Result**: PASS  
**G2 contribution**: Exact pre-package pass-through confirmed

## Routes Under Test

The immutable fixture was exercised through two current static-image branches
in installed Google Chrome:

1. Inline `IMG`:

```text
uploaded File
→ FileReader data URL
→ resizeDataUrl(dataUrl, 480, 480)
→ decodeDataUrlToBytes()
→ element File bytes
```

2. Remaining Add Image fallback:

```text
uploaded File
→ FileReader data URL
→ fetch(dataUrl)
→ Blob
→ element File bytes
```

The browser test used source-equivalent implementations of the local
`StudioApp.tsx` functions and the same browser APIs used by those routes. The
fixture dimensions and requested dimensions were both 480×480, so this test
specifically covers the untouched branch. Resizing is reserved for T022.

No production source or generator behavior was changed.

## Machine-Readable Evidence

- `evidence/tooling/static-image-passthrough.mjs`
- `evidence/flowvault-routes/T021-inline-static-pass-through.png`
- `evidence/flowvault-routes/T021-fetch-static-pass-through.png`
- `evidence/flowvault-routes/T021-inline-static-comparison.json`
- `evidence/flowvault-routes/T021-fetch-static-comparison.json`

## Browser Route Assertions

| Assertion | Result |
|---|---|
| Uploaded MIME type remains `image/png` | PASS |
| Uploaded file size remains 8,710 bytes | PASS |
| Exact-size `resizeDataUrl()` returns the same data-URL string | PASS |
| Inline decoded output remains 8,710 bytes | PASS |
| Fallback Blob output remains 8,710 bytes | PASS |

## Byte and Pixel Comparisons

Both output branches produced the same result:

| Measurement | Expected | Actual | Result |
|---|---:|---:|---|
| Encoded SHA-256 | `943644b2…d4dc01e` | `943644b2…d4dc01e` | PASS |
| Encoded bytes equal | true | true | PASS |
| Decoded RGBA equal | true | true | PASS |
| Mismatched pixels | 0 | 0 | PASS |
| Mismatched alpha pixels | 0 | 0 | PASS |
| Maximum channel delta | 0 | 0 | PASS |
| Black composite error | 0 | 0 | PASS |
| White composite error | 0 | 0 | PASS |
| Checker composite error | 0 | 0 | PASS |

Full SHA-256 for source and both candidates:

```text
943644b2db678f4257c52ced0417a00f62565a50d637bca6565e4db57d4dc01e
```

## Verdict

FlowVault's untouched static-image handling preserves the PNG byte-for-byte
before ZPK packaging. It does not strip alpha, quantize alpha, alter hidden RGB,
or re-encode a matching-size inline image.

This narrows—but does not yet complete—the boundary:

- T021 refutes pre-package corruption in these untouched static-image branches.
- T021 does not cover dimension-changing canvas normalization; T022 does.
- T021 does not prove `device.zip` preservation; T030–T033 do.
- T021 does not establish firmware compositing behavior.

