import { useParams, Link } from 'react-router-dom';
import { useCatalog } from '@/context/CatalogContext';
import { ExternalLink } from 'lucide-react';

export function BuyPage() {
  const { id } = useParams<{ id: string }>();
  const { getById, baseUrl, loading, error } = useCatalog();

  const entry = id ? getById(id) : null;

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

  if (!entry || !entry.stripeLink) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[#8E9196]">
        <span className="text-5xl">⌚</span>
        <p className="text-sm">Watchface not found or not available for purchase.</p>
        <Link to="/" className="text-xs underline underline-offset-4 hover:text-zinc-200">
          Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen vault-shell flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo / brand */}
        <div className="text-center space-y-1">
          <p className="text-xs text-[#8E9196] uppercase tracking-widest font-mono">
            Flowvault
          </p>
          <h1 className="text-2xl font-light text-[#E1E4EA] tracking-tight">
            Complete Your Purchase
          </h1>
        </div>

        {/* Preview card */}
        <div className="rounded-2xl border border-[#2f3743] bg-[#121418] overflow-hidden">
          {entry.previewPath && (
            <div className="aspect-square w-full overflow-hidden bg-[#1a1f29]">
              <img
                src={`${baseUrl}${entry.previewPath}`}
                alt={entry.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[#E1E4EA] font-medium text-sm">{entry.name}</p>
              <p className="text-[#8E9196] text-xs mt-0.5 capitalize">
                {entry.categories.join(' · ')}
              </p>
            </div>
            <span className="text-[#E8D2A8] font-bold text-lg">
              ${entry.price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* CTA */}
        <a
          href={entry.stripeLink}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#bc9456] text-[#17120a] font-semibold text-sm hover:bg-[#d2af78] transition-colors"
        >
          Continue to Checkout
          <ExternalLink className="h-4 w-4" />
        </a>

        {/* Back link */}
        <p className="text-center text-[#8E9196] text-xs">
          Changed your mind?{' '}
          <Link
            to={`/face/${entry.id}`}
            className="underline underline-offset-4 hover:text-[#E1E4EA] transition-colors"
          >
            Go back
          </Link>
        </p>
      </div>
    </div>
  );
}
