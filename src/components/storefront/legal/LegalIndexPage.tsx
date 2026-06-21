import { Link } from 'react-router-dom';
import { LEGAL_NOTICES_CONTENT } from '@/content/legal/legal-notices';
import { LegalLayout, LEGAL_LINKS } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function LegalIndexPage() {
  return (
    <LegalLayout
      title="Legal Notices"
      description="Company information, governing law, merchant of record, and index of all legal documents."
      content={LEGAL_NOTICES_CONTENT}
    >
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#dce3ee] mb-4">Legal Document Index</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LEGAL_LINKS.filter((l) => l.to !== '/legal').map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-3 rounded-lg border border-[#1e2a3a] bg-[#0d1117] px-4 py-3 hover:border-[#3a5070] hover:bg-[#111a26] transition-colors group"
            >
              <span className="text-[#c4aa7a] text-sm">→</span>
              <span className="text-sm text-[#9ba6b8] group-hover:text-[#e9edf5] transition-colors">{l.label}</span>
            </Link>
          ))}
        </div>
      </section>
      <LegalMarkdown content={LEGAL_NOTICES_CONTENT} />
    </LegalLayout>
  );
}
