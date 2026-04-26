/**
 * IconLab.tsx
 * Top-drawer panel for previewing / generating icons and saving them to the
 * persistent custom icon library (IndexedDB).
 *
 * Features:
 *  - Paste SVG or HTML → sandboxed iframe live preview
 *  - Upload .svg file directly
 *  - Optional AI generation via user-supplied OpenAI or Gemini API key
 *  - Name + category → Save to library (IndexedDB, permanent)
 *  - Custom font upload (woff2/ttf/otf)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, FlaskConical, Upload, Key, Wand2, Plus, Trash2, ChevronDown, Pencil } from 'lucide-react';
import {
  saveCustomIcon,
  deleteCustomIcon,
  loadCustomIcons,
  renderSvgToDataUrl,
  renderHtmlToDataUrl,
  type CustomIconRecord,
} from '@/lib/customIconStore';
import {
  saveCustomFont,
  deleteCustomFont,
  loadCustomFonts,
  registerCustomFonts,
  type CustomFontRecord,
} from '@/lib/customFontStore';
import {
  saveCustomHandStyle,
  deleteCustomHandStyle,
  loadCustomHandStyles,
  type CustomHandRecord,
} from '@/lib/customHandStore';
import { publishLabAssetsChanged, subscribeLabAssetsChanged } from '@/lib/labSync';

// ── Types ─────────────────────────────────────────────────────────────────────

type CodeMode = 'svg' | 'html';
type AIModel = 'gpt-4o' | 'gemini-2.5-flash';
type TabId = 'icons' | 'pointers' | 'fonts';

const ICON_SOURCE_VERSION = 1;

interface PointerComposerDraft {
  hourHtml: string;
  minuteHtml: string;
  secondHtml: string;
  hubHtml: string;
}

interface PointerAxisAdjustments {
  hour: number;
  minute: number;
  second: number;
}

interface PointerLayerAnchor {
  xRatio: number;
  yRatio: number;
}

type ComposerLayerKey = 'hour' | 'minute' | 'second' | 'hub';
type ComposerLayerValidation = {
  state: 'idle' | 'valid' | 'error';
  message: string;
};

const POINTER_COMPOSER_DRAFT_KEY = 'zepp-pointer-composer-draft-v1';
const POINTER_COMPOSER_AXIS_KEY = 'zepp-pointer-composer-axis-v2';
const COMPOSER_PREVIEW_RASTER_SIZE = 512;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a new icon is saved so the picker can refresh. */
  onIconsSaved?: () => void;
  /** Called after a new font is saved so the font picker can refresh. */
  onFontsSaved?: () => void;
  /** Called after a new clock hand style is saved so PropertyPanel can refresh. */
  onHandsSaved?: () => void;
}

// ── AI generation helpers ─────────────────────────────────────────────────────

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an SVG icon designer. Respond ONLY with a valid SVG element (starting with <svg) for a 64×64 icon. No explanation, no markdown, no backticks.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function parseLayerAnchorFromSvg(svgRaw: string): PointerLayerAnchor {
  const svgMatch = svgRaw.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const vbMatch = svgMatch.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!vbMatch) return { xRatio: 0.5, yRatio: 0.5 };

  const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some(Number.isNaN)) return { xRatio: 0.5, yRatio: 0.5 };
  const [minX, minY, width, height] = parts;
  if (width <= 0 || height <= 0) return { xRatio: 0.5, yRatio: 0.5 };

  const dataX = svgMatch.match(/\bdata-pivot-x\s*=\s*["']([^"']+)["']/i);
  const dataY = svgMatch.match(/\bdata-pivot-y\s*=\s*["']([^"']+)["']/i);
  const legacyPivotEl = svgRaw.match(/<circle[^>]*\bid\s*=\s*["']pivot["'][^>]*\bfill\s*=\s*["']#ff00ff["'][^>]*>/i)?.[0] ?? '';
  const legacyCx = legacyPivotEl.match(/\bcx\s*=\s*["']([^"']+)["']/i);
  const legacyCy = legacyPivotEl.match(/\bcy\s*=\s*["']([^"']+)["']/i);

  const pivotX = Number(dataX?.[1] ?? legacyCx?.[1]);
  const pivotY = Number(dataY?.[1] ?? legacyCy?.[1]);

  if (Number.isNaN(pivotX) || Number.isNaN(pivotY)) {
    return { xRatio: 0.5, yRatio: 0.5 };
  }

  return {
    xRatio: clamp01((pivotX - minX) / width),
    yRatio: clamp01((pivotY - minY) / height),
  };
}

