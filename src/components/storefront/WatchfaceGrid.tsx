import { useState } from 'react';
import { WatchfaceCard } from './WatchfaceCard';
import type { CatalogEntry } from '@/context/CatalogContext';

const PAGE_SIZE = 24;

interface WatchfaceGridProps {
  entries: CatalogEntry[];
  baseUrl: string;
}

export function WatchfaceGrid({ entries, baseUrl }: WatchfaceGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  return (
    <div className="maison-catalog-grid-wrap">
      <div className="maison-catalog-grid">
        {visible.map((entry) => <WatchfaceCard key={entry.id} entry={entry} baseUrl={baseUrl} />)}
      </div>
      {hasMore && (
        <div className="maison-load-more">
          <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Discover More <span>{entries.length - visibleCount} remaining</span>
          </button>
        </div>
      )}
      <p className="maison-result-count">Showing {Math.min(visibleCount, entries.length)} of {entries.length} timepieces</p>
    </div>
  );
}
