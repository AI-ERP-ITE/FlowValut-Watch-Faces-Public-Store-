import { useState } from 'react';
import { WatchfaceCard } from './WatchfaceCard';
import type { CatalogEntry } from '@/context/CatalogContext';

const PAGE_SIZE = 24;

interface WatchfaceGridProps {
  entries: CatalogEntry[];
  baseUrl: string;
}

export function WatchfaceGrid({
  entries,
  baseUrl,
}: WatchfaceGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  return (
    <div className="space-y-8">
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {visible.map((entry) => (
          <WatchfaceCard key={entry.id} entry={entry} baseUrl={baseUrl} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="px-6 py-2.5 text-xs font-mono rounded-xl bg-[#141820] border border-[#2f3743] text-[#8E9196] hover:border-[#C7A86F]/45 hover:text-[#E7D0A6] transition-colors"
          >
            Load more ({entries.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Total count */}
      <p className="text-center text-xs font-mono text-[#8E9196]/70">
        Showing {Math.min(visibleCount, entries.length)} of {entries.length} watchfaces
      </p>
    </div>
  );
}
