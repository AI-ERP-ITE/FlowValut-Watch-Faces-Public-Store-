import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentAuthUser, isFirebaseAuthConfigured, subscribeAuthState } from '@/lib/firebaseAuthClient';
import { fetchParametricLibraryFromFirebase, saveParametricLibraryToFirebase } from '@/lib/studioFirebasePublishApi';

type StyleKey = 'gold_dark' | 'steel_night';
type ColorMode = 'off' | 'warning' | 'enforce';

type TemplateElement = Record<string, unknown> & {
  id?: string;
  name?: string;
  role?: string;
  type?: string;
  visible?: boolean;
  params?: Record<string, unknown>;
  placement?: { mode?: string; config?: Record<string, unknown> };
  symmetry?: { mode?: string; config?: Record<string, unknown> };
};

type TemplateModel = {
  activeStyle?: StyleKey;
  layout?: Record<string, unknown>;
  scale?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
  effects3d?: Record<string, unknown>;
  styleAdjust?: Record<string, unknown>;
  texture?: Record<string, unknown>;
  elements: Array<TemplateElement>;
};

type LibraryEntry = {
  id: string;
  name: string;
  category: string;
  element: TemplateElement;
};

type ThemeEntry = {
  id: string;
  name: string;
  template: TemplateModel;
};

const PARAMETRIC_TEMPLATE_STORAGE_KEY = 'parametric-template-elements-v1';
const PARAMETRIC_LIBRARY_STORAGE_KEY = 'parametric-element-library-v1';
const PARAMETRIC_THEME_STORAGE_KEY = 'parametric-theme-library-v1';

const DEFAULT_COLOR_CONTROL = {
  colorControl: {
    mode: 'off' as ColorMode,
    quantization: 'rgb565',
    palette: [],
    luminanceClamp: {
      enabled: false,
      min: 0.2,
      max: 0.8,
    },
    tolerance: 2,
  },
};