function extractFirstSvg(raw: string): string | null {
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

function svgToDataUrl(svgRaw: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgRaw)}`;
}

// ── Retry helper (for 429 / 503 transient errors) ───────────────────────────
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;
const RETRYABLE_STATUS = new Set([429, 503]);

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  onRetry?: (attempt: number, total: number) => void,
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, options);
    if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === MAX_RETRIES) return res;
    onRetry?.(attempt + 1, MAX_RETRIES);
    await new Promise(r => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
  }
  throw new Error('Unreachable');
}

async function generateWithGemini(
  prompt: string,
  apiKey: string,
  onRetry?: (attempt: number, total: number) => void,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an SVG icon designer. Respond ONLY with a valid SVG element (starting with <svg) for a 64×64 icon. No explanation, no markdown, no backticks.\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
      }),
    },
    onRetry,
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IconLab({ open, onClose, onIconsSaved, onFontsSaved, onHandsSaved }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('icons');

  // ── Icon Lab state ─────────────────────────────────────────────────────────
  const [codeMode, setCodeMode] = useState<CodeMode>('svg');
  const [code, setCode] = useState('');
  const [previewSize] = useState(256); // fixed container — zoom changes content scale
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [darkBg, setDarkBg] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('My Icons');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [savedIcons, setSavedIcons] = useState<CustomIconRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // ── AI state ───────────────────────────────────────────────────────────────
  const [showAI, setShowAI] = useState(false);
  const [aiModel, setAiModel] = useState<AIModel>('gpt-4o');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRetryStatus, setAiRetryStatus] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('zepp-lab-api-key') ?? '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState('');

  // ── Font state ─────────────────────────────────────────────────────────────
  const [savedFonts, setSavedFonts] = useState<CustomFontRecord[]>([]);
  const [fontName, setFontName] = useState('');
  const [fontSaving, setFontSaving] = useState(false);
  const [fontMsg, setFontMsg] = useState('');
  const fontFileRef = useRef<HTMLInputElement>(null);
  const [pendingFontFile, setPendingFontFile] = useState<File | null>(null);

  // ── Clock hand state ──────────────────────────────────────────────────────
  const [savedHands, setSavedHands] = useState<CustomHandRecord[]>([]);
  const [saveHandName, setSaveHandName] = useState('');
  const [savingHand, setSavingHand] = useState(false);
  const [saveHandMsg, setSaveHandMsg] = useState('');
  // Task 2: structured state model for pointer composer, persisted locally.
  const [composerDraft, setComposerDraft] = useState<PointerComposerDraft>(() => {
    try {
      const raw = localStorage.getItem(POINTER_COMPOSER_DRAFT_KEY);
      if (!raw) {
        return { hourHtml: '', minuteHtml: '', secondHtml: '', hubHtml: '' };
      }
      const parsed = JSON.parse(raw) as Partial<PointerComposerDraft>;
      return {
        hourHtml: typeof parsed.hourHtml === 'string' ? parsed.hourHtml : '',
        minuteHtml: typeof parsed.minuteHtml === 'string' ? parsed.minuteHtml : '',
        secondHtml: typeof parsed.secondHtml === 'string' ? parsed.secondHtml : '',
        hubHtml: typeof parsed.hubHtml === 'string' ? parsed.hubHtml : '',
      };
    } catch {
      return { hourHtml: '', minuteHtml: '', secondHtml: '', hubHtml: '' };
    }
  });
  const [composerValidation, setComposerValidation] = useState<Record<ComposerLayerKey, ComposerLayerValidation>>({
    hour: { state: 'idle', message: 'Not validated' },
    minute: { state: 'idle', message: 'Not validated' },
    second: { state: 'idle', message: 'Not validated' },
    hub: { state: 'idle', message: 'Not validated' },
  });
  const [composerLayerPng, setComposerLayerPng] = useState<Record<ComposerLayerKey, string>>({
    hour: '',
    minute: '',
    second: '',
    hub: '',
  });
  const [validatingComposer, setValidatingComposer] = useState(false);
  const composerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [composerAxis, setComposerAxis] = useState<PointerAxisAdjustments>(() => {
    try {
      const raw = localStorage.getItem(POINTER_COMPOSER_AXIS_KEY);
      if (!raw) {
        return { hour: 0, minute: 0, second: 0 };
      }
      const parsed = JSON.parse(raw) as Partial<PointerAxisAdjustments>;
      return {
        hour: typeof parsed.hour === 'number' ? parsed.hour : 0,
        minute: typeof parsed.minute === 'number' ? parsed.minute : 0,
        second: typeof parsed.second === 'number' ? parsed.second : 0,
      };
    } catch {
      return { hour: 0, minute: 0, second: 0 };
    }
  });
  const [composerLayerAnchor, setComposerLayerAnchor] = useState<Record<'hour' | 'minute' | 'second', PointerLayerAnchor>>({
    hour: { xRatio: 0.5, yRatio: 0.5 },
    minute: { xRatio: 0.5, yRatio: 0.5 },
    second: { xRatio: 0.5, yRatio: 0.5 },
  });

  // ── Iframe ref ─────────────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether user manually picked a mode so generation doesn't override it
  const userPickedModeRef = useRef(false);

  const reloadSavedAssets = useCallback(async () => {
    const [icons, fonts, hands] = await Promise.all([
      loadCustomIcons(),
      loadCustomFonts(),
      loadCustomHandStyles(),
    ]);
    setSavedIcons(icons);
    setSavedFonts(fonts);
    setSavedHands(hands);
  }, []);

  // ── Load persisted data on open ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    void reloadSavedAssets();
  }, [open, reloadSavedAssets]);

  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeLabAssetsChanged(() => {
      void reloadSavedAssets();
    });

    const handleFocus = () => {
      void reloadSavedAssets();
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        void reloadSavedAssets();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [open, reloadSavedAssets]);

  useEffect(() => {
    localStorage.setItem(POINTER_COMPOSER_DRAFT_KEY, JSON.stringify(composerDraft));
  }, [composerDraft]);

  useEffect(() => {
    localStorage.setItem(POINTER_COMPOSER_AXIS_KEY, JSON.stringify(composerAxis));
  }, [composerAxis]);

  useEffect(() => {
    if (activeTab !== 'pointers') return;
    const hasAny = !!(
      composerDraft.hourHtml.trim()
      || composerDraft.minuteHtml.trim()
      || composerDraft.secondHtml.trim()
      || composerDraft.hubHtml.trim()
    );
    if (!hasAny) return;
    const runLayerCheck = async (key: ComposerLayerKey, codeText: string) => {
      const raw = codeText.trim();
      if (!raw) {
        setLayerValidation(key, { state: 'error', message: 'Empty input' });
        setLayerPng(key, '');
        if (key !== 'hub') setLayerAnchor(key, { xRatio: 0.5, yRatio: 0.5 });
        return;
      }
      try {
        const svgLayer = extractFirstSvg(raw);
        const layerSrc = svgLayer
          ? svgToDataUrl(svgLayer)
          : await renderHtmlToDataUrl(raw, COMPOSER_PREVIEW_RASTER_SIZE);
        if (!layerSrc || !layerSrc.startsWith('data:image/')) {
          setLayerValidation(key, { state: 'error', message: 'Render failed (invalid SVG/HTML content)' });
          setLayerPng(key, '');
          if (key !== 'hub') setLayerAnchor(key, { xRatio: 0.5, yRatio: 0.5 });
          return;
        }
        setLayerValidation(key, { state: 'valid', message: svgLayer ? 'Valid SVG layer' : 'Valid HTML layer' });
        setLayerPng(key, layerSrc);
        if (key !== 'hub') {
          setLayerAnchor(key, svgLayer ? parseLayerAnchorFromSvg(svgLayer) : { xRatio: 0.5, yRatio: 0.5 });
        }
      } catch (err) {
        setLayerValidation(key, { state: 'error', message: (err as Error).message || 'Render failed' });
        setLayerPng(key, '');
        if (key !== 'hub') setLayerAnchor(key, { xRatio: 0.5, yRatio: 0.5 });
      }
    };
    const t = setTimeout(() => {
      void Promise.all([
        runLayerCheck('hour', composerDraft.hourHtml),
        runLayerCheck('minute', composerDraft.minuteHtml),
        runLayerCheck('second', composerDraft.secondHtml),
        runLayerCheck('hub', composerDraft.hubHtml),
      ]);
    }, 250);
    return () => clearTimeout(t);
  }, [activeTab, composerDraft.hourHtml, composerDraft.minuteHtml, composerDraft.secondHtml, composerDraft.hubHtml]);

  // ── Derive unique categories from saved icons ──────────────────────────────
  const categories = ['My Icons', ...Array.from(new Set(savedIcons.map(i => i.category))).filter(c => c !== 'My Icons')];

  // ── Live preview: update iframe with debounce ──────────────────────────────
  const updatePreview = useCallback((src: string, mode: CodeMode) => {
    if (!iframeRef.current) return;
    const bg = darkBg ? '#111' : '#f0f0f0';
    // Zoom scales the CONTENT, not the container — so the real proportions stay visible.
    // transform-origin: top center keeps the hand tip anchored at the top of the viewport.
    const inner =
      mode === 'svg'
        ? `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${src}</div>`
        : src;
    const body = `<div style="transform:scale(${previewZoom});transform-origin:top center;display:inline-block;">${inner}</div>`;
    iframeRef.current.srcdoc = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${bg};width:${previewSize}px;height:${previewSize}px;overflow:hidden;display:flex;align-items:center;justify-content:center;">${body}</body></html>`;
  }, [darkBg, previewSize, previewZoom]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updatePreview(code, codeMode), 300);
  }, [code, codeMode, updatePreview]);

  // ── File upload: SVG ───────────────────────────────────────────────────────
  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCodeMode('svg');
      setCode(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── AI Generate ────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!apiKey || !aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError('');
    setAiRetryStatus('');
    try {
      let result = '';
      if (aiModel === 'gpt-4o') {
        result = await generateWithOpenAI(aiPrompt, apiKey);
      } else {
        result = await generateWithGemini(aiPrompt, apiKey, (attempt, total) => {
          setAiRetryStatus(`Retrying (${attempt}/${total})…`);
        });
      }
      setAiRetryStatus('');
      // Only auto-switch mode if the response is unambiguously full HTML.
      // If the user manually chose HTML mode, keep it even when AI returns SVG.
      const trimmed = result.trim();
      const svgMatch = trimmed.match(/<svg[\s\S]*<\/svg>/i);
      const isFullHtml = /^<!doctype|^<html/i.test(trimmed);
      if (isFullHtml) {
        setCodeMode('html');
        setCode(trimmed);
      } else if (svgMatch && !userPickedModeRef.current) {
        // AI returned SVG and user hasn't manually chosen a mode — auto-set to svg
        setCodeMode('svg');
        setCode(svgMatch[0]);
      } else if (svgMatch) {
        // User manually picked a mode — just update the code, respect their choice
        setCode(svgMatch[0]);
      } else {
        // Unknown content — just set code, keep current mode
        setCode(trimmed);
      }
    } catch (err) {
      setAiRetryStatus('');
      const msg = (err as Error).message;
      if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
        setAiError('Gemini is experiencing high demand. Please try again in a few minutes.');
      } else {
        setAiError(msg);
      }
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Save API key ───────────────────────────────────────────────────────────
  const handleSaveApiKey = () => {
    localStorage.setItem('zepp-lab-api-key', apiKeyDraft);
    setApiKey(apiKeyDraft);
    setShowApiKeyInput(false);
    setApiKeyDraft('');
  };

  // ── Save icon to library ───────────────────────────────────────────────────
  const handleSaveIcon = async () => {
    if (!saveName.trim() || !code.trim()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      let dataUrl = '';
      if (codeMode === 'svg') {
        dataUrl = await renderSvgToDataUrl(code, 64);
      } else {
        // HTML mode: extract any inline SVG and render it, or use renderHtmlToDataUrl
        const { renderHtmlToDataUrl } = await import('@/lib/customIconStore');
        dataUrl = await renderHtmlToDataUrl(code, 64);
      }
      if (!dataUrl) throw new Error('Render failed — for HTML icons, paste an SVG tag for best results');
      const cat = showNewCategory && newCategoryInput.trim() ? newCategoryInput.trim() : saveCategory;
      const record = await saveCustomIcon(saveName.trim(), cat, dataUrl, 64, 64, {
        sourceMode: codeMode,
        sourceCode: code,
        sourceVersion: ICON_SOURCE_VERSION,
      });
      setSavedIcons(prev => {
        const filtered = prev.filter(i => i.key !== record.key);
        return [...filtered, record].sort((a, b) => a.createdAt - b.createdAt);
      });
      setSaveMsg('✓ Saved to library');
      publishLabAssetsChanged('icons');
      onIconsSaved?.();
    } catch (err) {
      setSaveMsg(`✗ ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };


  // ── Delete icon ────────────────────────────────────────────────────────────
  const handleDeleteIcon = async (key: string) => {
    await deleteCustomIcon(key);
    setSavedIcons(prev => prev.filter(i => i.key !== key));
    publishLabAssetsChanged('icons');
    onIconsSaved?.();
  };

  const canRoundtripEdit = (icon: CustomIconRecord): boolean => {
    return !!(icon.sourceMode && icon.sourceCode?.trim());
  };

  const handleEditIcon = (icon: CustomIconRecord) => {
    if (!canRoundtripEdit(icon)) {
      setSaveMsg('✗ Source unavailable for this legacy PNG-only icon');
      return;
    }

    setCodeMode(icon.sourceMode!);
    setCode(icon.sourceCode!);
    setSaveName(icon.name);
    setSaveCategory(icon.category);
    setShowNewCategory(false);
    setNewCategoryInput('');
    setActiveTab('icons');
    userPickedModeRef.current = true;
    setSaveMsg('✓ Loaded saved source into editor');
  };

  // ── Save as Clock Hand Style ───────────────────────────────────────────────
  const handleSaveAsHand = async () => {
    const hasComposedSources = !!(
      composerDraft.hourHtml.trim()
      && composerDraft.minuteHtml.trim()
      && composerDraft.secondHtml.trim()
      && composerDraft.hubHtml.trim()
    );
    if (!saveHandName.trim()) return;
    if (!hasComposedSources && !code.trim()) {
      setSaveHandMsg('✗ Provide hand code or all four composer layers');
      return;
    }

    setSavingHand(true);
    setSaveHandMsg('');
    try {
      const pivotOffsets = {
        hour: { x: 0, y: Math.round(composerAxis.hour * 140) },
        minute: { x: 0, y: Math.round(composerAxis.minute * 200) },
        second: { x: 0, y: Math.round(composerAxis.second * 240) },
      };
      const seedCode = hasComposedSources ? composerDraft.hourHtml : code;
      const record = await saveCustomHandStyle(
        saveHandName.trim(),
        seedCode,
        hasComposedSources
          ? {
              composedSources: {
                hourHtml: composerDraft.hourHtml,
                minuteHtml: composerDraft.minuteHtml,
                secondHtml: composerDraft.secondHtml,
                hubHtml: composerDraft.hubHtml,
              },
              pivotOffsets,
            }
          : undefined,
      );
      setSavedHands(prev => {
        const filtered = prev.filter(h => h.key !== record.key);
        return [...filtered, record].sort((a, b) => a.createdAt - b.createdAt);
      });
      setSaveHandMsg(hasComposedSources
        ? '✓ Saved composed hand set (hour/minute/second/hub + pivots)'
        : '✓ Saved — clear code editor and enter a new SVG to create another style');
      setSaveHandName('');
      if (!hasComposedSources) {
        setCode('');
      }
      publishLabAssetsChanged('hands');
      onHandsSaved?.();
    } catch (err) {
      setSaveHandMsg(`✗ ${(err as Error).message}`);
    } finally {
      setSavingHand(false);
    }
  };

  const handleAddPivotMarker = () => {
    if (!code.trim()) {
      setSaveHandMsg('✗ Add or generate SVG/HTML first');
      return;
    }

    const hasLegacyPivotCircle = /<circle[^>]*\bid\s*=\s*["']pivot["'][^>]*\bfill\s*=\s*["']#ff00ff["'][^>]*>/i.test(code);
    const hasPivotData = /\bdata-pivot-x\s*=\s*["'][^"']+["']/i.test(code)
      && /\bdata-pivot-y\s*=\s*["'][^"']+["']/i.test(code);
    if (hasLegacyPivotCircle || hasPivotData) {
      setSaveHandMsg('✓ Pivot marker already exists (skipped)');
      return;
    }

    const svgMatch = code.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      setSaveHandMsg('✗ No <svg> found in current code');
      return;
    }

    const svg = svgMatch[0];

    let cx = 11;
    let cy = 118;
    const vbMatch = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
    if (vbMatch) {
      const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
      if (parts.length >= 4 && !parts.some(Number.isNaN)) {
        const minX = parts[0];
        const minY = parts[1];
        const w = parts[2];
        const h = parts[3];
        if (w > 0 && h > 0) {
          cx = minX + w / 2;
          cy = minY + h * 0.85;
        }
      }
    }

    const patchedSvg = svg.replace(
      /<svg\b([^>]*)>/i,
      `<svg$1 data-pivot-x="${cx.toFixed(2)}" data-pivot-y="${cy.toFixed(2)}">`
    );
    const nextCode = code.replace(svg, patchedSvg);
    setCode(nextCode);
    setSaveHandMsg('✓ Pivot marker metadata added (data-pivot-x/y)');
  };

  const handleDeleteHand = async (key: string) => {
    await deleteCustomHandStyle(key);
    setSavedHands(prev => prev.filter(h => h.key !== key));
    publishLabAssetsChanged('hands');
    onHandsSaved?.();
  };

  // ── Font upload ────────────────────────────────────────────────────────────
  const handleFontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFontFile(file);
    if (!fontName) setFontName(file.name.replace(/\.[^.]+$/, ''));
    e.target.value = '';
  };

  const handleSaveFont = async () => {
    if (!pendingFontFile || !fontName.trim()) return;
    setFontSaving(true);
    setFontMsg('');
    try {
      const buffer = await pendingFontFile.arrayBuffer();
      const record = await saveCustomFont(fontName.trim(), pendingFontFile.name, buffer);
      await registerCustomFonts();
      setSavedFonts(prev => {
        const filtered = prev.filter(f => f.name !== record.name);
        return [...filtered, record].sort((a, b) => a.createdAt - b.createdAt);
      });
      setFontMsg('✓ Font loaded into studio');
      setPendingFontFile(null);
      setFontName('');
      publishLabAssetsChanged('fonts');
      onFontsSaved?.();
    } catch (err) {
      setFontMsg(`✗ ${(err as Error).message}`);
    } finally {
      setFontSaving(false);
    }
  };

  const handleDeleteFont = async (name: string) => {
    await deleteCustomFont(name);
    setSavedFonts(prev => prev.filter(f => f.name !== name));
    publishLabAssetsChanged('fonts');
    onFontsSaved?.();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const layerStatus = (value: string): 'empty' | 'ready' => (value.trim() ? 'ready' : 'empty');
  const updateComposerDraft = (patch: Partial<PointerComposerDraft>) => {
    setComposerDraft(prev => ({ ...prev, ...patch }));
  };
  const setLayerValidation = (key: ComposerLayerKey, next: ComposerLayerValidation) => {
    setComposerValidation(prev => ({ ...prev, [key]: next }));
  };
  const setLayerPng = (key: ComposerLayerKey, dataUrl: string) => {
    setComposerLayerPng(prev => ({ ...prev, [key]: dataUrl }));
  };
  const setLayerAnchor = (key: 'hour' | 'minute' | 'second', next: PointerLayerAnchor) => {
    setComposerLayerAnchor(prev => ({ ...prev, [key]: next }));
  };

  const validateLayer = async (key: ComposerLayerKey, codeText: string) => {
    const raw = codeText.trim();
    if (!raw) {
      setLayerValidation(key, { state: 'error', message: 'Empty input' });
      setLayerPng(key, '');
      if (key !== 'hub') setLayerAnchor(key, { xRatio: 0.5, yRatio: 0.5 });
      return;
    }

    try {
      const svgLayer = extractFirstSvg(raw);
      const layerSrc = svgLayer
        ? svgToDataUrl(svgLayer)
        : await renderHtmlToDataUrl(raw, COMPOSER_PREVIEW_RASTER_SIZE);
      if (!layerSrc || !layerSrc.startsWith('data:image/')) {
        setLayerValidation(key, { state: 'error', message: 'Render failed (invalid SVG/HTML content)' });
        setLayerPng(key, '');
        if (key !== 'hub') setLayerAnchor(key, { xRatio: 0.5, yRatio: 0.5 });
        return;
      }
      setLayerValidation(key, { state: 'valid', message: svgLayer ? 'Valid SVG layer' : 'Valid HTML layer' });
      setLayerPng(key, layerSrc);
      if (key !== 'hub') {
        setLayerAnchor(key, svgLayer ? parseLayerAnchorFromSvg(svgLayer) : { xRatio: 0.5, yRatio: 0.5 });
      }
    } catch (err) {
      setLayerValidation(key, { state: 'error', message: (err as Error).message || 'Render failed' });
      setLayerPng(key, '');
      if (key !== 'hub') setLayerAnchor(key, { xRatio: 0.5, yRatio: 0.5 });
    }
  };

  const validateAllComposerLayers = async () => {
    setValidatingComposer(true);
    await Promise.all([
      validateLayer('hour', composerDraft.hourHtml),
      validateLayer('minute', composerDraft.minuteHtml),
      validateLayer('second', composerDraft.secondHtml),
      validateLayer('hub', composerDraft.hubHtml),
    ]);
    setValidatingComposer(false);
  };

  const updateAxisAdjustment = (
    hand: 'hour' | 'minute' | 'second',
    value: number,
  ) => {
    setComposerAxis(prev => ({
      ...prev,
      [hand]: value,
    }));
  };

  const resetAxisAdjustment = (hand: 'hour' | 'minute' | 'second') => {
    setComposerAxis(prev => ({
      ...prev,
      [hand]: 0,
    }));
  };

  useEffect(() => {
    const canvas = composerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;

    const drawGuide = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#0f1115';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    };

    drawGuide();

    const drawRotatedLayer = (
      img: HTMLImageElement,
      deg: number,
      anchor: PointerLayerAnchor,
      axisShiftRatio = 0,
    ) => {
      const rad = (deg * Math.PI) / 180;
      // True no-resize preview: draw source at its native dimensions.
      const drawW = Math.max(1, img.width);
      const drawH = Math.max(1, img.height);
      const anchorX = drawW * anchor.xRatio;
      const anchorY = drawH * anchor.yRatio;
      const axisShift = axisShiftRatio * drawH;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      // axisShift moves artwork along the hand direction while keeping pivot fixed at center.
      ctx.drawImage(img, -anchorX, -anchorY - axisShift, drawW, drawH);
      ctx.restore();
    };

    const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    Promise.all([
      loadImage(composerLayerPng.hour),
      loadImage(composerLayerPng.minute),
      loadImage(composerLayerPng.second),
      loadImage(composerLayerPng.hub),
    ]).then(([hourImg, minuteImg, secondImg, hubImg]) => {
      drawGuide();
      // Default angles requested in spec
      // hour=2PM (60deg), minute=10PM mark (300deg), second=12AM (0deg)
      if (hourImg) drawRotatedLayer(hourImg, 60, composerLayerAnchor.hour, composerAxis.hour);
      if (minuteImg) drawRotatedLayer(minuteImg, 300, composerLayerAnchor.minute, composerAxis.minute);
      if (secondImg) drawRotatedLayer(secondImg, 0, composerLayerAnchor.second, composerAxis.second);

      if (hubImg) {
        const hubW = Math.max(1, hubImg.width);
        const hubH = Math.max(1, hubImg.height);
        ctx.drawImage(hubImg, cx - hubW / 2, cy - hubH / 2, hubW, hubH);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.02, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [composerLayerPng, composerLayerAnchor, composerAxis]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
       <div className="fixed inset-0 z-50 bg-[#111] border-b border-zinc-800 shadow-2xl"
         style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-violet-400" />
            <span className="font-semibold text-sm text-white">Studio Lab</span>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(['icons', 'pointers', 'fonts'] as TabId[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  activeTab === t
                    ? 'bg-violet-500 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t === 'icons' ? '🎨 Icons' : t === 'pointers' ? '🕒 Pointers' : '🔤 Fonts'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 text-xs transition-colors"
              title="Back to editor"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── ICONS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'icons' && (
            <div className="flex flex-col lg:flex-row h-full min-h-0" style={{ minHeight: 0 }}>

              {/* LEFT: Input + AI */}
              <div className="flex-1 p-4 space-y-3 border-r border-zinc-800 overflow-y-auto">
                {/* Mode tabs */}
                <div className="flex items-center gap-2">
                  {(['svg', 'html'] as CodeMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => { userPickedModeRef.current = true; setCodeMode(m); }}
                      className={`px-3 py-1 text-xs rounded font-mono transition-colors ${
                        codeMode === m ? 'bg-zinc-700 text-white' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                  {/* SVG file upload */}
                  <label className="ml-auto flex items-center gap-1 cursor-pointer text-xs text-white/40 hover:text-white/70 border border-white/10 rounded px-2 py-1 transition-colors hover:border-white/30">
                    <Upload className="h-3 w-3" />
                    Upload SVG
                    <input type="file" accept=".svg" className="hidden" onChange={handleSvgUpload} />
                  </label>
                </div>

                {/* Code textarea */}
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={codeMode === 'svg'
                    ? '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">\n  …\n</svg>'
                    : '<div style="…">…</div>'
                  }
                  className="w-full font-mono text-[11px] text-green-300 bg-zinc-900 border border-white/10 rounded p-2 resize-none focus:outline-none focus:border-violet-500/50 leading-relaxed"
                  style={{ minHeight: '160px' }}
                  spellCheck={false}
                />

                {/* ── AI section ─────────────────────────────────────────── */}
                <div className="border border-violet-500/20 rounded-lg p-3 space-y-2 bg-violet-500/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-violet-300 font-medium">AI Generate</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setShowApiKeyInput(v => !v); setApiKeyDraft(apiKey); }}
                        className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 border border-white/10 rounded px-2 py-0.5 transition-colors"
                      >
                        <Key className="h-3 w-3" />
                        {apiKey ? 'Change Key' : 'Set API Key'}
                      </button>
                      <button
                        onClick={() => setShowAI(v => !v)}
                        className="text-[10px] text-white/30 hover:text-white/60"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${showAI ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {showApiKeyInput && (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeyDraft}
                        onChange={e => setApiKeyDraft(e.target.value)}
                        placeholder="sk-... or AIza..."
                        className="flex-1 text-[11px] bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white/80 focus:outline-none focus:border-violet-500/50"
                      />
                      <button
                        onClick={handleSaveApiKey}
                        className="text-[11px] bg-violet-600 hover:bg-violet-500 text-white rounded px-3 py-1 transition-colors"
                      >Save</button>
                    </div>
                  )}

                  {(showAI || apiKey) && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/30 w-12">Model</span>
                        <select
                          value={aiModel}
                          onChange={e => setAiModel(e.target.value as AIModel)}
                          className="flex-1 text-[11px] bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white/70 focus:outline-none"
                        >
                          <option value="gpt-4o">GPT-4o (OpenAI)</option>
                          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        </select>
                      </div>
                      <textarea
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder="Describe the icon… e.g. 'a minimalist heart icon with a gradient from red to orange, flat style'"
                        className="w-full text-[11px] bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-white/70 resize-none focus:outline-none focus:border-violet-500/50 leading-relaxed"
                        rows={3}
                      />
                      {aiRetryStatus && <p className="text-[10px] text-yellow-400">{aiRetryStatus}</p>}
                      {aiError && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-red-400">{aiError}</p>
                          {(aiError.includes('high demand') || aiError.includes('503')) && (
                            <button
                              onClick={handleGenerate}
                              className="text-[10px] text-violet-400 hover:text-violet-300 underline"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      )}
                      <button
                        onClick={handleGenerate}
                        disabled={aiGenerating || !apiKey || !aiPrompt.trim()}
                        className="w-full flex items-center justify-center gap-2 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs rounded transition-colors font-medium"
                      >
                        {aiGenerating ? (
                          <><div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {aiRetryStatus || 'Generating…'}</>
                        ) : (
                          <><Wand2 className="h-3 w-3" /> Generate</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT: Preview + Save */}
              <div className="w-full lg:w-72 p-4 space-y-4 overflow-y-auto shrink-0">
                {/* Preview */}
                <div className="space-y-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Preview</span>
                  <div
                    className="mx-auto rounded-lg overflow-hidden border border-white/10"
                    style={{
                      width: previewSize,
                      height: previewSize,
                      background: darkBg ? '#111' : '#f0f0f0',
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      sandbox="allow-scripts"
                      style={{ width: previewSize, height: previewSize, border: 'none', display: 'block' }}
                      title="Icon preview"
                    />
                  </div>
                  {/* Zoom control — scales content, not container */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/30 w-10">Zoom</span>
                    <input type="range" min="0.1" max="4" step="0.05"
                      value={previewZoom}
                      onChange={e => setPreviewZoom(Number(e.target.value))}
                      className="flex-1 accent-violet-400 h-1" />
                    <span className="text-[9px] font-mono text-white/40 w-8 text-right">{previewZoom.toFixed(2)}×</span>
                    <button
                      onClick={() => setPreviewZoom(1.0)}
                      className="text-[9px] text-white/30 hover:text-white/60 border border-white/10 rounded px-1.5 py-0.5 transition-colors"
                      title="Reset zoom"
                    >1×</button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-white/30">BG</span>
                    <button onClick={() => setDarkBg(true)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${darkBg ? 'bg-zinc-600 text-white' : 'text-white/30 hover:text-white/60'}`}>Dark</button>
                    <button onClick={() => setDarkBg(false)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${!darkBg ? 'bg-zinc-300 text-black' : 'text-white/30 hover:text-white/60'}`}>Light</button>
                  </div>
                </div>

                {/* Save form */}
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Save to Library</span>
                  <input
                    type="text"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder="Icon name…"
                    className="w-full text-xs bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-white/80 focus:outline-none focus:border-violet-500/50"
                  />

                  {/* Category selector */}
                  {!showNewCategory ? (
                    <div className="flex gap-1.5">
                      <select
                        value={saveCategory}
                        onChange={e => setSaveCategory(e.target.value)}
                        className="flex-1 text-xs bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-white/70 focus:outline-none"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                        onClick={() => setShowNewCategory(true)}
                        className="p-1.5 border border-white/10 rounded text-white/40 hover:text-white/70 hover:border-white/30 transition-colors"
                        title="New category"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        placeholder="New category name…"
                        className="flex-1 text-xs bg-zinc-900 border border-violet-500/40 rounded px-2 py-1.5 text-white/80 focus:outline-none"
                      />
                      <button
                        onClick={() => { setShowNewCategory(false); if (newCategoryInput.trim()) setSaveCategory(newCategoryInput.trim()); }}
                        className="p-1.5 border border-white/10 rounded text-white/40 hover:text-white/70 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {saveMsg && (
                    <p className={`text-[10px] ${saveMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{saveMsg}</p>
                  )}
                  <button
                    onClick={handleSaveIcon}
                    disabled={saving || !saveName.trim() || !code.trim()}
                    className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs rounded font-medium transition-colors"
                  >
                    {saving ? 'Saving…' : '+ Add to My Library'}
                  </button>
                </div>

                {/* Save as Clock Hand Style */}
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Save as Clock Hand Style</span>

                  <div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-2">
                    <p className="text-[10px] text-cyan-300/90">Pointer composer moved to the dedicated Pointers tab for a wide workspace.</p>
                  </div>

                  {/* Design guide */}
                  <div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-2 space-y-1">
                    <p className="text-[9px] text-cyan-300/80 font-medium">SVG design guide</p>
                    <p className="text-[9px] text-white/40 leading-snug">• Tip at <strong className="text-white/60">top</strong>, pivot/axis at ~85% down</p>
                    <p className="text-[9px] text-white/40 leading-snug">• Recommended viewBox: <code className="text-cyan-400/80">0 0 22 140</code></p>
                    <p className="text-[9px] text-white/40 leading-snug">• Saved as: hour 22×140 · minute 16×200 · second 8×240</p>
                    <p className="text-[9px] text-white/40 leading-snug">• The design scales to fill each hand's height — wider parts clip to fit the narrower canvases</p>
                    <p className="text-[9px] text-white/40 leading-snug">• Hub cap uses your SVG fitted to 30×30</p>
                    <p className="text-[9px] text-white/40 leading-snug">• Add marker metadata <code className="text-cyan-400/80">data-pivot-x / data-pivot-y</code> to auto-align export pivots</p>
                    <button
                      onClick={() => { setCode('<svg viewBox="0 0 22 140" xmlns="http://www.w3.org/2000/svg">\n  <!-- Tip at top (y=0), pivot at y≈118, tail ends at y=140 -->\n  <polygon points="11,0 15,118 11,140 7,118" fill="#C0C8D8" />\n  <polygon points="11,2 14,118 11,138 8,118" fill="#E8ECF8" />\n</svg>'); setCodeMode('svg'); }}
                      className="mt-1 w-full text-[9px] text-cyan-400/70 hover:text-cyan-400 border border-cyan-500/20 rounded px-2 py-1 transition-colors"
                    >
                      Insert template SVG
                    </button>
                    <p className="text-[9px] text-white/35 leading-snug">Use this to start from a ready hand shape (22×140) instead of writing SVG from scratch.</p>
                    <button
                      onClick={handleAddPivotMarker}
                      className="w-full text-[9px] text-cyan-300/80 hover:text-cyan-300 border border-cyan-500/30 rounded px-2 py-1 transition-colors"
                    >
                      Add Pivot Marker
                    </button>
                  </div>
                  <input
                    type="text"
                    value={saveHandName}
                    onChange={e => setSaveHandName(e.target.value)}
                    placeholder="Hand style name…"
                    className="w-full text-xs bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-white/80 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    onClick={handleAddPivotMarker}
                    disabled={!code.trim()}
                    className="w-full py-1.5 bg-cyan-900/60 hover:bg-cyan-800/70 disabled:opacity-40 text-cyan-200 text-xs rounded font-medium transition-colors border border-cyan-500/30"
                  >
                    Add Pivot Marker to Current Code
                  </button>
                  {saveHandMsg && (
                    <p className={`text-[10px] ${saveHandMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{saveHandMsg}</p>
                  )}
                  <button
                    onClick={handleSaveAsHand}
                    disabled={savingHand || !saveHandName.trim() || !code.trim()}
                    className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white text-xs rounded font-medium transition-colors"
                  >
                    {savingHand ? 'Saving…' : '⌚ Save as Clock Hand'}
                  </button>
                </div>

                {/* Saved hand styles */}
                {savedHands.length > 0 && (
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Your Hand Styles ({savedHands.length})</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {savedHands.map(hand => (
                        <div key={hand.key} className="relative group">
                          <div
                            className="w-full aspect-square rounded border border-white/10 bg-zinc-800 overflow-hidden flex items-end justify-center pb-0.5"
                            title={hand.name}
                          >
                            <img
                              src={hand.hourDataUrl}
                              alt={hand.name}
                              className="w-3 h-full object-contain"
                              style={{ maxHeight: '100%' }}
                            />
                          </div>
                          <p className="text-[8px] text-white/40 text-center truncate mt-0.5">{hand.name}</p>
                          <button
                            onClick={() => handleDeleteHand(hand.key)}
                            className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-600 rounded-full text-white"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saved icons in this session */}
                {savedIcons.length > 0 && (
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Your Icons ({savedIcons.length})</span>
                    <div className="grid grid-cols-5 gap-1">
                      {savedIcons.map(icon => (
                        <div key={icon.key} className="relative group">
                          <img
                            src={icon.dataUrl}
                            alt={icon.name}
                            title={`${icon.name} (${icon.category})`}
                            className="w-10 h-10 rounded border border-white/10 bg-zinc-800 object-contain p-0.5"
                          />
                          {canRoundtripEdit(icon) ? (
                            <button
                              onClick={() => handleEditIcon(icon)}
                              className="absolute -bottom-1 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center justify-center w-4 h-4 bg-emerald-600 rounded-full text-white"
                              title="Edit source in Icon Lab"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                          ) : (
                            <span
                              className="absolute -bottom-1 left-1/2 -translate-x-1/2 hidden group-hover:block px-1 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[8px] text-amber-300 whitespace-nowrap"
                              title="Legacy PNG-only icon. Source not available for editing."
                            >
                              PNG only
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteIcon(icon.key)}
                            className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-600 rounded-full text-white"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── POINTERS TAB ───────────────────────────────────────────────── */}
          {activeTab === 'pointers' && (
            <div className="p-4 lg:p-5">
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_620px] gap-4">
                {/* Left: separated layer editors */}
                <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-cyan-300 font-medium">Pointer HTML Composer</p>
                    <button
                      onClick={validateAllComposerLayers}
                      disabled={validatingComposer}
                      className="text-[10px] px-2.5 py-1 rounded border border-cyan-500/40 bg-cyan-600/20 text-cyan-200 hover:bg-cyan-600/30 disabled:opacity-50"
                    >
                      {validatingComposer ? 'Validating…' : 'Revalidate'}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40">Paste each layer separately. Validation and preview run per-layer with no silent fallback.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/60 uppercase tracking-wide">Hour HTML</span>
                        <span className={`text-[10px] ${layerStatus(composerDraft.hourHtml) === 'ready' ? 'text-green-400' : 'text-amber-400'}`}>{layerStatus(composerDraft.hourHtml)}</span>
                      </div>
                      <textarea
                        value={composerDraft.hourHtml}
                        onChange={e => updateComposerDraft({ hourHtml: e.target.value })}
                        placeholder="<svg id='hour-hand'>...</svg>"
                        className="w-full h-40 font-mono text-[11px] text-cyan-100/90 bg-zinc-900 border border-white/10 rounded p-2 resize-none focus:outline-none focus:border-cyan-500/50"
                        spellCheck={false}
                      />
                      <p className={`text-[10px] ${composerValidation.hour.state === 'error' ? 'text-red-400' : composerValidation.hour.state === 'valid' ? 'text-green-400' : 'text-white/30'}`}>{composerValidation.hour.message}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/60 uppercase tracking-wide">Minutes HTML</span>
                        <span className={`text-[10px] ${layerStatus(composerDraft.minuteHtml) === 'ready' ? 'text-green-400' : 'text-amber-400'}`}>{layerStatus(composerDraft.minuteHtml)}</span>
                      </div>
                      <textarea
                        value={composerDraft.minuteHtml}
                        onChange={e => updateComposerDraft({ minuteHtml: e.target.value })}
                        placeholder="<svg id='minute-hand'>...</svg>"
                        className="w-full h-40 font-mono text-[11px] text-cyan-100/90 bg-zinc-900 border border-white/10 rounded p-2 resize-none focus:outline-none focus:border-cyan-500/50"
                        spellCheck={false}
                      />
                      <p className={`text-[10px] ${composerValidation.minute.state === 'error' ? 'text-red-400' : composerValidation.minute.state === 'valid' ? 'text-green-400' : 'text-white/30'}`}>{composerValidation.minute.message}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/60 uppercase tracking-wide">Seconds HTML</span>
                        <span className={`text-[10px] ${layerStatus(composerDraft.secondHtml) === 'ready' ? 'text-green-400' : 'text-amber-400'}`}>{layerStatus(composerDraft.secondHtml)}</span>
                      </div>
                      <textarea
                        value={composerDraft.secondHtml}
                        onChange={e => updateComposerDraft({ secondHtml: e.target.value })}
                        placeholder="<svg id='second-hand'>...</svg>"
                        className="w-full h-40 font-mono text-[11px] text-cyan-100/90 bg-zinc-900 border border-white/10 rounded p-2 resize-none focus:outline-none focus:border-cyan-500/50"
                        spellCheck={false}
                      />
                      <p className={`text-[10px] ${composerValidation.second.state === 'error' ? 'text-red-400' : composerValidation.second.state === 'valid' ? 'text-green-400' : 'text-white/30'}`}>{composerValidation.second.message}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/60 uppercase tracking-wide">Hub HTML</span>
                        <span className={`text-[10px] ${layerStatus(composerDraft.hubHtml) === 'ready' ? 'text-green-400' : 'text-amber-400'}`}>{layerStatus(composerDraft.hubHtml)}</span>
                      </div>
                      <textarea
                        value={composerDraft.hubHtml}
                        onChange={e => updateComposerDraft({ hubHtml: e.target.value })}
                        placeholder="<svg id='pinion-cap'>...</svg>"
                        className="w-full h-40 font-mono text-[11px] text-cyan-100/90 bg-zinc-900 border border-white/10 rounded p-2 resize-none focus:outline-none focus:border-cyan-500/50"
                        spellCheck={false}
                      />
                      <p className={`text-[10px] ${composerValidation.hub.state === 'error' ? 'text-red-400' : composerValidation.hub.state === 'valid' ? 'text-green-400' : 'text-white/30'}`}>{composerValidation.hub.message}</p>
                    </div>
                  </div>
                </div>

                {/* Right: preview + pivot + save */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/10 bg-zinc-900/80 p-3">
                    <p className="text-[10px] text-white/45 mb-2 uppercase tracking-wide">Composed Preview</p>
                    <canvas
                      ref={composerCanvasRef}
                      width={480}
                      height={480}
                      className="mx-auto w-[480px] h-[480px] max-w-full rounded border border-cyan-400/30 bg-[#0f1115]"
                    />
                    <div className="mt-2 text-[10px] text-white/35 text-center">480×480 design-space preview (same reference as background crop). Demo angles: H=2PM, M=10PM mark, S=12AM.</div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-zinc-900/80 p-3 space-y-2">
                    <p className="text-[10px] text-white/45 uppercase tracking-wide">Before/After Hub Balance (along each hand axis)</p>
                    {([
                      { key: 'hour', label: 'Hour', color: 'text-red-300' },
                      { key: 'minute', label: 'Minute', color: 'text-amber-300' },
                      { key: 'second', label: 'Second', color: 'text-green-300' },
                    ] as const).map((hand) => (
                      <div key={hand.key} className="rounded border border-white/10 p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] ${hand.color}`}>{hand.label}</span>
                          <button onClick={() => resetAxisAdjustment(hand.key)} className="text-[10px] text-white/40 hover:text-white/70 border border-white/10 rounded px-2 py-0.5">Reset</button>
                        </div>
                        <div className="grid grid-cols-[56px_1fr_46px] items-center gap-1.5">
                          <span className="text-[10px] text-white/35">Tail↔Tip</span>
                          <input
                            type="range"
                            min={-0.45}
                            max={0.45}
                            step={0.005}
                            value={composerAxis[hand.key]}
                            onChange={e => updateAxisAdjustment(hand.key, Number(e.target.value))}
                            className="h-1.5 accent-cyan-400"
                          />
                          <span className="text-[10px] text-white/45 text-right">{Math.round(composerAxis[hand.key] * 100)}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-white/35">
                          <span>- = more tail after hub</span>
                          <span>+ = more tip before hub</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2">
                    <input
                      type="text"
                      value={saveHandName}
                      onChange={e => setSaveHandName(e.target.value)}
                      placeholder="Hand style name..."
                      className="w-full text-xs bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-white/80 focus:outline-none focus:border-cyan-500/50"
                    />
                    {saveHandMsg && (
                      <p className={`text-[10px] ${saveHandMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{saveHandMsg}</p>
                    )}
                    <button
                      onClick={handleSaveAsHand}
                      disabled={savingHand || !saveHandName.trim()}
                      className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white text-xs rounded font-medium transition-colors"
                    >
                      {savingHand ? 'Saving…' : 'Save Pointer Style'}
                    </button>
                  </div>

                  {savedHands.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-zinc-900/80 p-3 space-y-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">Saved Pointer Styles ({savedHands.length})</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {savedHands.map(hand => (
                          <div key={hand.key} className="relative group">
                            <div
                              className="w-full aspect-square rounded border border-white/10 bg-zinc-800 overflow-hidden flex items-end justify-center pb-0.5"
                              title={hand.name}
                            >
                              <img
                                src={hand.hourDataUrl}
                                alt={hand.name}
                                className="w-3 h-full object-contain"
                                style={{ maxHeight: '100%' }}
                              />
                            </div>
                            <p className="text-[8px] text-white/40 text-center truncate mt-0.5">{hand.name}</p>
                            <button
                              onClick={() => handleDeleteHand(hand.key)}
                              className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-600 rounded-full text-white"
                              title="Delete pointer style"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── FONTS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'fonts' && (
            <div className="p-5 space-y-5 max-w-2xl mx-auto">
              <p className="text-xs text-white/40">
                Upload <span className="text-white/60">.woff2</span>, <span className="text-white/60">.ttf</span>, or <span className="text-white/60">.otf</span> font files.
                They will be stored permanently and available in the Font Style picker.
              </p>

              {/* Upload form */}
              <div className="space-y-3 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/30 rounded px-3 py-2 transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    {pendingFontFile ? pendingFontFile.name : 'Choose font file…'}
                    <input
                      ref={fontFileRef}
                      type="file"
                      accept=".woff2,.ttf,.otf,.woff"
                      className="hidden"
                      onChange={handleFontFileChange}
                    />
                  </label>
                </div>
                {pendingFontFile && (
                  <>
                    <input
                      type="text"
                      value={fontName}
                      onChange={e => setFontName(e.target.value)}
                      placeholder="Display name (used in Font Style picker)…"
                      className="w-full text-xs bg-zinc-900 border border-white/10 rounded px-3 py-2 text-white/80 focus:outline-none focus:border-violet-500/50"
                    />
                    {fontMsg && (
                      <p className={`text-[10px] ${fontMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{fontMsg}</p>
                    )}
                    <button
                      onClick={handleSaveFont}
                      disabled={fontSaving || !fontName.trim()}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs rounded font-medium transition-colors"
                    >
                      {fontSaving ? 'Saving…' : 'Save Font to Library'}
                    </button>
                  </>
                )}
              </div>

              {/* Saved fonts list */}
              {savedFonts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Saved Fonts ({savedFonts.length})</span>
                  <div className="space-y-1.5">
                    {savedFonts.map(font => (
                      <div key={font.name} className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg border border-white/10 group">
                        <div>
                          <p className="text-xs text-white/80" style={{ fontFamily: `"${font.name}"` }}>
                            {font.name}
                          </p>
                          <p className="text-[9px] text-white/30">{font.fileName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-white/20 font-mono" style={{ fontFamily: `"${font.name}"` }}>
                            Aa Bb 12
                          </span>
                          <button
                            onClick={() => handleDeleteFont(font.name)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
