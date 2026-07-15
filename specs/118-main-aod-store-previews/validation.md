# Validation Checklist

## Static

- [ ] `previewPath` remains the Main preview.
- [ ] `aodPreviewPath` is optional for legacy catalog compatibility.
- [ ] Storage paths use `-main.png` and `-aod.png`.
- [ ] AOD public asset lookup is allowlisted.
- [ ] Admin catalog includes the AOD path.

## Runtime

- [ ] Explicit AOD is captured after the canvas redraws in AOD mode.
- [ ] Missing explicit AOD duplicates Main without mode switching.
- [ ] User editor mode and overlays are restored.
- [ ] ZPK builder receives Main only.
- [ ] Product thumbnail controls have labels and selected state.

## Deployment

- [ ] Firebase targeted deploy succeeds.
- [ ] `functions:list` shows all changed endpoints.
- [ ] Canonical public deployment succeeds to `public/main` and restores private to `origin/main`.
- [ ] Public homepage, catalog, JS, and CSS return HTTP 200.
- [ ] Private homepage returns HTTP 200 and uses its matching bundle.

