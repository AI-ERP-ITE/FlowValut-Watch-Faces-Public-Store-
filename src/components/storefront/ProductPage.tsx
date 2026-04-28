import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '@/context/CatalogContext';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, models, specGroups, baseUrl, loading, error } = useCatalog();

  const entry = id ? getById(id) : null;

  // All models compatible with this watchface (same spec group)
  const compatibleModels = useMemo(() => {
    if (!entry) return [];
    return Object.entries(models).filter(([, m]) => m.specGroup === entry.specGroup);
  }, [entry, models]);

  const specGroup = entry ? specGroups[entry.specGroup] : null;

  const isFree = !entry || entry.price === 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8E9196] text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[#8E9196]">
        <span className="text-5xl">⌚</span>
        <p className="text-sm">Watchface not found.</p>
        <Link to="/" className="text-xs underline underline-offset-4 hover:text-zinc-200">
          Back to Browse
        </Link>
      </div>
    );
  }

  function handleAction() {
    // Unified backend-authoritative flow starts in buy page for free and paid.
    navigate(`/buy/${entry!.id}`);
  }

  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen vault-shell">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-[#8E9196] mb-6 flex items-center gap-1.5 font-mono">
          <Link to="/" className="hover:text-[#E1E4EA] transition-colors">Browse</Link>
          <span>/</span>
          {entry.categories[0] && (
            <>
              <Link
                to={`/category/${entry.categories[0]}`}
                className="hover:text-[#E1E4EA] transition-colors capitalize"
              >
                {entry.categories[0]}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-[#E1E4EA]">{entry.name}</span>
        </nav>

        {/* Main layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

          {/* ── Left: Preview ───────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Main preview */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-[#121418] border border-[#2f3743] flex items-center justify-center">
              {entry.previewPath ? (
                <img
                  src={`${baseUrl}${entry.previewPath}`}
                  alt={`${entry.name} preview`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-6xl text-[#6e7786]">⌚</span>
              )}
            </div>

            {/* QR code */}
            {entry.qrPath && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#121418] border border-[#2f3743]">
                <p className="text-xs text-[#8E9196]">Scan on your phone to install</p>
                <img
                  src={`${baseUrl}${entry.qrPath}`}
                  alt="Install QR code"
                  className="w-28 h-28 rounded-lg bg-white p-1"
                />
              </div>
            )}
          </div>

          {/* ── Right: Info ──────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Name + price */}
            <div>
              <h1 className="text-3xl font-light text-[#E1E4EA] leading-tight">{entry.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                {isFree ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    FREE
                  </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#C7A86F]/15 text-[#E8D2A8] border border-[#C7A86F]/45">
                    ${entry.price.toFixed(2)}
                  </span>
                )}
                <span className="text-xs text-[#8E9196]">
                  {entry.downloads.toLocaleString()} download{entry.downloads !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* CTA button */}
            <button
              onClick={handleAction}
              className={`
                w-full py-3 rounded-xl font-semibold text-sm transition-all
                ${isFree
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-[#bc9456] hover:bg-[#d2af78] text-[#17120a] shadow-lg shadow-[#c7a86f]/30'
                }
              `}
            >
              {isFree ? 'Get for Free' : `Buy for $${entry.price.toFixed(2)}`}
            </button>

            {/* Compatible models */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-[#8E9196] mb-2">
                Compatible Watches
              </p>
              <div className="flex flex-wrap gap-1.5">
                {compatibleModels.map(([slug, model]) => (
                  <Link
                    key={slug}
                    to={`/model/${slug}`}
                    className="px-2.5 py-1 rounded-full text-xs bg-[#121418] border border-[#2f3743] text-[#8E9196] hover:text-[#E8D2A8] hover:border-[#C7A86F]/45 transition-colors"
                  >
                    {model.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Spec info */}
            {specGroup && (
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#8E9196] mb-2">
                  Specs
                </p>
                <div className="flex gap-2 flex-wrap">
                  <SpecBadge label={specGroup.resolution} />
                  <SpecBadge label={specGroup.shape} />
                  <SpecBadge label={`API ${specGroup.apiVersion.toUpperCase()}`} />
                </div>
              </div>
            )}

            {/* Hashtags */}
            {entry.hashtags.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#8E9196] mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.hashtags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/search?q=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-1 rounded-full text-xs bg-[#121418] border border-[#2f3743] text-[#8E9196] hover:text-[#E8D2A8] hover:border-[#C7A86F]/45 transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {entry.categories.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#8E9196] mb-2">
                  Categories
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.categories.map((cat) => (
                    <Link
                      key={cat}
                      to={`/category/${cat}`}
                      className="px-2.5 py-1 rounded-full text-xs bg-[#121418] border border-[#2f3743] text-[#8E9196] hover:text-[#E8D2A8] hover:border-[#C7A86F]/45 transition-colors capitalize"
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <p className="text-xs text-[#7f8794]">Added {formattedDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecBadge({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 rounded-md text-xs bg-[#121418] border border-[#2f3743] text-[#a2a9b5] capitalize">
      {label}
    </span>
  );
}
