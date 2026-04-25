import { useMemo } from 'react';
import { useCatalog, type FilterState } from '@/context/CatalogContext';
import { X } from 'lucide-react';

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (updated: Partial<FilterState>) => void;
}

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const { models } = useCatalog();

  // Unique brands from models
  const brands = useMemo(
    () => Array.from(new Set(Object.values(models).map((m) => m.brand))).sort(),
    [models]
  );

  // Models filtered by selected brand
  const filteredModels = useMemo(() => {
    const entries = Object.entries(models);
    if (filters.brand) {
      return entries.filter(([, m]) => m.brand === filters.brand);
    }
    return entries;
  }, [models, filters.brand]);

  const hasActiveFilters =
    filters.brand !== null ||
    filters.modelSlug !== null ||
    filters.priceFilter !== 'all';

  function clearAll() {
    onChange({ brand: null, modelSlug: null, priceFilter: 'all' });
  }

  return (
    <aside className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#8E9196]">
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs font-mono text-[#C7A86F] hover:text-[#E8D2A8] transition-colors"
          >
            <X size={11} />
            Clear
          </button>
        )}
      </div>

      {/* Brand */}
      <FilterSection label="Brand">
        <div className="flex flex-wrap gap-1.5">
          {brands.map((brand) => (
            <FilterChip
              key={brand}
              label={capitalize(brand)}
              active={filters.brand === brand}
              onClick={() =>
                onChange({
                  brand: filters.brand === brand ? null : brand,
                  modelSlug: null, // reset model when brand changes
                })
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Model */}
      <FilterSection label="Watch Model">
        <div className="flex flex-col gap-1">
          {filteredModels.map(([slug, model]) => (
            <button
              key={slug}
              onClick={() =>
                onChange({ modelSlug: filters.modelSlug === slug ? null : slug })
              }
              className={`
                text-left px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors
                ${filters.modelSlug === slug
                  ? 'text-[#E8D2A8] border-l-2 border-[#C7A86F] pl-2'
                  : 'text-[#8E9196] hover:text-[#D9DBE0]'
                }
              `}
            >
              {model.name}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price */}
      <FilterSection label="Price">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'free', 'paid'] as const).map((option) => (
            <FilterChip
              key={option}
              label={capitalize(option)}
              active={filters.priceFilter === option}
              onClick={() => onChange({ priceFilter: option })}
            />
          ))}
        </div>
      </FilterSection>
    </aside>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 bg-[#131821] rounded-xl p-4 border border-[#2d3440]">
      <p className="font-mono text-xs uppercase tracking-widest text-[#8E9196]">
        {label}
      </p>
      {children}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1 rounded-lg text-xs font-mono transition-colors
        ${active
          ? 'text-[#E8D2A8] border border-[#C7A86F]/60 bg-[#C7A86F]/10'
          : 'text-[#8E9196] border border-[#2f3743] hover:border-[#C7A86F]/30 hover:text-[#C7A86F]'
        }
      `}
    >
      {label}
    </button>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
