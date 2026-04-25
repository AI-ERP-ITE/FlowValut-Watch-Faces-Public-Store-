import type { SortOption } from '@/context/CatalogContext';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'latest',          label: 'Latest' },
  { value: 'most-downloaded', label: 'Most Downloaded' },
  { value: 'price-asc',       label: 'Price: Low → High' },
  { value: 'price-desc',      label: 'Price: High → Low' },
  { value: 'free-only',       label: 'Free Only' },
  { value: 'paid-only',       label: 'Paid Only' },
];

interface SortControlsProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  /** Total count to show alongside label */
  count?: number;
}

export function SortControls({ value, onChange, count }: SortControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {count !== undefined && (
        <span className="text-xs text-[#8E9196] shrink-0 font-mono">
          {count} {count === 1 ? 'result' : 'results'}
        </span>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <label htmlFor="sort-select" className="text-xs text-[#8E9196] shrink-0 font-mono uppercase tracking-wider">
          Sort by
        </label>
        <select
          id="sort-select"
          value={value}
          onChange={(e) => onChange(e.target.value as SortOption)}
          className="
            text-xs rounded-lg px-2.5 py-1.5
            vault-input focus:outline-none
            cursor-pointer transition-colors hover:bg-[#1a1f29]
          "
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
