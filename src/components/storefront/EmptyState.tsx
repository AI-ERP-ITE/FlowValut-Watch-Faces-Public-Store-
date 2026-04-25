interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  showClearFilters?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({
  title = 'Coming Soon',
  subtitle = 'Curated watchfaces are being prepared.',
  showClearFilters = false,
  onClearFilters,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] w-full py-20">
      <div className="flex flex-col items-center gap-4 px-8 py-10 rounded-2xl border border-[#2d3440] bg-[#131821]/70 max-w-sm w-full text-center vault-glass">
        {/* Minimal monochrome icon */}
        <div className="w-10 h-10 rounded-full border border-[#8E9196]/45 flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8E9196"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="font-sans font-light text-2xl tracking-tight text-[#E1E4EA]">
            {title}
          </h3>
          <p className="font-mono text-sm text-[#8E9196] leading-relaxed">
            {subtitle}
          </p>
        </div>

        {showClearFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-2 px-4 py-1.5 rounded-full text-xs font-mono text-[#E8D2A8] border border-[#C7A86F]/45 hover:border-[#C7A86F] hover:bg-[#C7A86F]/10 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
