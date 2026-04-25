import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCatalog } from '@/context/CatalogContext';
import { WatchfaceGrid } from './WatchfaceGrid';
import { EmptyState } from './EmptyState';

export function ModelPage() {
  const { slug } = useParams<{ slug: string }>();
  const { models, specGroups, getByModel, baseUrl, loading, error } = useCatalog();

  const model = slug ? models[slug] : null;
  const specGroup = model ? specGroups[model.specGroup] : null;

  const entries = useMemo(
    () => (slug ? getByModel(slug) : []),
    [slug, getByModel]
  );

  // Other models that share the same spec group
  const sibling = useMemo(() => {
    if (!model) return [];
    return Object.entries(models).filter(
      ([s, m]) => s !== slug && m.specGroup === model.specGroup
    );
  }, [models, model, slug]);

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

  if (!model) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[#8E9196]">
        <p className="font-mono text-sm">Model not found.</p>
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
            <span className="text-[#E1E4EA]">{model.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
                <p className="font-mono text-xs uppercase tracking-[0.17em] text-[#8E9196] mb-1">
                {model.brand.charAt(0).toUpperCase() + model.brand.slice(1)}
              </p>
                <h1 className="font-sans font-light text-3xl tracking-tight text-[#E1E4EA]">{model.name}</h1>
              {specGroup && (
                  <p className="font-mono text-xs text-[#8E9196] mt-2">
                  {specGroup.resolution} · {specGroup.shape} · API {specGroup.apiVersion.toUpperCase()}
                </p>
              )}
            </div>

            <div className="sm:ml-auto flex items-center gap-2">
              <span className="font-mono text-xs text-[#8E9196]">
                {entries.length} watchface{entries.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Sibling models (same spec group) */}
          {sibling.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="font-mono text-xs text-[#8E9196]">Also works on:</span>
              {sibling.map(([s, m]) => (
                <Link
                  key={s}
                  to={`/model/${s}`}
                  className="px-2.5 py-1 rounded-full text-xs font-mono border border-[#2f3743] text-[#8E9196] hover:text-[#E8D2A8] hover:border-[#C7A86F]/45 transition-colors"
                >
                  {m.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Grid or EmptyState */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        {entries.length > 0 ? (
          <WatchfaceGrid entries={entries} baseUrl={baseUrl} />
        ) : (
          <EmptyState
            subtitle={`No watchfaces for ${model.name} yet — coming soon.`}
          />
        )}
      </section>
    </div>
  );
}
