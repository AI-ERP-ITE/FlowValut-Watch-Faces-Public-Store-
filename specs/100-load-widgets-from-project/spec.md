# Spec 100 — Load Widgets from Project (Canvas Screen)

## Goal
Add a second project-load mode accessible from the canvas preview screen.
Unlike the full "Load Full Project" (screen 1), this mode loads ONLY the widget elements
from a .fvwf file — the background image already uploaded on screen 1 is preserved.

## User Flow
1. User uploads background on screen 1 → presses "Skip widgets" → arrives at canvas preview
2. On canvas preview sidebar (right panel, near Generate ZPK button), user sees:
   **"Load Widgets from .fvwf"** button
3. User clicks → native file picker (.fvwf / .json)
4. JSON is parsed → all elements loaded EXCEPT the background is patched to match
   the current `state.backgroundImage`
5. Canvas updates with loaded widgets over the existing background
6. Toast: "Widgets loaded from <filename>"

## Background Consistency Rules
- `state.backgroundImage` (data URL) → NOT changed
- `state.backgroundFile` (File) → NOT changed (ZPK export still uses original file)
- Background element inside loaded elements array:
  - Find element where `el.name === 'Background'` (or `el.type === 'IMG'` and it is the first/bg element)
  - Replace its `src` with current `state.backgroundImage`
  - This keeps element array consistent with state.backgroundImage
- AOD generation, background crop, photo editor → all unchanged (use state.backgroundImage)

## UI Placement
- Canvas preview sidebar right panel
- Add below the "Load Project" button in the sticky bottom action bar area
  OR as a small secondary button near the Generate button
- Label: "Load Widgets (.fvwf)" with FolderOpen icon
- Style: outline, smaller than Generate button

## Implementation Notes

### Handler: `handleLoadWidgetsOnly` (StudioApp.tsx)
```ts
const handleLoadWidgetsOnly = useCallback(() => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.fvwf,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const config: WatchFaceConfig = parsed.watchFaceConfig ?? parsed;
      if (!config || !config.elements) throw new Error('Invalid project file');

      // Patch Background element src to match current background
      const currentBg = state.backgroundImage;
      const patchedElements = config.elements.map(el => {
        if (el.name === 'Background' && currentBg) return { ...el, src: currentBg };
        return el;
      });

      const patchedConfig = withNormalizedPointerEffects({ ...config, elements: patchedElements });
      dispatch(actions.setWatchFaceConfig(patchedConfig));
      toast.success(`Widgets loaded: ${file.name}`);
    } catch {
      toast.error('Failed to load project file.');
    }
  };
  input.click();
}, [dispatch, state.backgroundImage]);
```

### UI (preview case in renderContent)
Add button in the sticky bottom action bar (alongside Generate ZPK & Upload):
```tsx
<Button onClick={handleLoadWidgetsOnly} variant="outline" className="...">
  <FolderOpen className="h-4 w-4 mr-1.5" />
  Load Widgets (.fvwf)
</Button>
```

## Constraints
- NEVER touch state.backgroundImage, state.backgroundFile, or backgroundTransform
- Do NOT dispatch setStep — stay on preview
- Works with both new (.fvwf with wrapper) and old (bare WatchFaceConfig) formats
