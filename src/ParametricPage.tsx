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

const PARAMETRIC_TEMPLATE_STORAGE_KEY = 'parametric-template-elements-v1';
const PARAMETRIC_LIBRARY_STORAGE_KEY = 'parametric-element-library-v1';

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
  const [ringRadius, setRingRadius] = useState(44);
  const [tickWidth, setTickWidth] = useState(0.8);

  const [workingTemplate, setWorkingTemplate] = useState<TemplateModel | null>(null);
  const [library, setLibrary] = useState<Array<LibraryEntry>>(SAMPLE_LIBRARY);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [paramsDraft, setParamsDraft] = useState('{}');
  const [layoutDraft, setLayoutDraft] = useState(JSON.stringify(DEFAULT_EMPTY_TEMPLATE.layout, null, 2));
  const [layoutDraftError, setLayoutDraftError] = useState<string | null>(null);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<string | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});

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

  const saveLibrary = (items: Array<LibraryEntry>) => {
    try {
      window.localStorage.setItem(PARAMETRIC_LIBRARY_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore localStorage failures.
    }

    if (authConfigured && getCurrentAuthUser()) {
      const payload = items.map((entry) => JSON.parse(JSON.stringify(entry)) as Record<string, unknown>);
      void saveParametricLibraryToFirebase({ entries: payload }).catch(() => {
        // Keep local data even if cloud sync fails.
      });
    }
  };

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

  const syncLibraryFromFirebase = useCallback(async (localFallback?: Array<LibraryEntry>) => {
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

      const seed = localFallback && localFallback.length > 0 ? localFallback : null;
      if (seed && seed.length > 0) {
        const payload = seed.map((entry) => JSON.parse(JSON.stringify(entry)) as Record<string, unknown>);
        await saveParametricLibraryToFirebase({ entries: payload });
        setDrawerNotice('Library initialized in Firebase from local data.');
      }
    } catch {
      setDrawerNotice('Firebase sync unavailable. Using local drawer library.');
    }
  }, [authConfigured]);

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
        activeStyle,
        templateInput: renderInput,
        paramOverrides: {
          ring: { radius: ringRadius },
          tick: { width: tickWidth },
        },
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
  }, [activeStyle, colorMode, ringRadius, tickWidth, workingTemplate]);

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
      updateTemplateLayout(() => parsed);
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

    setLibrary((prev) => {
      const next = [...prev, nextEntry];
      saveLibrary(next);
      return next;
    });

    setEditorNotice('Saved to drawer library.');
    setDrawerNotice('Draft JSON saved to drawer library.');
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

    setLibrary((prev) => {
      const next = [...prev, nextEntry];
      saveLibrary(next);
      return next;
    });

    setDrawerNotice(`${category}: draft saved to this type library.`);
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

    setLibrary((prev) => {
      const next = [...prev, nextEntry];
      saveLibrary(next);
      return next;
    });

    setEditorNotice('Selected element saved to drawer library.');
  };

  const addDraftToCanvas = () => {
    const template = parseDraftTemplate();
    if (template) {
      setWorkingTemplate(template);
      saveTemplate(template);
      setSelectedElementId(template.elements[0]?.id ?? null);
      setDraftError(null);
      void renderPreview(template);
      return;
    }

    const parsed = parseDraftElement();
    if (!parsed) return;
    addElementToCanvas(parsed);
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

  useEffect(() => {
    const storedTemplate = loadStoredTemplate();
    const storedLibrary = loadStoredLibrary();
    if (storedTemplate) {
      setWorkingTemplate(storedTemplate);
      if (storedTemplate.elements.length > 0) {
        setSelectedElementId(storedTemplate.elements[0].id ?? null);
      }
    } else {
      setWorkingTemplate(deepClone(DEFAULT_EMPTY_TEMPLATE));
    }
    if (storedLibrary) {
      setLibrary(storedLibrary);
      void syncLibraryFromFirebase(storedLibrary);
    } else {
      void syncLibraryFromFirebase(SAMPLE_LIBRARY);
    }
    void renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authConfigured) return;

    if (getCurrentAuthUser()) {
      void syncLibraryFromFirebase(loadStoredLibrary() ?? undefined);
    }

    return subscribeAuthState((user) => {
      if (!user) return;
      void syncLibraryFromFirebase(loadStoredLibrary() ?? undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authConfigured, syncLibraryFromFirebase]);

  useEffect(() => {
    if (!selectedElement) return;
    setNameDraft(typeof selectedElement.name === 'string' ? selectedElement.name : '');
    const params = selectedElement.params && typeof selectedElement.params === 'object' ? selectedElement.params : {};
    setParamsDraft(JSON.stringify(params, null, 2));
  }, [selectedElement]);

  useEffect(() => {
    if (!workingTemplate || !workingTemplate.layout || typeof workingTemplate.layout !== 'object') return;
    setLayoutDraft(JSON.stringify(workingTemplate.layout, null, 2));
  }, [workingTemplate]);

  useEffect(() => {
    if (!workingTemplate) return;
    void renderPreview(workingTemplate);
  }, [activeStyle, colorMode, ringRadius, tickWidth, renderPreview, workingTemplate]);

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
                        <p className="text-xs font-medium text-zinc-200">{entry.name}</p>
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
                onChange={(e) => setDraftJson(e.target.value)}
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
                  const isSelected = selectedElementId === element.id;
                  return (
                    <div
                      key={element.id ?? `${element.type}-${index}`}
                      className={`flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 text-xs ${isSelected ? 'bg-zinc-800/60' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedElementId(element.id ?? null)}
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
                onChange={(e) => setActiveStyle(e.target.value as StyleKey)}
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

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Bezel Radius Override: {ringRadius.toFixed(1)}</span>
              <input
                type="range"
                min={20}
                max={48}
                step={0.5}
                value={ringRadius}
                onChange={(e) => setRingRadius(Number(e.target.value))}
                className="w-full"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Tick Width Override: {tickWidth.toFixed(2)}</span>
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.05}
                value={tickWidth}
                onChange={(e) => setTickWidth(Number(e.target.value))}
                className="w-full"
              />
            </label>
            </div>

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
                    updateTemplateLayout((layout) => ({ ...layout, shape: nextShape }));
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

            {selectedElement ? (
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

                {selectedElement.type === 'bezel' || selectedElement.type === 'outline_ring' ? (
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

                {selectedElement.type === 'texture_layer' ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Texture Controls</p>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Opacity {getNumericParam('opacity', 0.35).toFixed(3)}</span>
                      <input type="range" min={0} max={1} step={0.01} value={getNumericParam('opacity', 0.35)} onChange={(e) => setNumericParam('opacity', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Noise Density {getNumericParam('noise.density', 0.5).toFixed(3)}</span>
                      <input type="range" min={0} max={1} step={0.01} value={getNumericParam('noise.density', 0.5)} onChange={(e) => setNumericParam('noise.density', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Effect Radius {getNumericParam('noise.effectRadius', 20).toFixed(1)}</span>
                      <input type="range" min={1} max={120} step={1} value={getNumericParam('noise.effectRadius', 20)} onChange={(e) => setNumericParam('noise.effectRadius', Number(e.target.value))} className="w-full" />
                    </label>
                  </div>
                ) : null}

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
            ) : (
              <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Element Controls</p>
                <p className="mt-2 text-xs text-zinc-500">No element selected yet. Pick a layer in the middle panel to edit element-specific controls.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
