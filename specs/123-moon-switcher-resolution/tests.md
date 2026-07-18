# Tests

## Automated

- Policy maps `MOON` to `LUNAR_CYCLE`.
- Default Moon slots contain 7 sequential entries without codes or ranges.
- Explicit 13 and 30 resolutions produce the requested sequential slot count.
- Validator accepts 7/13/30 and rejects other Moon counts.
- Non-Moon default builders and validators remain unchanged.
- V2 and V3 generated `IMG_LEVEL` output retains `hmUI.data_type.MOON` and the configured image count.

## Manual

1. Create Moon sets at 7, 13, and 30 resolutions.
2. Confirm resolution change warns before discarding populated slots.
3. Save, close, reopen, and edit each set.
4. Link each set to a Moon `IMG_LEVEL` element and confirm its resolution label/count.
5. Export and confirm ordered Moon PNGs and matching `image_length` in generated `watchface/index.js`.

