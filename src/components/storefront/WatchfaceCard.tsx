import { ArrowRight, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CatalogEntry } from '@/context/CatalogContext';

interface WatchfaceCardProps {
  entry: CatalogEntry;
  baseUrl: string;
}

function assetUrl(baseUrl: string, path: string): string {
  return /^(https?:)?\/\//i.test(path) || path.startsWith('/') ? path : `${baseUrl}${path}`;
}

export function WatchfaceCard({ entry, baseUrl }: WatchfaceCardProps) {
  const previewSrc = assetUrl(baseUrl, entry.previewPath);
  const isFree = entry.price === 0;

  return (
    <Link to={`/face/${entry.id}`} className="maison-catalog-card">
      <div className="maison-catalog-media">
        <img
          src={previewSrc}
          alt={`${entry.name} digital timepiece`}
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
        <div className="maison-image-fallback" />
        {entry.categories[0] && <span>{entry.categories[0]}</span>}
      </div>
      <div className="maison-catalog-copy">
        <div>
          <h3>{entry.name}</h3>
          <p>{isFree ? 'Complimentary' : `$${entry.price.toFixed(2)}`}</p>
        </div>
        <div className="maison-catalog-meta">
          {entry.downloads > 0 ? <span><Download size={11} /> {entry.downloads.toLocaleString()}</span> : <span />}
          <span>View Details <ArrowRight size={14} /></span>
        </div>
      </div>
    </Link>
  );
}
