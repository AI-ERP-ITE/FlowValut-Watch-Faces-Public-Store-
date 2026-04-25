import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCatalog } from '@/context/CatalogContext';
import { WatchfaceGrid } from './WatchfaceGrid';
import { EmptyState } from './EmptyState';

const CATEGORY_META: Record<string, { label: string; description: string; emoji: string }> = {
  minimal:  { label: 'Minimal',  emoji: '◻', description: 'Clean, distraction-free faces that put data first.' },
  sporty:   { label: 'Sporty',   emoji: '⚡', description: 'Built for athletes — health metrics front and center.' },
  elegant:  { label: 'Elegant',  emoji: '✦', description: 'Refined designs inspired by classic watchmaking.' },
  digital:  { label: 'Digital',  emoji: '▦', description: 'Bold numerals and high-contrast readouts.' },
  analog:   { label: 'Analog',   emoji: '◷', description: 'Classic hand-based designs reimagined for smart displays.' },
  funny:    { label: 'Funny',    emoji: '★', description: 'Playful, personality-packed faces for every mood.' },
  premium:  { label: 'Premium',  emoji: '◈', description: 'Our best paid watchfaces — hand-crafted and polished.' },
  simple:   { label: 'Simple',   emoji: '○', description: 'Lightweight faces with just the essentials.' },
};

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getByCategory, baseUrl, loading, error } = useCatalog();

  const meta = slug ? (CATEGORY_META[slug] ?? { label: slug, emoji: '⌚', description: '' }) : null;

  const entries = useMemo(
    () => (slug ? getByCategory(slug) : []),
    [slug, getByCategory]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-[#8E9196] text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 font-mono text-sm">
        {error}
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[#8E9196]">
        <p className="font-mono text-sm">Category not found.</p>
        <Link to="/" className="text-xs font-mono underline underline-offset-4 hover:text-[#D9DBE0]">
          Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen vault-shell">
      {/* Header band */}
      <section className="vault-page-hero border-b border-[#20252f] py-10 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-xs font-mono text-[#8E9196] mb-4 flex items-center gap-1.5">
            <Link to="/" className="hover:text-[#E1E4EA] transition-colors">Browse</Link>
            <span>/</span>
            <span className="text-[#E1E4EA]">{meta.label}</span>
          </nav>

          <div className="flex items-end gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl text-[#8E9196]">{meta.emoji}</span>
                <h1 className="font-sans font-light text-3xl tracking-tight text-[#E1E4EA]">{meta.label}</h1>
              </div>
              {meta.description && (
                <p className="font-mono text-sm text-[#8E9196] max-w-md">{meta.description}</p>
              )}
            </div>
            <div className="ml-auto">
              <span className="font-mono text-xs text-[#8E9196]">
                {entries.length} watchface{entries.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Other categories */}
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(CATEGORY_META)
              .filter(([s]) => s !== slug)
              .map(([s, m]) => (
                <Link
                  key={s}
                  to={`/category/${s}`}
                  className="px-2.5 py-1 rounded-full text-xs font-mono border border-[#2f3743] text-[#8E9196] hover:text-[#E8D2A8] hover:border-[#C7A86F]/45 transition-colors"
                >
                  {m.emoji} {m.label}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Grid or EmptyState */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        {entries.length > 0 ? (
          <WatchfaceGrid entries={entries} baseUrl={baseUrl} />
        ) : (
          <EmptyState
            subtitle={`No ${meta.label.toLowerCase()} watchfaces yet — coming soon.`}
          />
        )}
      </section>
    </div>
  );
}
