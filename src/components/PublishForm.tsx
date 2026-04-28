import { useState, useEffect, useMemo } from 'react';
import type { WatchFaceConfig } from '@/types';
import type { CatalogEntry, SpecGroup } from '@/context/CatalogContext';
import { uniqueSlug } from '@/lib/slugify';
import { detectSpecGroup, describeSpecGroup } from '@/lib/specGroupDetector';
import { fetchCatalogFromFirebase, publishStudioWatchfaceToFirebase } from '@/lib/studioFirebasePublishApi';

// ── Category options (must stay in sync with CategoryPage CATEGORY_META) ──

const CATEGORIES = [
  { value: 'minimal',  label: 'Minimal'  },
  { value: 'sporty',   label: 'Sporty'   },
  { value: 'elegant',  label: 'Elegant'  },
  { value: 'digital',  label: 'Digital'  },
  { value: 'analog',   label: 'Analog'   },
  { value: 'funny',    label: 'Funny'    },
  { value: 'premium',  label: 'Premium'  },
  { value: 'simple',   label: 'Simple'   },
];

// ── Props ──────────────────────────────────────────────────────────────────

export interface PublishFormProps {
  /** The fully-built WatchFaceConfig from the studio */
  watchFaceConfig: WatchFaceConfig;
  /** The folder ID already uploaded to docs/zpk/{watchfaceId}/ */
  watchfaceId: string;
  /** Called on successful publish with the final CatalogEntry */
  onPublished: (entry: CatalogEntry) => void;
  /** Called when the user clicks Cancel */
  onCancel: () => void;
  /** Detected API version from the generator context */
  apiVersion?: 'v2' | 'v3';
  /** All spec groups (from docs/specGroups.json) */
  specGroups?: Record<string, SpecGroup>;
}

// ── Component ──────────────────────────────────────────────────────────────

