interface LegalVersionBadgeProps {
  version: string;
  effectiveDate: string;
  lastUpdated?: string;
}

export function LegalVersionBadge({ version, effectiveDate, lastUpdated }: LegalVersionBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="inline-flex items-center rounded-full border border-[#2a3545] bg-[#0d1117] px-2.5 py-0.5 text-[10px] font-mono text-[#5a7a9a]">
        v{version}
      </span>
      <span className="text-[11px] text-[#4a5870]">
        Effective {effectiveDate}
        {lastUpdated && lastUpdated !== effectiveDate && ` · Updated ${lastUpdated}`}
      </span>
    </div>
  );
}
