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
import { X, FlaskConical, Upload, Key, Wand2, Plus, Trash2, ChevronDown } from 'lucide-react';
import {
  saveCustomIcon,
  deleteCustomIcon,
  loadCustomIcons,
  renderSvgToDataUrl,
  type CustomIconRecord,
} from '@/lib/customIconStore';
import {
  saveCustomFont,
  deleteCustomFont,
  loadCustomFonts,
  registerCustomFonts,
  type CustomFontRecord,
} from '@/lib/customFontStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type CodeMode = 'svg' | 'html';
type AIModel = 'gpt-4o' | 'gemini-2.5-flash';
type TabId = 'icons' | 'fonts';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a new icon is saved so the picker can refresh. */
  onIconsSaved?: () => void;
  /** Called after a new font is saved so the font picker can refresh. */
  onFontsSaved?: () => void;
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

export function IconLab({ open, onClose, onIconsSaved, onFontsSaved }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('icons');

  // ── Icon Lab state ─────────────────────────────────────────────────────────
  const [codeMode, setCodeMode] = useState<CodeMode>('svg');
  const [code, setCode] = useState('');
  const [previewSize, setPreviewSize] = useState(128);
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

  // ── Iframe ref ─────────────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load persisted data on open ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    loadCustomIcons().then(setSavedIcons);
    loadCustomFonts().then(setSavedFonts);
  }, [open]);

  // ── Derive unique categories from saved icons ──────────────────────────────
  const categories = ['My Icons', ...Array.from(new Set(savedIcons.map(i => i.category))).filter(c => c !== 'My Icons')];

  // ── Live preview: update iframe with debounce ──────────────────────────────
  const updatePreview = useCallback((src: string, mode: CodeMode) => {
    if (!iframeRef.current) return;
    const bg = darkBg ? '#111' : '#f0f0f0';
    const body =
      mode === 'svg'
        ? `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${src}</div>`
        : src;
    iframeRef.current.srcdoc = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${bg};width:${previewSize}px;height:${previewSize}px;overflow:hidden;">${body}</body></html>`;
  }, [darkBg, previewSize]);

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
      // Detect whether the response is SVG or full HTML and set mode accordingly
      const trimmed = result.trim();
      const svgMatch = trimmed.match(/<svg[\s\S]*<\/svg>/i);
      const isFullHtml = /^<!doctype|^<html/i.test(trimmed);
      if (svgMatch) {
        setCodeMode('svg');
        setCode(svgMatch[0]);
      } else if (isFullHtml) {
        setCodeMode('html');
        setCode(trimmed);
      } else {
        // Fallback: treat as SVG (AI may have omitted wrapper)
        setCodeMode('svg');
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
      const record = await saveCustomIcon(saveName.trim(), cat, dataUrl, 64, 64);
      setSavedIcons(prev => {
        const filtered = prev.filter(i => i.key !== record.key);
        return [...filtered, record].sort((a, b) => a.createdAt - b.createdAt);
      });
      setSaveMsg('✓ Saved to library');
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
    onIconsSaved?.();
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
    onFontsSaved?.();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#111] border-b border-zinc-800 shadow-2xl"
           style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-violet-400" />
            <span className="font-semibold text-sm text-white">Studio Lab</span>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(['icons', 'fonts'] as TabId[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  activeTab === t
                    ? 'bg-violet-500 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t === 'icons' ? '🎨 Icons' : '🔤 Fonts'}
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
                      onClick={() => setCodeMode(m)}
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
                    className="mx-auto rounded-lg overflow-hidden border border-white/10 flex items-center justify-center"
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
                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/30 w-8">Size</span>
                    <input type="range" min="32" max="256" step="8"
                      value={previewSize}
                      onChange={e => setPreviewSize(Number(e.target.value))}
                      className="flex-1 accent-violet-400 h-1" />
                    <span className="text-[9px] font-mono text-white/40 w-8 text-right">{previewSize}px</span>
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