export function PublishForm({
  watchFaceConfig,
  watchfaceId,
  onPublished,
  onCancel,
  apiVersion = 'v3',
  specGroups = {},
}: PublishFormProps) {
  // ── Form field state ────────────────────────────────────────────────────
  const [name, setName]               = useState(watchFaceConfig.name ?? '');
  const [isPaid, setIsPaid]           = useState(false);
  const [price, setPrice]             = useState('');
  const [stripeLink, setStripeLink]   = useState('');
  const [categories, setCategories]   = useState<string[]>([]);
  const [hashtagsRaw, setHashtagsRaw] = useState('');

  // ── Async state ─────────────────────────────────────────────────────────
  const [existingIds, setExistingIds]   = useState<string[]>([]);
  const [publishing, setPublishing]     = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ── Derived / computed values ───────────────────────────────────────────

  // Slug preview for user visibility only.
  const slug = useMemo(
    () => (name.trim() ? uniqueSlug(name.trim(), existingIds) : ''),
    [name, existingIds]
  );

  // specGroup detection from canvas resolution + apiVersion
  const detectedSpecGroupKey = useMemo(() => {
    const { width, height } = watchFaceConfig.resolution;
    return detectSpecGroup(width, height, apiVersion, specGroups);
  }, [watchFaceConfig.resolution, apiVersion, specGroups]);

  const detectedSpecGroupLabel = useMemo(() => {
    if (!detectedSpecGroupKey) return null;
    const sg = specGroups[detectedSpecGroupKey];
    return sg ? describeSpecGroup(detectedSpecGroupKey, sg) : detectedSpecGroupKey;
  }, [detectedSpecGroupKey, specGroups]);

  // Compatible model names (reverse lookup: specGroup → model names)
  const compatibleModels = useMemo(() => {
    // specGroups.json doesn't have model names — they're in models.json via CatalogContext.
    // We expose them via the watchFaceConfig.watchModel field and the specGroup key.
    // For a lightweight display: just show the watchModel from config + spec group label.
    const models: string[] = [];
    if (watchFaceConfig.watchModel) models.push(watchFaceConfig.watchModel);
    return models;
  }, [watchFaceConfig.watchModel]);

  // Parsed hashtags (comma or newline separated, lowercased, no #)
  const hashtags = useMemo(() => {
    return hashtagsRaw
      .split(/[,\n]+/)
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);
  }, [hashtagsRaw]);

  // ── Load existing catalog IDs for collision detection ───────────────────
  useEffect(() => {
    fetchCatalogFromFirebase()
      .then((entries) => setExistingIds(entries.map((e) => e.id)))
      .catch(() => setExistingIds([]));
  }, []);

  // ── Category toggle ─────────────────────────────────────────────────────
  function toggleCategory(value: string) {
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  // ── Publish handler ─────────────────────────────────────────────────────
  async function handlePublish() {
    if (!name.trim()) { setPublishError('Name is required.'); return; }
    if (isPaid && !stripeLink.trim()) {
      setPublishError('Stripe link is required for paid watchfaces.');
      return;
    }
    if (isPaid && isNaN(parseFloat(price))) {
      setPublishError('Enter a valid price (e.g. 1.99).');
      return;
    }
    if (categories.length === 0) {
      setPublishError('Select at least one category.');
      return;
    }

    setPublishing(true);
    setPublishError(null);

    const entry: CatalogEntry = {
      id:          watchfaceId,
      name:        name.trim(),
      specGroup:   detectedSpecGroupKey ?? 'unknown',
      categories,
      hashtags,
      basePrice:   isPaid ? parseFloat(price) : 0,
      discountPercent: 0,
      price:       isPaid ? parseFloat(price) : 0,
      stripeLink:  isPaid ? stripeLink.trim() : null,
      createdAt:   new Date().toISOString(),
      downloads:   0,
      zpkPath:     `zpk/${watchfaceId}.zpk`,
      previewPath: `preview/${watchfaceId}.png`,
      qrPath:      `qr/${watchfaceId}.png`,
    };

    try {
      await publishStudioWatchfaceToFirebase({
        id: entry.id,
        name: entry.name,
        specGroup: entry.specGroup,
        categories: entry.categories,
        hashtags: entry.hashtags,
        basePrice: entry.basePrice ?? entry.price,
        discountPercent: entry.discountPercent ?? 0,
        price: entry.price,
        stripeLink: entry.stripeLink,
      });
      onPublished(entry);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-6 max-w-lg w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">Publish to Store</h2>
        <button
          onClick={onCancel}
          className="text-zinc-500 hover:text-zinc-300 text-sm"
          disabled={publishing}
        >
          Cancel
        </button>
      </div>

      {/* ── Name ── */}
      <div className="space-y-1">
        <label className="text-zinc-400 text-xs uppercase tracking-wider">
          Watchface Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gothic Dark"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          disabled={publishing}
        />
        {slug && (
          <p className="text-zinc-600 text-xs">
            Slug:{' '}
            <span className="text-zinc-400 font-mono">{slug}</span>
          </p>
        )}
      </div>

      {/* ── Spec group info ── */}
      <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 space-y-1">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Auto-detected</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>
            <span className="text-zinc-500">Spec group: </span>
            <span className="text-zinc-200 font-mono text-xs">
              {detectedSpecGroupKey ?? <span className="text-yellow-500">unknown</span>}
            </span>
          </span>
          {detectedSpecGroupLabel && (
            <span className="text-zinc-500 text-xs">{detectedSpecGroupLabel}</span>
          )}
          {compatibleModels.length > 0 && (
            <span>
              <span className="text-zinc-500">Model: </span>
              <span className="text-zinc-300 text-xs">{compatibleModels.join(', ')}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Price ── */}
      <div className="space-y-2">
        <label className="text-zinc-400 text-xs uppercase tracking-wider">Price</label>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPaid(false)}
            className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${
              !isPaid
                ? 'bg-zinc-700 border-zinc-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
            disabled={publishing}
          >
            Free
          </button>
          <button
            onClick={() => setIsPaid(true)}
            className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${
              isPaid
                ? 'bg-zinc-700 border-zinc-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
            disabled={publishing}
          >
            Paid
          </button>
        </div>

        {isPaid && (
          <div className="space-y-2 pt-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                $
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1.99"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                disabled={publishing}
              />
            </div>
            <input
              type="url"
              value={stripeLink}
              onChange={(e) => setStripeLink(e.target.value)}
              placeholder="https://buy.stripe.com/..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              disabled={publishing}
            />
          </div>
        )}
      </div>

      {/* ── Categories ── */}
      <div className="space-y-2">
        <label className="text-zinc-400 text-xs uppercase tracking-wider">
          Categories <span className="text-zinc-600 normal-case">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleCategory(value)}
              className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                categories.includes(value)
                  ? 'bg-white text-zinc-900 border-white'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
              disabled={publishing}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hashtags ── */}
      <div className="space-y-1">
        <label className="text-zinc-400 text-xs uppercase tracking-wider">
          Hashtags{' '}
          <span className="text-zinc-600 normal-case">(comma or newline separated)</span>
        </label>
        <textarea
          value={hashtagsRaw}
          onChange={(e) => setHashtagsRaw(e.target.value)}
          placeholder="dark, space, stars, amoled"
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
          disabled={publishing}
        />
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {publishError && (
        <p className="text-red-400 text-sm border border-red-800 bg-red-950/40 rounded-lg px-3 py-2">
          {publishError}
        </p>
      )}

      {/* ── Submit ── */}
      <button
        onClick={handlePublish}
        disabled={publishing || !name.trim()}
        className="w-full py-3 rounded-lg bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {publishing ? 'Publishing…' : 'Publish to Store'}
      </button>
    </div>
  );
}