const SAMPLE_LIBRARY: Array<LibraryEntry> = [
  {
    id: 'sample-base-layer',
    name: 'Base Layer',
    category: 'Base',
    element: {
      type: 'base',
      role: 'base',
      name: 'Base Layer',
      params: { shape: 'circle', radius: 0.5, fill: '#0b0b0b' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-base-bezel',
    name: 'Base Bezel',
    category: 'Bezel',
    element: {
      type: 'bezel',
      role: 'bezel',
      name: 'Base Bezel',
      params: { radius: 0.48, thickness: 0.02, stroke: '#d2b879' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-main-ticks',
    name: 'Main Ticks',
    category: 'Ticks',
    element: {
      type: 'ticks_radial',
      role: 'ticks',
      name: 'Main Ticks',
      params: { count: 60, radius: 0.42, length: 0.02, width: 0.003, majorEvery: 5, majorLength: 0.035 },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-outline-ring',
    name: 'Outline Ring',
    category: 'Outline',
    element: {
      type: 'outline_ring',
      role: 'outline_ring',
      name: 'Outline Ring',
      params: { radius: 0.44, thickness: 0.016, stroke: '#d6bb6a' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-outline-rect',
    name: 'Outline Frame',
    category: 'Outline',
    element: {
      type: 'outline_rect',
      role: 'outline_rect',
      name: 'Outline Frame',
      params: { width: 0.75, height: 0.9, cornerRadius: 0.06, thickness: 0.01, stroke: '#8ca0bf' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-free-circle',
    name: 'Free Circle Marker',
    category: 'Free Objects',
    element: {
      type: 'free_circle',
      role: 'free_circle',
      name: 'Free Circle Marker',
      placement: { mode: 'anchor', config: { anchor: 'top', offset: [0, 16], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { radius: 0.06, thickness: 0.008, fill: '#4b5a78', stroke: '#d9e4ff' },
    },
  },
  {
    id: 'sample-free-ring',
    name: 'Free Ring Marker',
    category: 'Free Objects',
    element: {
      type: 'free_ring',
      role: 'free_ring',
      name: 'Free Ring Marker',
      placement: { mode: 'anchor', config: { anchor: 'right', offset: [-22, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { radius: 0.08, thickness: 0.01, stroke: '#d9e4ff', fill: 'none' },
    },
  },
  {
    id: 'sample-free-triangle',
    name: 'Free Triangle',
    category: 'Free Objects',
    element: {
      type: 'free_triangle',
      role: 'free_triangle',
      name: 'Free Triangle',
      placement: { mode: 'anchor', config: { anchor: 'left', offset: [24, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { side1: 0.11, side2: 0.09, side3: 0.1, fill: '#58657b', stroke: '#e5ecff', thickness: 0.008 },
    },
  },
  {
    id: 'sample-free-hexagon',
    name: 'Free Hexagon',
    category: 'Free Objects',
    element: {
      type: 'free_hexagon',
      role: 'free_hexagon',
      name: 'Free Hexagon',
      placement: { mode: 'anchor', config: { anchor: 'left', offset: [24, -24], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { side1: 0.09, side2: 0.1, side3: 0.11, side4: 0.09, side5: 0.1, side6: 0.11, fill: '#58657b', stroke: '#e5ecff', thickness: 0.008 },
    },
  },
  {
    id: 'sample-free-octagon',
    name: 'Free Octagon',
    category: 'Free Objects',
    element: {
      type: 'free_octagon',
      role: 'free_octagon',
      name: 'Free Octagon',
      placement: { mode: 'anchor', config: { anchor: 'left', offset: [24, 24], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { side1: 0.08, side2: 0.09, side3: 0.1, side4: 0.11, side5: 0.1, side6: 0.09, side7: 0.08, side8: 0.09, fill: '#58657b', stroke: '#e5ecff', thickness: 0.008 },
    },
  },
  {
    id: 'sample-free-polygon',
    name: 'Free Polygon',
    category: 'Free Objects',
    element: {
      type: 'free_polygon',
      role: 'free_polygon',
      name: 'Free Polygon',
      placement: { mode: 'anchor', config: { anchor: 'top', offset: [0, 28], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: {
        sidesCount: 7,
        sides: [0.08, 0.1, 0.12, 0.09, 0.11, 0.08, 0.1],
        fill: '#58657b',
        stroke: '#e5ecff',
        thickness: 0.008,
      },
    },
  },
  {
    id: 'sample-free-rect',
    name: 'Free Bottom Card',
    category: 'Free Objects',
    element: {
      type: 'free_rect',
      role: 'free_rect',
      name: 'Free Bottom Card',
      placement: { mode: 'anchor', config: { anchor: 'bottom', offset: [0, -20], rotation: 18 } },
      symmetry: { mode: 'none', config: {} },
      params: { width: 0.28, height: 0.11, cornerRadius: 0.03, thickness: 0.008, fill: '#5f536e', stroke: '#e5dcf1' },
    },
  },
  {
    id: 'sample-texture-layer',
    name: 'Texture Grain Layer',
    category: 'Texture',
    element: {
      type: 'texture_layer',
      role: 'texture_layer',
      name: 'Texture Grain Layer',
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: {
        shape: 'ring',
        radius: 0.44,
        thickness: 0.03,
        opacity: 0.35,
        gradient: {
          from: [0, 0],
          to: [100, 100],
          stops: [
            { offset: 0, color: '#f5e6b0', opacity: 0.3 },
            { offset: 0.5, color: '#8b7a4e', opacity: 0.22 },
            { offset: 1, color: '#1b150b', opacity: 0.36 },
          ],
        },
        noise: { density: 0.72, effectRadius: 14 },
      },
    },
  },
];

const DEFAULT_EMPTY_TEMPLATE: TemplateModel = {
  layout: {
    shape: 'circle',
    width: 480,
    height: 480,
    baseRadius: 0.5,
    padding: 0.04,
  },
  scale: { global: 1 },
  elements: [],
};

const BASE_TEMPLATE_DRAFT = JSON.stringify(
  {
    layout: {
      shape: 'circle',
      width: 480,
      height: 480,
      baseRadius: 0.5,
      padding: 0.04,
    },
    scale: {
      global: 1.0,
    },
    elements: [],
  },
  null,
  2,
);

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeId(prefix = 'el'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureElement(element: TemplateElement, fallbackIndex = 0): TemplateElement {
  const type = typeof element.type === 'string' ? element.type : 'element';
  const role = typeof element.role === 'string' ? element.role : type;
  const name = typeof element.name === 'string' && element.name.trim().length > 0 ? element.name.trim() : `${type}-${fallbackIndex + 1}`;
  return {
    ...element,
    id: typeof element.id === 'string' ? element.id : makeId('el'),
    type,
    role,
    name,
    visible: element.visible !== false,
    params: element.params && typeof element.params === 'object' ? { ...element.params } : {},
    placement:
      element.placement && typeof element.placement === 'object'
        ? {
            mode: typeof element.placement.mode === 'string' ? element.placement.mode : 'center',
            config:
              element.placement.config && typeof element.placement.config === 'object'
                ? { ...element.placement.config }
                : { offset: [0, 0], rotation: 0 },
          }
        : { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
    symmetry:
      element.symmetry && typeof element.symmetry === 'object'
        ? {
            mode: typeof element.symmetry.mode === 'string' ? element.symmetry.mode : 'none',
            config:
              element.symmetry.config && typeof element.symmetry.config === 'object'
                ? { ...element.symmetry.config }
                : {},
          }
        : { mode: 'none', config: {} },
  };
}

function inferCategory(element: TemplateElement): string {
  const type = typeof element.type === 'string' ? element.type : '';
  if (type === 'base') return 'Base';
  if (type.includes('texture')) return 'Texture';
  if (type.includes('tick')) return 'Ticks';
  if (type.includes('bezel')) return 'Bezel';
  if (type.includes('outline')) return 'Outline';
  if (type.includes('free')) return 'Free Objects';
  return 'General';
}

function normalizeLibraryEntries(parsed: Array<unknown>): Array<LibraryEntry> {
  return parsed
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const safe = entry as Record<string, unknown>;
      const rawElement = safe.element && typeof safe.element === 'object' ? (safe.element as TemplateElement) : {};
      return {
        id: typeof safe.id === 'string' ? safe.id : makeId('lib'),
        name: typeof safe.name === 'string' && safe.name.trim().length > 0 ? safe.name : `Saved-${index + 1}`,
        category:
          typeof safe.category === 'string' && safe.category.trim().length > 0
            ? safe.category
            : inferCategory(rawElement),
        element: ensureElement(rawElement, index),
      };
    });
}

function normalizeThemeEntries(parsed: Array<unknown>): Array<ThemeEntry> {
  return parsed
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const safe = entry as Record<string, unknown>;
      const rawTemplate = safe.template && typeof safe.template === 'object' ? (safe.template as TemplateModel) : { elements: [] };
      const elements = Array.isArray(rawTemplate.elements)
        ? rawTemplate.elements.map((element, elementIndex) => ensureElement(element, elementIndex))
        : [];

      return {
        id: typeof safe.id === 'string' ? safe.id : makeId('theme'),
        name: typeof safe.name === 'string' && safe.name.trim().length > 0 ? safe.name : `Theme-${index + 1}`,
        template: {
          ...rawTemplate,
          elements,
        },
      };
    });
}

function isLikelyRawLayoutObject(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  const layoutKeys = new Set(['shape', 'width', 'height', 'baseRadius', 'padding']);
  return keys.every((key) => layoutKeys.has(key));
}

export default function ParametricPage() {
  const navigate = useNavigate();
  const [activeStyle, setActiveStyle] = useState<StyleKey>('gold_dark');
  const [colorMode, setColorMode] = useState<ColorMode>('off');
  const [selectedPanelTarget, setSelectedPanelTarget] = useState<'layout' | 'element'>('layout');

  const [workingTemplate, setWorkingTemplate] = useState<TemplateModel | null>(null);
  const [library, setLibrary] = useState<Array<LibraryEntry>>(SAMPLE_LIBRARY);
  const [themes, setThemes] = useState<Array<ThemeEntry>>([]);
  const [themeNameDraft, setThemeNameDraft] = useState('');
  const [themeNameDrafts, setThemeNameDrafts] = useState<Record<string, string>>({});

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [paramsDraft, setParamsDraft] = useState('{}');
  const [layoutDraft, setLayoutDraft] = useState(JSON.stringify(DEFAULT_EMPTY_TEMPLATE.layout, null, 2));
  const [layoutDraftError, setLayoutDraftError] = useState<string | null>(null);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<string | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const [libraryNameDrafts, setLibraryNameDrafts] = useState<Record<string, string>>({});

  const [draftJson, setDraftJson] = useState(
    JSON.stringify(
      {
        type: 'texture_layer',
        role: 'texture_layer',
        name: 'My Texture',
        params: {
          shape: 'ring',
          radius: 0.44,
          thickness: 0.03,
          opacity: 0.35,
          noise: { density: 0.72, effectRadius: 14 },
        },
      },
      null,
      2,
    ),
  );

  const [draftError, setDraftError] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authConfigured = isFirebaseAuthConfigured();

  const selectedIndex = useMemo(() => {
    if (!workingTemplate || !selectedElementId) return -1;
    return workingTemplate.elements.findIndex((item) => item.id === selectedElementId);
  }, [workingTemplate, selectedElementId]);

  const selectedElement = selectedIndex >= 0 && workingTemplate ? workingTemplate.elements[selectedIndex] : null;

  const getPreviousElementName = () => {
    if (!workingTemplate || selectedIndex <= 0) return '';
    const prev = workingTemplate.elements[selectedIndex - 1];
    const name = typeof prev?.name === 'string' ? prev.name.trim() : '';
    return name;
  };

  const groupedLibrary = useMemo(() => {
    const map = new Map<string, Array<LibraryEntry>>();
    for (const entry of library) {
      const key = entry.category || 'General';
      const current = map.get(key) ?? [];
      current.push(entry);
      map.set(key, current);
    }
    return Array.from(map.entries());
  }, [library]);

  const saveTemplate = (template: TemplateModel) => {
    try {
      window.localStorage.setItem(PARAMETRIC_TEMPLATE_STORAGE_KEY, JSON.stringify(template));
    } catch {
      // Ignore localStorage failures.
    }
  };

  const saveLibraryLocal = (items: Array<LibraryEntry>) => {
    try {
      window.localStorage.setItem(PARAMETRIC_LIBRARY_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore localStorage failures.
    }
  };

  const saveThemesLocal = (items: Array<ThemeEntry>) => {
    try {
      window.localStorage.setItem(PARAMETRIC_THEME_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore localStorage failures.
    }
  };

  const saveLibraryToFirebaseOnAction = useCallback(async (items: Array<LibraryEntry>) => {
    if (!authConfigured || !getCurrentAuthUser()) return;
    const payload = items.map((entry) => JSON.parse(JSON.stringify(entry)) as Record<string, unknown>);
    await saveParametricLibraryToFirebase({ entries: payload });
  }, [authConfigured]);

  const loadStoredTemplate = (): TemplateModel | null => {
    try {
      const raw = window.localStorage.getItem(PARAMETRIC_TEMPLATE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TemplateModel;
      if (!parsed || !Array.isArray(parsed.elements)) return null;
      return {
        ...parsed,
        elements: parsed.elements.map((element, index) => ensureElement(element, index)),
      };
    } catch {
      return null;
    }
  };

  const loadStoredLibrary = (): Array<LibraryEntry> | null => {
    try {
      const raw = window.localStorage.getItem(PARAMETRIC_LIBRARY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Array<LibraryEntry>;
      if (!Array.isArray(parsed)) return null;
      return normalizeLibraryEntries(parsed as Array<unknown>);
    } catch {
      return null;
    }
  };

  const loadStoredThemes = (): Array<ThemeEntry> | null => {
    try {
      const raw = window.localStorage.getItem(PARAMETRIC_THEME_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Array<unknown>;
      if (!Array.isArray(parsed)) return null;
      return normalizeThemeEntries(parsed);
    } catch {
      return null;
    }
  };

  const syncLibraryFromFirebase = useCallback(async () => {
    if (!authConfigured || !getCurrentAuthUser()) return;

    try {
      const remoteRaw = await fetchParametricLibraryFromFirebase();
      const remote = normalizeLibraryEntries(remoteRaw as Array<unknown>);

      if (remote.length > 0) {
        setLibrary(remote);
        try {
          window.localStorage.setItem(PARAMETRIC_LIBRARY_STORAGE_KEY, JSON.stringify(remote));
        } catch {
          // Ignore localStorage failures.
        }
        setDrawerNotice('Library synced from Firebase.');
        return;
      }

    } catch {
      setDrawerNotice('Firebase sync unavailable. Using local drawer library.');
    }
  }, [authConfigured]);

  const persistLibraryFromAction = (updater: (prev: Array<LibraryEntry>) => Array<LibraryEntry>, successNotice: string) => {
    let pushed = false;
    setLibrary((prev) => {
      const next = updater(prev);
      saveLibraryLocal(next);
      void saveLibraryToFirebaseOnAction(next)
        .then(() => {
          pushed = true;
          setDrawerNotice(authConfigured && getCurrentAuthUser() ? `${successNotice} Saved to Firebase.` : `${successNotice} Saved locally.`);
        })
        .catch(() => {
          setDrawerNotice(`${successNotice} Saved locally. Firebase unavailable.`);
        });
      return next;
    });
    if (!pushed) {
      setEditorNotice(successNotice);
    }
  };

  const deleteLibraryEntry = (entryId: string) => {
    persistLibraryFromAction(
      (prev) => prev.filter((entry) => entry.id !== entryId),
      'Library entry deleted.',
    );
  };

  const renameLibraryEntry = (entryId: string) => {
    const draft = (libraryNameDrafts[entryId] ?? '').trim();
    if (!draft) {
      setDrawerNotice('Rename failed: name cannot be empty.');
      return;
    }

    persistLibraryFromAction(
      (prev) => prev.map((entry) => (entry.id === entryId ? { ...entry, name: draft } : entry)),
      'Library entry renamed.',
    );
  };

  const persistThemes = (updater: (prev: Array<ThemeEntry>) => Array<ThemeEntry>, successNotice: string) => {
    setThemes((prev) => {
      const next = updater(prev);
      saveThemesLocal(next);
      return next;
    });
    setDrawerNotice(successNotice);
  };

  const saveCurrentAsTheme = () => {
    if (!workingTemplate || !Array.isArray(workingTemplate.elements) || workingTemplate.elements.length === 0) {
      setDrawerNotice('Save theme failed: no layers in current template.');
      return;
    }

    const name = themeNameDraft.trim().length > 0 ? themeNameDraft.trim() : `Theme-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
    const nextTheme: ThemeEntry = {
      id: makeId('theme'),
      name,
      template: deepClone(workingTemplate),
    };

    persistThemes((prev) => [...prev, nextTheme], 'Theme saved locally.');
  };

  const applyThemeById = (themeId: string) => {
    const theme = themes.find((entry) => entry.id === themeId);
    if (!theme) {
      setDrawerNotice('Theme not found.');
      return;
    }

    const template = {
      ...deepClone(theme.template),
      elements: (theme.template.elements ?? []).map((element, index) => ensureElement(element, index)),
    } as TemplateModel;

    setWorkingTemplate(template);
    saveTemplate(template);
    setSelectedElementId(template.elements[0]?.id ?? null);
    setSelectedPanelTarget(template.elements.length > 0 ? 'element' : 'layout');
    setThemeNameDraft(theme.name);
    setDrawerNotice(`Theme loaded: ${theme.name}`);
    void renderPreview(template);
  };

  const deleteThemeById = (themeId: string) => {
    persistThemes((prev) => prev.filter((entry) => entry.id !== themeId), 'Theme deleted.');
  };

  const renameThemeById = (themeId: string) => {
    const draft = (themeNameDrafts[themeId] ?? '').trim();
    if (!draft) {
      setDrawerNotice('Theme rename failed: name cannot be empty.');
      return;
    }

    persistThemes(
      (prev) => prev.map((entry) => (entry.id === themeId ? { ...entry, name: draft } : entry)),
      'Theme renamed.',
    );
  };

  const importTemplateElementsToLibrary = (template: TemplateModel) => {
    const items = (template.elements ?? []).map((element, index) => {
      const normalized = ensureElement(deepClone(element), index);
      return {
        id: makeId('lib'),
        name: typeof normalized.name === 'string' && normalized.name.trim().length > 0 ? normalized.name : `Saved-${index + 1}`,
        category: inferCategory(normalized),
        element: normalized,
      } as LibraryEntry;
    });

    if (items.length === 0) return;

    persistLibraryFromAction(
      (prev) => [...prev, ...items],
      `Imported ${items.length} element(s) from template JSON to drawer library.`,
    );
  };

  const parseDraftElement = (): TemplateElement | null => {
    if (!draftJson.trim()) {
      setDraftError('JSON field is empty. Paste an element JSON first.');
      return null;
    }
    try {
      const parsed = JSON.parse(draftJson) as TemplateElement;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
        throw new Error('Element JSON must be an object with string field: type');
      }
      setDraftError(null);
      return ensureElement(parsed);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Invalid JSON.');
      return null;
    }
  };

  const parseDraftTemplate = (): TemplateModel | null => {
    if (!draftJson.trim()) return null;
    try {
      const parsed = JSON.parse(draftJson) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return null;

      const hasTemplateWrapperField =
        Object.prototype.hasOwnProperty.call(parsed, 'activeStyle') ||
        Object.prototype.hasOwnProperty.call(parsed, 'layout') ||
        Object.prototype.hasOwnProperty.call(parsed, 'scale') ||
        Object.prototype.hasOwnProperty.call(parsed, 'elements');
      const rawLayoutOnly = isLikelyRawLayoutObject(parsed);
      if (!hasTemplateWrapperField && !rawLayoutOnly) return null;

      const baseTemplate = workingTemplate ?? deepClone(DEFAULT_EMPTY_TEMPLATE);

      const layout = rawLayoutOnly
        ? parsed
        : parsed.layout && typeof parsed.layout === 'object'
          ? (parsed.layout as Record<string, unknown>)
          : (baseTemplate.layout as Record<string, unknown>);

      const scale = parsed.scale && typeof parsed.scale === 'object'
        ? (parsed.scale as Record<string, unknown>)
        : (baseTemplate.scale as Record<string, unknown>);

      const nextElements = Array.isArray(parsed.elements)
        ? parsed.elements
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry, index) => ensureElement(entry as TemplateElement, index))
        : baseTemplate.elements;

      const normalized: TemplateModel = {
        activeStyle: parsed.activeStyle === 'steel_night' ? 'steel_night' : parsed.activeStyle === 'gold_dark' ? 'gold_dark' : baseTemplate.activeStyle,
        layout,
        scale,
        elements: nextElements,
      };

      return normalized;
    } catch {
      return null;
    }
  };

  const renderPreview = useCallback(async (templateOverride?: TemplateModel) => {
    setIsRendering(true);
    setError(null);
    try {
      // @ts-expect-error runtime import has no TS metadata in this path.
      const engineModule = (await import('../engine/index.js')) as {
        getTemplateSnapshot: () => TemplateModel;
        runEngine: (args?: {
          activeStyle?: StyleKey;
          paramOverrides?: Record<string, Record<string, number>>;
          templateInput?: TemplateModel;
          colorControl?: typeof DEFAULT_COLOR_CONTROL;
        }) => string;
      };

      const template = templateOverride ?? workingTemplate ?? loadStoredTemplate() ?? deepClone(DEFAULT_EMPTY_TEMPLATE);
      const styleFromTemplate = template.activeStyle === 'steel_night' || template.activeStyle === 'gold_dark' ? template.activeStyle : null;

      const renderInput: TemplateModel = {
        ...template,
        elements: (template.elements ?? [])
          .filter((element) => element.visible !== false)
          .map((element) => {
            const clone = deepClone(element);
            delete clone.id;
            delete clone.name;
            delete clone.visible;
            return clone;
          }),
      };

      const svg = engineModule.runEngine({
        activeStyle: styleFromTemplate ?? activeStyle,
        templateInput: renderInput,
        colorControl: {
          ...DEFAULT_COLOR_CONTROL,
          colorControl: {
            ...DEFAULT_COLOR_CONTROL.colorControl,
            mode: colorMode,
          },
        },
      });

      setSvgMarkup(svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to render preview.');
    } finally {
      setIsRendering(false);
    }
  }, [activeStyle, colorMode, workingTemplate]);

  const updateTemplateElements = (updater: (elements: Array<TemplateElement>) => Array<TemplateElement>) => {
    let nextTemplate: TemplateModel | null = null;
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        elements: updater(prev.elements),
      };
      nextTemplate = next;
      saveTemplate(next);
      return next;
    });
    if (nextTemplate) {
      void renderPreview(nextTemplate);
    }
  };

  const updateTemplateLayout = (updater: (layout: Record<string, unknown>) => Record<string, unknown>) => {
    let nextTemplate: TemplateModel | null = null;
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const currentLayout = prev.layout && typeof prev.layout === 'object' ? prev.layout : {};
      const next = {
        ...prev,
        layout: updater({ ...currentLayout }),
      };
      nextTemplate = next;
      saveTemplate(next);
      return next;
    });
    if (nextTemplate) {
      void renderPreview(nextTemplate);
    }
  };

  const syncBaseElementShapeToLayout = (shape: 'circle' | 'rectangle') => {
    let nextTemplate: TemplateModel | null = null;
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const currentLayout = prev.layout && typeof prev.layout === 'object' ? prev.layout : {};
      const nextElements = (prev.elements ?? []).map((element) => {
        if (element.type !== 'base') return element;
        const nextParams = {
          ...(element.params && typeof element.params === 'object' ? (element.params as Record<string, unknown>) : {}),
          shape,
        };
        return { ...element, params: nextParams };
      });

      const next = {
        ...prev,
        layout: { ...currentLayout, shape },
        elements: nextElements,
      };

      nextTemplate = next;
      saveTemplate(next);
      return next;
    });

    if (nextTemplate) {
      void renderPreview(nextTemplate);
    }
  };

  const getLayoutShape = (): 'circle' | 'rectangle' => {
    const shape = workingTemplate?.layout && typeof workingTemplate.layout === 'object'
      ? (workingTemplate.layout as Record<string, unknown>).shape
      : 'circle';
    return shape === 'rectangle' ? 'rectangle' : 'circle';
  };

  const getLayoutNumber = (key: string, fallback: number): number => {
    const layout = workingTemplate?.layout;
    if (!layout || typeof layout !== 'object') return fallback;
    const value = Number((layout as Record<string, unknown>)[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const applyLayoutDraft = () => {
    if (!layoutDraft.trim()) {
      setLayoutDraftError('Layout JSON is empty.');
      return;
    }
    try {
      const parsed = JSON.parse(layoutDraft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Layout JSON must be an object.');
      }
      setLayoutDraftError(null);

      const nextShapeRaw = parsed.shape;
      const nextShape = nextShapeRaw === 'rectangle' ? 'rectangle' : nextShapeRaw === 'circle' ? 'circle' : null;
      if (nextShape) {
        syncBaseElementShapeToLayout(nextShape);
        updateTemplateLayout((layout) => ({ ...layout, ...parsed, shape: nextShape }));
      } else {
        updateTemplateLayout(() => parsed);
      }
    } catch (e) {
      setLayoutDraftError(e instanceof Error ? e.message : 'Invalid layout JSON.');
    }
  };

  const addElementToCanvas = (source: TemplateElement) => {
    const copy = ensureElement(deepClone(source));
    copy.id = makeId('layer');

    let nextTemplate: TemplateModel | null = null;
    setWorkingTemplate((prev) => {
      const base = prev ?? { elements: [] };
      const next = {
        ...base,
        elements: [...base.elements, copy],
      };
      nextTemplate = next as TemplateModel;
      saveTemplate(next);
      return next;
    });

    setSelectedElementId(copy.id ?? null);
    setSelectedPanelTarget('element');
    if (nextTemplate) {
      void renderPreview(nextTemplate);
    }
  };

  const toggleElementVisibility = (id: string) => {
    updateTemplateElements((elements) =>
      elements.map((element) => (element.id === id ? { ...element, visible: element.visible === false } : element)),
    );
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    updateTemplateElements((elements) => {
      const index = elements.findIndex((element) => element.id === id);
      if (index < 0) return elements;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= elements.length) return elements;
      const next = [...elements];
      const [picked] = next.splice(index, 1);
      next.splice(target, 0, picked);
      return next;
    });
  };

  const removeElement = (id: string) => {
    updateTemplateElements((elements) => elements.filter((element) => element.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
      setNameDraft('');
      setParamsDraft('{}');
    }
  };

  const saveDraftToLibrary = () => {
    const parsed = parseDraftElement();
    if (!parsed) return;

    const nextEntry: LibraryEntry = {
      id: makeId('lib'),
      name: typeof parsed.name === 'string' ? parsed.name : 'Saved Element',
      category: inferCategory(parsed),
      element: parsed,
    };

    persistLibraryFromAction((prev) => [...prev, nextEntry], 'Draft JSON saved to drawer library.');
  };

  const getCategoryDraftText = (category: string, fallbackElement?: TemplateElement): string => {
    const existing = categoryDrafts[category];
    if (typeof existing === 'string') return existing;
    if (fallbackElement) return JSON.stringify(fallbackElement, null, 2);
    return JSON.stringify({ type: 'base', params: { shape: 'circle', radius: 0.5 } }, null, 2);
  };

  const parseCategoryDraftElement = (category: string, fallbackElement?: TemplateElement): TemplateElement | null => {
    const text = getCategoryDraftText(category, fallbackElement);
    if (!text.trim()) {
      setDrawerNotice(`${category}: JSON is empty.`);
      return null;
    }
    try {
      const parsed = JSON.parse(text) as TemplateElement;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
        throw new Error('Element JSON must contain string field: type');
      }
      setDrawerNotice(null);
      return ensureElement(parsed);
    } catch (e) {
      setDrawerNotice(`${category}: ${e instanceof Error ? e.message : 'Invalid JSON.'}`);
      return null;
    }
  };

  const addCategoryDraftToCanvas = (category: string, fallbackElement?: TemplateElement) => {
    const parsed = parseCategoryDraftElement(category, fallbackElement);
    if (!parsed) return;
    addElementToCanvas(parsed);
    setDrawerNotice(`${category}: draft element added to canvas.`);
  };

  const saveCategoryDraftToLibrary = (category: string, fallbackElement?: TemplateElement) => {
    const parsed = parseCategoryDraftElement(category, fallbackElement);
    if (!parsed) return;

    const nextEntry: LibraryEntry = {
      id: makeId('lib'),
      name: typeof parsed.name === 'string' ? parsed.name : `${category} Saved`,
      category,
      element: parsed,
    };

    persistLibraryFromAction((prev) => [...prev, nextEntry], `${category}: draft saved to this type library.`);
  };

  const saveSelectedToLibrary = () => {
    if (!selectedElement) {
      setEditorNotice('No selected element to save.');
      return;
    }

    const normalized = ensureElement(deepClone(selectedElement));
    const nextEntry: LibraryEntry = {
      id: makeId('lib'),
      name: typeof normalized.name === 'string' && normalized.name.trim().length > 0 ? normalized.name : 'Saved Element',
      category: inferCategory(normalized),
      element: normalized,
    };

    persistLibraryFromAction((prev) => [...prev, nextEntry], 'Selected element saved to drawer library.');
  };

  const addDraftToCanvas = () => {
    const template = parseDraftTemplate();
    if (template) {
      setWorkingTemplate(template);
      saveTemplate(template);
      importTemplateElementsToLibrary(template);
      setSelectedElementId(template.elements[0]?.id ?? null);
      setSelectedPanelTarget(template.elements.length > 0 ? 'element' : 'layout');
      setDraftError(null);
      void renderPreview(template);
      return;
    }

    const parsed = parseDraftElement();
    if (!parsed) return;
    addElementToCanvas(parsed);
  };

  const applyDraftJsonToSelectedElementLive = (nextDraft: string) => {
    if (!selectedElement || !nextDraft.trim()) return;

    try {
      const parsed = JSON.parse(nextDraft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

      const isTemplatePayload =
        Object.prototype.hasOwnProperty.call(parsed, 'layout') ||
        Object.prototype.hasOwnProperty.call(parsed, 'elements') ||
        Object.prototype.hasOwnProperty.call(parsed, 'scale');
      if (isTemplatePayload) return;

      updateTemplateElements((elements) =>
        elements.map((element, index) => {
          if (element.id !== selectedElement.id) return element;

          const isElementPatch =
            Object.prototype.hasOwnProperty.call(parsed, 'type') ||
            Object.prototype.hasOwnProperty.call(parsed, 'params') ||
            Object.prototype.hasOwnProperty.call(parsed, 'placement') ||
            Object.prototype.hasOwnProperty.call(parsed, 'symmetry') ||
            Object.prototype.hasOwnProperty.call(parsed, 'material') ||
            Object.prototype.hasOwnProperty.call(parsed, 'texture') ||
            Object.prototype.hasOwnProperty.call(parsed, 'styleAdjust') ||
            Object.prototype.hasOwnProperty.call(parsed, 'effect3d');

          if (isElementPatch) {
            const parsedParams = parsed.params && typeof parsed.params === 'object' ? (parsed.params as Record<string, unknown>) : null;
            const materialPatch = parsed.material && typeof parsed.material === 'object' ? (parsed.material as Record<string, unknown>) : null;
            const mergedParams = {
              ...(element.params && typeof element.params === 'object' ? (element.params as Record<string, unknown>) : {}),
              ...(parsedParams ?? {}),
            };
            if (materialPatch && !(parsedParams && typeof parsedParams.material === 'object')) {
              mergedParams.material = materialPatch;
            }

            const patched = {
              ...element,
              ...parsed,
              params: mergedParams,
              id: element.id,
              visible: element.visible,
            } as TemplateElement;

            return ensureElement(patched, index);
          }

          return {
            ...element,
            params: parsed,
          };
        }),
      );
      setDraftError(null);
    } catch {
      // Keep typing experience smooth; errors are handled by explicit apply/save actions too.
    }
  };

  const handleDraftJsonChange = (value: string) => {
    setDraftJson(value);
    applyDraftJsonToSelectedElementLive(value);
  };

  const saveSelectedName = () => {
    if (!selectedElement) return;
    const nextName = nameDraft.trim();
    if (!nextName) return;
    updateTemplateElements((elements) => elements.map((element) => (element.id === selectedElement.id ? { ...element, name: nextName } : element)));
    setEditorNotice('Name saved.');
  };

  const saveSelectedParams = () => {
    if (!selectedElement) return;
    try {
      const parsed = JSON.parse(paramsDraft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Params must be an object');
      }

      const isElementPatch =
        Object.prototype.hasOwnProperty.call(parsed, 'type') ||
        Object.prototype.hasOwnProperty.call(parsed, 'params') ||
        Object.prototype.hasOwnProperty.call(parsed, 'placement') ||
        Object.prototype.hasOwnProperty.call(parsed, 'symmetry') ||
        Object.prototype.hasOwnProperty.call(parsed, 'material') ||
        Object.prototype.hasOwnProperty.call(parsed, 'texture') ||
        Object.prototype.hasOwnProperty.call(parsed, 'styleAdjust') ||
        Object.prototype.hasOwnProperty.call(parsed, 'effect3d');

      setDraftError(null);

      if (isElementPatch) {
        updateTemplateElements((elements) =>
          elements.map((element, index) => {
            if (element.id !== selectedElement.id) return element;
            const parsedParams = parsed.params && typeof parsed.params === 'object' ? (parsed.params as Record<string, unknown>) : null;
            const materialPatch = parsed.material && typeof parsed.material === 'object' ? (parsed.material as Record<string, unknown>) : null;
            const mergedParams = {
              ...(element.params && typeof element.params === 'object' ? (element.params as Record<string, unknown>) : {}),
              ...(parsedParams ?? {}),
            };
            if (materialPatch && !(parsedParams && typeof parsedParams.material === 'object')) {
              mergedParams.material = materialPatch;
            }
            const patched = {
              ...element,
              ...parsed,
              params: mergedParams,
              id: element.id,
              visible: element.visible,
            } as TemplateElement;
            return ensureElement(patched, index);
          }),
        );
        setEditorNotice('Element patch saved.');
        return;
      }

      updateTemplateElements((elements) =>
        elements.map((element) => (element.id === selectedElement.id ? { ...element, params: parsed } : element)),
      );
      setEditorNotice('Params saved.');
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Invalid params JSON.');
      setEditorNotice('Save failed: invalid JSON.');
    }
  };

  const setNumericParam = (path: string, value: number) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    const currentParams = selectedElement.params && typeof selectedElement.params === 'object' ? deepClone(selectedElement.params) : {};

    let cursor: Record<string, unknown> = currentParams;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const key = segments[i];
      const child = cursor[key];
      if (!child || typeof child !== 'object') {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1]] = value;

    updateTemplateElements((elements) =>
      elements.map((element) => (element.id === selectedElement.id ? { ...element, params: currentParams } : element)),
    );
  };

  const getNumericParam = (path: string, fallback: number) => {
    if (!selectedElement || !selectedElement.params || typeof selectedElement.params !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.params;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const setStringParam = (path: string, value: string) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    const currentParams = selectedElement.params && typeof selectedElement.params === 'object' ? deepClone(selectedElement.params) : {};

    let cursor: Record<string, unknown> = currentParams;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const key = segments[i];
      const child = cursor[key];
      if (!child || typeof child !== 'object') {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1]] = value;

    updateTemplateElements((elements) =>
      elements.map((element) => (element.id === selectedElement.id ? { ...element, params: currentParams } : element)),
    );
  };

  const getStringParam = (path: string, fallback: string) => {
    if (!selectedElement || !selectedElement.params || typeof selectedElement.params !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.params;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const normalizeColorHex = (value: string, fallback: string) => {
    const raw = (value ?? '').trim();
    const fullHex = /^#([0-9a-fA-F]{6})$/;
    if (fullHex.test(raw)) return raw;
    const shortHex = /^#([0-9a-fA-F]{3})$/;
    if (shortHex.test(raw)) {
      const m = raw.slice(1);
      return `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`;
    }
    return fallback;
  };

  const getColorParam = (path: string, fallback: string) => normalizeColorHex(getStringParam(path, fallback), fallback);

  const isSelectedType = (...types: string[]) => {
    if (!selectedElement || typeof selectedElement.type !== 'string') return false;
    return types.includes(selectedElement.type);
  };

  const getSideLength = (index: number, fallback = 0.1) => {
    if (!selectedElement || !selectedElement.params || typeof selectedElement.params !== 'object') return fallback;
    const params = selectedElement.params as Record<string, unknown>;

    if (selectedElement.type === 'free_polygon') {
      const sides = Array.isArray(params.sides) ? params.sides : [];
      const value = Number(sides[index]);
      return Number.isFinite(value) ? value : fallback;
    }

    const key = `side${index + 1}`;
    const value = Number(params[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const setSideLength = (index: number, value: number) => {
    if (!selectedElement) return;
    if (selectedElement.type === 'free_polygon') {
      updateTemplateElements((elements) =>
        elements.map((element) => {
          if (element.id !== selectedElement.id) return element;
          const params = element.params && typeof element.params === 'object' ? deepClone(element.params) as Record<string, unknown> : {};
          const sides = Array.isArray(params.sides) ? [...params.sides] as Array<unknown> : [];
          sides[index] = value;
          return { ...element, params: { ...params, sides } };
        }),
      );
      return;
    }

    setNumericParam(`side${index + 1}`, value);
  };

  const getSideCount = () => {
    if (!selectedElement) return 0;
    switch (selectedElement.type) {
      case 'free_triangle':
        return 3;
      case 'free_hexagon':
        return 6;
      case 'free_octagon':
        return 8;
      case 'free_polygon': {
        const count = Number((selectedElement.params as Record<string, unknown> | undefined)?.sidesCount);
        if (Number.isFinite(count)) return Math.max(3, Math.min(12, Math.floor(count)));
        return 6;
      }
      default:
        return 0;
    }
  };

  const setSelectedTextureEnabled = (enabled: boolean) => {
    if (!selectedElement) return;
    const defaultTarget = getPreviousElementName();
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const currentTexture = element.texture && typeof element.texture === 'object' ? deepClone(element.texture) as Record<string, unknown> : {};
        const currentClip = currentTexture.clip && typeof currentTexture.clip === 'object' ? currentTexture.clip as Record<string, unknown> : {};
        const clip = enabled
          ? {
              ...currentClip,
              enabled: true,
              inheritPrevious: true,
              targetName: typeof currentClip.targetName === 'string' && currentClip.targetName.trim().length > 0
                ? currentClip.targetName
                : defaultTarget,
            }
          : currentClip;
        return { ...element, texture: { ...currentTexture, enabled, clip } };
      }),
    );
  };

  const setSelectedTextureNumber = (path: string, value: number) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;

        const texture = element.texture && typeof element.texture === 'object' ? deepClone(element.texture) as Record<string, unknown> : {};
        let cursor: Record<string, unknown> = texture;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        return { ...element, texture };
      }),
    );
  };

  const getSelectedTextureNumber = (path: string, fallback: number) => {
    if (!selectedElement || !selectedElement.texture || typeof selectedElement.texture !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.texture;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const isSelectedTextureEnabled = () => {
    if (!selectedElement || !selectedElement.texture || typeof selectedElement.texture !== 'object') return false;
    return (selectedElement.texture as Record<string, unknown>).enabled === true;
  };

  const setSelectedTextureClipEnabled = (enabled: boolean) => {
    if (!selectedElement) return;
    const defaultTarget = getPreviousElementName();
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const texture = element.texture && typeof element.texture === 'object' ? deepClone(element.texture) as Record<string, unknown> : {};
        const clip = texture.clip && typeof texture.clip === 'object' ? deepClone(texture.clip) as Record<string, unknown> : {};
        const nextClip = {
          ...clip,
          enabled,
          inheritPrevious: enabled ? true : clip.inheritPrevious === true,
          targetName: enabled
            ? (typeof clip.targetName === 'string' && clip.targetName.trim().length > 0 ? clip.targetName : defaultTarget)
            : (typeof clip.targetName === 'string' ? clip.targetName : ''),
        };
        return { ...element, texture: { ...texture, clip: nextClip } };
      }),
    );
  };

  const getSelectedTextureClipEnabled = () => {
    if (!selectedElement || !selectedElement.texture || typeof selectedElement.texture !== 'object') return false;
    const clip = (selectedElement.texture as Record<string, unknown>).clip;
    return !!(clip && typeof clip === 'object' && (clip as Record<string, unknown>).enabled === true);
  };

  const getSelectedTextureClipTargetName = () => {
    if (!selectedElement || !selectedElement.texture || typeof selectedElement.texture !== 'object') return '';
    const clip = (selectedElement.texture as Record<string, unknown>).clip;
    if (!clip || typeof clip !== 'object') return '';
    const value = (clip as Record<string, unknown>).targetName;
    return typeof value === 'string' ? value : '';
  };

  const setSelectedTextureClipTargetName = (targetName: string) => {
    if (!selectedElement) return;
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const texture = element.texture && typeof element.texture === 'object' ? deepClone(element.texture) as Record<string, unknown> : {};
        const clip = texture.clip && typeof texture.clip === 'object' ? deepClone(texture.clip) as Record<string, unknown> : {};
        return { ...element, texture: { ...texture, clip: { ...clip, targetName } } };
      }),
    );
  };

  const setSelectedMaterialEnabled = (enabled: boolean) => {
    if (!selectedElement) return;
    const defaultTarget = getPreviousElementName();
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const currentMaterial = element.material && typeof element.material === 'object' ? deepClone(element.material) as Record<string, unknown> : {};
        const currentClip = currentMaterial.clip && typeof currentMaterial.clip === 'object' ? currentMaterial.clip as Record<string, unknown> : {};
        const clip = enabled
          ? {
              ...currentClip,
              enabled: true,
              inheritPrevious: true,
              targetName: typeof currentClip.targetName === 'string' && currentClip.targetName.trim().length > 0
                ? currentClip.targetName
                : defaultTarget,
            }
          : currentClip;
        return { ...element, material: { ...currentMaterial, enabled, clip } };
      }),
    );
  };

  const setSelectedMaterialNumber = (path: string, value: number) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const material = element.material && typeof element.material === 'object' ? deepClone(element.material) as Record<string, unknown> : {};
        let cursor: Record<string, unknown> = material;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        return { ...element, material };
      }),
    );
  };

  const setSelectedMaterialString = (path: string, value: string) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const material = element.material && typeof element.material === 'object' ? deepClone(element.material) as Record<string, unknown> : {};
        let cursor: Record<string, unknown> = material;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        return { ...element, material };
      }),
    );
  };

  const getSelectedMaterialNumber = (path: string, fallback: number) => {
    if (!selectedElement || !selectedElement.material || typeof selectedElement.material !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.material;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const getSelectedMaterialString = (path: string, fallback: string) => {
    if (!selectedElement || !selectedElement.material || typeof selectedElement.material !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.material;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const isSelectedMaterialEnabled = () => {
    if (!selectedElement || !selectedElement.material || typeof selectedElement.material !== 'object') return false;
    return (selectedElement.material as Record<string, unknown>).enabled === true;
  };

  const setSelectedMaterialClipEnabled = (enabled: boolean) => {
    if (!selectedElement) return;
    const defaultTarget = getPreviousElementName();
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const material = element.material && typeof element.material === 'object' ? deepClone(element.material) as Record<string, unknown> : {};
        const clip = material.clip && typeof material.clip === 'object' ? deepClone(material.clip) as Record<string, unknown> : {};
        const nextClip = {
          ...clip,
          enabled,
          inheritPrevious: enabled ? true : clip.inheritPrevious === true,
          targetName: enabled
            ? (typeof clip.targetName === 'string' && clip.targetName.trim().length > 0 ? clip.targetName : defaultTarget)
            : (typeof clip.targetName === 'string' ? clip.targetName : ''),
        };
        return { ...element, material: { ...material, clip: nextClip } };
      }),
    );
  };

  const getSelectedMaterialClipEnabled = () => {
    if (!selectedElement || !selectedElement.material || typeof selectedElement.material !== 'object') return false;
    const clip = (selectedElement.material as Record<string, unknown>).clip;
    return !!(clip && typeof clip === 'object' && (clip as Record<string, unknown>).enabled === true);
  };

  const getSelectedMaterialClipTargetName = () => {
    if (!selectedElement || !selectedElement.material || typeof selectedElement.material !== 'object') return '';
    const clip = (selectedElement.material as Record<string, unknown>).clip;
    if (!clip || typeof clip !== 'object') return '';
    const value = (clip as Record<string, unknown>).targetName;
    return typeof value === 'string' ? value : '';
  };

  const setSelectedMaterialClipTargetName = (targetName: string) => {
    if (!selectedElement) return;
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const material = element.material && typeof element.material === 'object' ? deepClone(element.material) as Record<string, unknown> : {};
        const clip = material.clip && typeof material.clip === 'object' ? deepClone(material.clip) as Record<string, unknown> : {};
        return { ...element, material: { ...material, clip: { ...clip, targetName } } };
      }),
    );
  };

  useEffect(() => {
    const storedTemplate = loadStoredTemplate();
    const storedLibrary = loadStoredLibrary();
    const storedThemes = loadStoredThemes();
    if (storedTemplate) {
      setWorkingTemplate(storedTemplate);
      if (storedTemplate.activeStyle === 'gold_dark' || storedTemplate.activeStyle === 'steel_night') {
        setActiveStyle(storedTemplate.activeStyle);
      }
      if (storedTemplate.elements.length > 0) {
        setSelectedElementId(storedTemplate.elements[0].id ?? null);
        setSelectedPanelTarget('element');
      } else {
        setSelectedPanelTarget('layout');
      }
    } else {
      setWorkingTemplate(deepClone(DEFAULT_EMPTY_TEMPLATE));
      setSelectedPanelTarget('layout');
    }
    if (storedLibrary) {
      setLibrary(storedLibrary);
      void syncLibraryFromFirebase();
    } else {
      void syncLibraryFromFirebase();
    }
    if (storedThemes) {
      setThemes(storedThemes);
    }
    void renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authConfigured) return;

    if (getCurrentAuthUser()) {
      void syncLibraryFromFirebase();
    }

    return subscribeAuthState((user) => {
      if (!user) return;
      void syncLibraryFromFirebase();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authConfigured, syncLibraryFromFirebase]);

  useEffect(() => {
    if (!selectedElement) return;
    setNameDraft(typeof selectedElement.name === 'string' ? selectedElement.name : '');
    const params = selectedElement.params && typeof selectedElement.params === 'object' ? selectedElement.params : {};
    setParamsDraft(JSON.stringify(params, null, 2));
    setDraftJson(JSON.stringify(selectedElement, null, 2));
  }, [selectedElement]);

  useEffect(() => {
    if (!workingTemplate || !workingTemplate.layout || typeof workingTemplate.layout !== 'object') return;
    setLayoutDraft(JSON.stringify(workingTemplate.layout, null, 2));
  }, [workingTemplate]);

  useEffect(() => {
    if (!workingTemplate) return;
    void renderPreview(workingTemplate);
  }, [activeStyle, colorMode, renderPreview, workingTemplate]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_12%,#1e293b_0%,#0b1020_35%,#08090c_100%)] text-white p-4 md:p-6">
      <section className="mx-auto w-full max-w-[1500px] rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-4 md:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Deterministic Engine</p>
            <h1 className="mt-2 text-2xl font-semibold">Parametric Watchface Designer</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Left: element library and add flow. Middle: preview + layers. Right: selected element controls.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={() => navigate('/studio')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Studio
          </Button>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">Element Drawer</h2>
            <p className="text-xs text-zinc-400">Pick from categories, then Add to Canvas. Saved items persist in this browser local storage.</p>
            {drawerNotice ? <p className="text-xs text-emerald-400">{drawerNotice}</p> : null}

            <button
              type="button"
              onClick={() => {
                setSelectedPanelTarget('layout');
                setSelectedElementId(null);
              }}
              className={`w-full rounded border px-3 py-2 text-left ${selectedPanelTarget === 'layout' ? 'border-amber-400 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/70'}`}
            >
              <p className="text-xs font-medium text-zinc-100">Layout Space</p>
              <p className="mt-1 text-[11px] text-zinc-400">Click to edit layout controls on the right panel.</p>
            </button>

            <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Themes Library</p>
              <p className="mt-1 text-[11px] text-zinc-500">Save all current layers as one theme pack, then load later.</p>

              <div className="mt-2 flex gap-2">
                <input
                  value={themeNameDraft}
                  onChange={(e) => setThemeNameDraft(e.target.value)}
                  placeholder="Theme name"
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                />
                <button
                  type="button"
                  onClick={saveCurrentAsTheme}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Save Theme
                </button>
              </div>

              <div className="mt-2 max-h-36 overflow-auto space-y-2">
                {themes.map((theme) => (
                  <div key={theme.id} className="rounded border border-zinc-800 bg-zinc-900 p-2">
                    <p className="text-xs font-medium text-zinc-200">{theme.name}</p>
                    <p className="text-[11px] text-zinc-500">{(theme.template.elements ?? []).length} layers</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={themeNameDrafts[theme.id] ?? theme.name}
                        onChange={(e) => setThemeNameDrafts((prev) => ({ ...prev, [theme.id]: e.target.value }))}
                        className="h-7 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => renameThemeById(theme.id)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Rename
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyThemeById(theme.id)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteThemeById(theme.id)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {themes.length === 0 ? <p className="text-[11px] text-zinc-500">No saved themes yet.</p> : null}
              </div>
            </div>

            <div className="max-h-80 overflow-auto space-y-3 pr-1">
              {groupedLibrary.map(([category, entries]) => (
                <div key={category} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400">{category}</p>

                  <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/60 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Type Draft JSON</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Paste/edit JSON for this element type.</p>
                    <textarea
                      value={getCategoryDraftText(category, entries[0]?.element)}
                      onChange={(e) => setCategoryDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                      className="mt-2 h-24 w-full resize-y rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => addCategoryDraftToCanvas(category, entries[0]?.element)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Add Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => saveCategoryDraftToLibrary(category, entries[0]?.element)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Save Draft
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Saved {category} Elements ({entries.length})</p>
                    <div className="mt-2 space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-900 p-2">
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => addElementToCanvas(entry.element)}
                            className="w-full text-left"
                          >
                            <p className="text-xs font-medium text-zinc-200">{entry.name}</p>
                          </button>

                          <div className="flex gap-2">
                            <input
                              value={libraryNameDrafts[entry.id] ?? entry.name}
                              onChange={(e) => setLibraryNameDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                              className="h-7 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                            />
                            <button
                              type="button"
                              onClick={() => renameLibraryEntry(entry.id)}
                              className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                            >
                              Rename
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => addElementToCanvas(entry.element)}
                            className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDraftJson(JSON.stringify(entry.element, null, 2));
                              setCategoryDrafts((prev) => ({ ...prev, [category]: JSON.stringify(entry.element, null, 2) }));
                              setDrawerNotice(`${category}: copied element JSON to draft box.`);
                            }}
                            className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                          >
                            JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLibraryEntry(entry.id)}
                            className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-950/60 p-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">JSON Input (Element or Full Template)</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Paste element JSON, full template JSON, or layout-only JSON to update template space.
              </p>
              <textarea
                value={draftJson}
                onChange={(e) => handleDraftJsonChange(e.target.value)}
                className="mt-2 h-40 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] leading-5 text-zinc-300"
              />
              {draftError ? <p className="mt-2 text-xs text-red-400">{draftError}</p> : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraftJson(BASE_TEMPLATE_DRAFT)}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Use Base JSON
                </button>
                <button
                  type="button"
                  onClick={addDraftToCanvas}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Add to Canvas
                </button>
                <button
                  type="button"
                  onClick={saveDraftToLibrary}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Save to Drawer
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">Preview</h2>
                <Button
                  type="button"
                  className="h-9 bg-amber-500 text-black hover:bg-amber-400"
                  onClick={() => void renderPreview()}
                  disabled={isRendering}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRendering ? 'animate-spin' : ''}`} />
                  {isRendering ? 'Rendering...' : 'Apply Preview'}
                </Button>
              </div>
              <div className="mt-3 grid place-items-center rounded-lg border border-zinc-800 bg-black/60 p-4 min-h-[420px]">
                {svgMarkup ? (
                  <div className="w-full max-w-[520px]" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
                ) : (
                  <p className="text-sm text-zinc-500">No preview yet.</p>
                )}
              </div>
              {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">Layers (Order = Render Order)</h2>
                <span className="text-xs text-zinc-400">{(workingTemplate?.elements ?? []).length} layer(s)</span>
              </div>

              <div className="mt-3 max-h-64 overflow-auto rounded-md border border-zinc-800 bg-zinc-950/70">
                {(workingTemplate?.elements ?? []).map((element, index) => {
                  const isSelected = selectedPanelTarget === 'element' && selectedElementId === element.id;
                  return (
                    <div
                      key={element.id ?? `${element.type}-${index}`}
                      className={`flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 text-xs ${isSelected ? 'bg-zinc-800/60' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedElementId(element.id ?? null);
                          setSelectedPanelTarget('element');
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate font-medium text-zinc-200">{element.name ?? `layer-${index + 1}`}</p>
                        <p className="truncate text-zinc-500">{element.type} · {element.role}</p>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleElementVisibility(element.id ?? '')}
                          className="rounded border border-zinc-700 p-1 text-zinc-300 hover:bg-zinc-800"
                          title={element.visible === false ? 'Show layer' : 'Hide layer'}
                        >
                          {element.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElement(element.id ?? '', 'up')}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElement(element.id ?? '', 'down')}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeElement(element.id ?? '')}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(workingTemplate?.elements ?? []).length === 0 ? (
                  <p className="px-3 py-4 text-xs text-zinc-500">No layers yet. Add from left drawer.</p>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">Controls</h2>

            <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-300">Global Render Controls</p>
              <p className="text-[11px] text-zinc-500">
                Style = material preset mapping for generated visuals. It is global, not tied to one selected element.
              </p>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Style</span>
              <select
                value={activeStyle}
                onChange={(e) => {
                  const nextStyle = e.target.value as StyleKey;
                  setActiveStyle(nextStyle);
                  setWorkingTemplate((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, activeStyle: nextStyle };
                    saveTemplate(next);
                    return next;
                  });
                }}
                className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
              >
                <option value="gold_dark">gold_dark</option>
                <option value="steel_night">steel_night</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Color Mode</span>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
                className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
              >
                <option value="off">off</option>
                <option value="warning">warning</option>
                <option value="enforce">enforce</option>
              </select>
            </label>
            </div>

            {selectedPanelTarget === 'layout' ? (
            <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-300">Template Space Controls</p>
              <p className="text-[11px] text-zinc-500">These define the coordinate space only. Add a Base element from left drawer to draw the first visible layer.</p>

              <div className="rounded border border-zinc-800 bg-zinc-950/60 p-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">Layout JSON</p>
                <p className="mt-1 text-[11px] text-zinc-500">Paste layout JSON here and apply directly.</p>
                <textarea
                  value={layoutDraft}
                  onChange={(e) => setLayoutDraft(e.target.value)}
                  className="mt-2 h-28 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] leading-5 text-zinc-300"
                />
                {layoutDraftError ? <p className="mt-2 text-xs text-red-400">{layoutDraftError}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={applyLayoutDraft}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    Apply Layout JSON
                  </button>
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-400">Base Shape</span>
                <select
                  value={getLayoutShape()}
                  onChange={(e) => {
                    const nextShape = e.target.value === 'rectangle' ? 'rectangle' : 'circle';
                    syncBaseElementShapeToLayout(nextShape);
                  }}
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs"
                >
                  <option value="circle">circle</option>
                  <option value="rectangle">rectangle</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-500">Width {Math.round(getLayoutNumber('width', 480))}</span>
                <input
                  type="range"
                  min={200}
                  max={900}
                  step={10}
                  value={getLayoutNumber('width', 480)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    updateTemplateLayout((layout) => ({ ...layout, width: next }));
                  }}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-500">Height {Math.round(getLayoutNumber('height', 480))}</span>
                <input
                  type="range"
                  min={200}
                  max={900}
                  step={10}
                  value={getLayoutNumber('height', 480)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    updateTemplateLayout((layout) => ({ ...layout, height: next }));
                  }}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-500">Base Radius {getLayoutNumber('baseRadius', 0.5).toFixed(3)}</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.5}
                  step={0.005}
                  value={getLayoutNumber('baseRadius', 0.5)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    updateTemplateLayout((layout) => ({ ...layout, baseRadius: next }));
                  }}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-500">Padding {getLayoutNumber('padding', 0.04).toFixed(3)}</span>
                <input
                  type="range"
                  min={0}
                  max={0.2}
                  step={0.002}
                  value={getLayoutNumber('padding', 0.04)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    updateTemplateLayout((layout) => ({ ...layout, padding: next }));
                  }}
                  className="w-full"
                />
              </label>
            </div>
            ) : null}

            {selectedPanelTarget === 'element' && selectedElement ? (
              <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-300">Editing: {selectedElement.type}</p>

                <label className="block space-y-1">
                  <span className="text-[11px] text-zinc-400">Name</span>
                  <div className="flex gap-2">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={saveSelectedName}
                      className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                    >
                      Save
                    </button>
                  </div>
                </label>

                {selectedElement.type === 'bezel' || selectedElement.type === 'outline_ring' || selectedElement.type === 'free_ring' ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Ring Controls</p>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Radius {getNumericParam('radius', 0.45).toFixed(3)}</span>
                      <input type="range" min={0} max={1} step={0.005} value={getNumericParam('radius', 0.45)} onChange={(e) => setNumericParam('radius', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Thickness {getNumericParam('thickness', 0.02).toFixed(3)}</span>
                      <input type="range" min={0.001} max={0.2} step={0.001} value={getNumericParam('thickness', 0.02)} onChange={(e) => setNumericParam('thickness', Number(e.target.value))} className="w-full" />
                    </label>
                  </div>
                ) : null}

                {selectedElement.type === 'ticks_radial' ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Ticks Controls</p>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Radius {getNumericParam('radius', 0.42).toFixed(3)}</span>
                      <input type="range" min={0} max={1} step={0.005} value={getNumericParam('radius', 0.42)} onChange={(e) => setNumericParam('radius', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Length {getNumericParam('length', 0.02).toFixed(3)}</span>
                      <input type="range" min={0.001} max={0.2} step={0.001} value={getNumericParam('length', 0.02)} onChange={(e) => setNumericParam('length', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Width {getNumericParam('width', 0.003).toFixed(3)}</span>
                      <input type="range" min={0.001} max={0.05} step={0.001} value={getNumericParam('width', 0.003)} onChange={(e) => setNumericParam('width', Number(e.target.value))} className="w-full" />
                    </label>
                  </div>
                ) : null}

                {isSelectedType('free_circle', 'free_rect', 'free_ring', 'free_triangle', 'free_hexagon', 'free_octagon', 'free_polygon') ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Free Shape Paint</p>
                    <p className="text-[11px] text-zinc-500">Use color wheel or hex picker for fill and stroke.</p>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Fill Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={getColorParam('fill', '#58657b')}
                          onChange={(e) => setStringParam('fill', e.target.value)}
                          className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                        />
                        <input
                          value={getStringParam('fill', '#58657b')}
                          onChange={(e) => setStringParam('fill', e.target.value)}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        />
                      </div>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Stroke Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={getColorParam('stroke', '#e5ecff')}
                          onChange={(e) => setStringParam('stroke', e.target.value)}
                          className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                        />
                        <input
                          value={getStringParam('stroke', '#e5ecff')}
                          onChange={(e) => setStringParam('stroke', e.target.value)}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        />
                      </div>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Stroke Width {getNumericParam('strokeWidth', getNumericParam('thickness', 0.008)).toFixed(3)}</span>
                      <input
                        type="range"
                        min={0}
                        max={0.06}
                        step={0.001}
                        value={getNumericParam('strokeWidth', getNumericParam('thickness', 0.008))}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setNumericParam('strokeWidth', next);
                          setNumericParam('thickness', next);
                        }}
                        className="w-full"
                      />
                    </label>
                  </div>
                ) : null}

                {isSelectedType('free_triangle', 'free_hexagon', 'free_octagon', 'free_polygon') ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Side Length Controls</p>
                    <p className="text-[11px] text-zinc-500">Each side length is editable independently.</p>

                    {Array.from({ length: getSideCount() }).map((_, index) => (
                      <label key={`side-${index + 1}`} className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Side {index + 1}: {getSideLength(index, 0.1).toFixed(3)}</span>
                        <input
                          type="range"
                          min={0.02}
                          max={0.5}
                          step={0.001}
                          value={getSideLength(index, 0.1)}
                          onChange={(e) => setSideLength(index, Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Texture (Clipped)</p>
                  <p className="text-[11px] text-zinc-500">One texture system only. Clip target defaults to previous layer name when enabled.</p>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedTextureEnabled()}
                      onChange={(e) => setSelectedTextureEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Enable texture on this element</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Opacity {getSelectedTextureNumber('opacity', 0.3).toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={getSelectedTextureNumber('opacity', 0.3)}
                      onChange={(e) => setSelectedTextureNumber('opacity', Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Noise Amount {getSelectedTextureNumber('noise.amount', 0.2).toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={getSelectedTextureNumber('noise.amount', 0.2)}
                      onChange={(e) => setSelectedTextureNumber('noise.amount', Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Noise Radius {getSelectedTextureNumber('noise.radius', 24).toFixed(1)}</span>
                    <input
                      type="range"
                      min={1}
                      max={120}
                      step={1}
                      value={getSelectedTextureNumber('noise.radius', 24)}
                      onChange={(e) => setSelectedTextureNumber('noise.radius', Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={getSelectedTextureClipEnabled()}
                      onChange={(e) => setSelectedTextureClipEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Clip texture to target element</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Texture Clip Target Name</span>
                    <input
                      value={getSelectedTextureClipTargetName()}
                      onChange={(e) => setSelectedTextureClipTargetName(e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    />
                  </label>
                </div>

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Material (Clipped)</p>
                  <p className="text-[11px] text-zinc-500">Material overlay works like texture and stores inside element JSON.</p>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedMaterialEnabled()}
                      onChange={(e) => setSelectedMaterialEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Enable material on this element</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeColorHex(getSelectedMaterialString('color', '#ffffff'), '#ffffff')}
                        onChange={(e) => setSelectedMaterialString('color', e.target.value)}
                        className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                      />
                      <input
                        value={getSelectedMaterialString('color', '#ffffff')}
                        onChange={(e) => setSelectedMaterialString('color', e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Opacity {getSelectedMaterialNumber('opacity', 0.18).toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={getSelectedMaterialNumber('opacity', 0.18)}
                      onChange={(e) => setSelectedMaterialNumber('opacity', Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Blend Mode</span>
                    <input
                      value={getSelectedMaterialString('blendMode', 'multiply')}
                      onChange={(e) => setSelectedMaterialString('blendMode', e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={getSelectedMaterialClipEnabled()}
                      onChange={(e) => setSelectedMaterialClipEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Clip material to target element</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Material Clip Target Name</span>
                    <input
                      value={getSelectedMaterialClipTargetName()}
                      onChange={(e) => setSelectedMaterialClipTargetName(e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] text-zinc-400">Params JSON</span>
                  <textarea
                    value={paramsDraft}
                    onChange={(e) => setParamsDraft(e.target.value)}
                    className="h-36 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300"
                  />
                  <p className="text-[11px] text-zinc-500">Accepts params-only JSON or full element patch JSON.</p>
                  <button
                    type="button"
                    onClick={saveSelectedParams}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Save Params
                  </button>
                  <button
                    type="button"
                    onClick={saveSelectedToLibrary}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Save Selected to Drawer
                  </button>
                  {editorNotice ? <p className="text-xs text-emerald-400">{editorNotice}</p> : null}
                </label>
              </div>
            ) : selectedPanelTarget === 'element' ? (
              <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Element Controls</p>
                <p className="mt-2 text-xs text-zinc-500">No element selected yet. Pick a layer in the middle panel to edit element-specific controls.</p>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
