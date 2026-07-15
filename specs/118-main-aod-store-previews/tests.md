# Test Matrix

| Scenario | Main preview | AOD preview | Store product toggle | Cards/Home | Watch thumbnail |
|---|---|---|---|---|---|
| Explicit AOD differs | Main canvas | AOD canvas | Switches images | Main | Main |
| Explicit AOD matches | Main canvas | AOD canvas | Both available | Main | Main |
| No explicit AOD | Main canvas | Main duplicate | Both available | Main | Main |
| Legacy catalog entry | Existing preview | Main fallback | Both controls work | Main | Unchanged |

## Automated Checks

- TypeScript compiles for public and private targets.
- Firebase Functions TypeScript compiles.
- Catalog types accept legacy records without AOD.
- Upload payload includes both preview fields.
- Product page falls back from `aodPreviewPath` to `previewPath`.
- Existing card/home components continue referencing only `previewPath`.

## Manual Checks

- Generate a watchface with visibly different AOD content.
- Confirm the success preview and generated watch thumbnail show Main.
- Publish and open the public product page.
- Switch between Main and AOD using both thumbnails.
- Confirm browse/home cards never display AOD.

