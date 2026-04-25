import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import type { CatalogEntry } from '@/context/CatalogContext';

interface WatchfaceCardProps {
  entry: CatalogEntry;
  baseUrl: string;
}

export function WatchfaceCard({ entry, baseUrl }: WatchfaceCardProps) {
  const previewSrc = `${baseUrl}${entry.previewPath}`;
  const isFree = entry.price === 0;

  return (
    <Link
      to={`/face/${entry.id}`}
      className="group relative flex flex-col rounded-[1.4rem] overflow-hidden bg-[#121418] border border-[#2c323d] hover:border-[#c7a86f]/45 transition-all duration-200 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-0.5"
    >
      {/* Preview image */}
      <div className="relative aspect-square bg-[#1a1f29] overflow-hidden">
        <img
          src={previewSrc}
          alt={entry.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Fallback placeholder if image not loaded
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Fallback icon when image missing */}
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1f29] -z-10">
          <div className="w-16 h-16 rounded-full border-2 border-[#465064] flex items-center justify-center">
            <span className="text-[#7f8794] text-2xl">⌚</span>
          </div>
        </div>

        {/* Price badge — top right */}
        <div className="absolute top-2.5 right-2.5">
          {isFree ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
              FREE
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#c7a86f]/20 text-[#edd9b5] border border-[#c7a86f]/45 backdrop-blur-sm">
              ${entry.price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Download count — bottom left */}
        {entry.downloads > 0 && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-[#98a0ac] bg-black/50 backdrop-blur-sm border border-[#3a4351]/70">
              <Download size={10} />
              {entry.downloads >= 1000
                ? `${(entry.downloads / 1000).toFixed(1)}k`
                : entry.downloads}
            </span>
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#e1e4ea] truncate group-hover:text-white transition-colors">
            {entry.name}
          </p>
          {entry.categories.length > 0 && (
            <p className="text-xs text-[#8f96a3] truncate mt-0.5 capitalize">
              {entry.categories[0]}
            </p>
          )}
        </div>

        {/* Hover action indicator */}
        <div className="shrink-0 w-7 h-7 rounded-full bg-[#1a1f29] border border-[#3a4452] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[#d9bf90] text-xs">→</span>
        </div>
      </div>
    </Link>
  );
}
