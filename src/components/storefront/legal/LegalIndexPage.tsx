import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection, LegalTodo, LEGAL_LINKS } from './LegalLayout';

export function LegalIndexPage() {
  return (
    <LegalLayout
      title="Legal Notices"
      subtitle="Company information, registered details, and index of all legal documents."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="Company Information">
        <LegalTodo id="legal.company-info" />
        {/* TODO: Legal entity name, registration number, registered address, VAT/tax ID */}
      </LegalSection>

      <LegalSection heading="Contact Information">
        <LegalTodo id="legal.contact" />
        {/* TODO: Legal contact email, Data Protection Officer contact if required by GDPR */}
      </LegalSection>

      <LegalSection heading="Governing Jurisdiction">
        <LegalTodo id="legal.jurisdiction" />
      </LegalSection>

      {/* ── Document Index ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#dce3ee] mb-4">Legal Document Index</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LEGAL_LINKS.filter(l => l.to !== '/legal').map((l) => (
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

      <LegalSection heading="Disclaimer">
        <LegalTodo id="legal.disclaimer" />
      </LegalSection>

      <LegalSection heading="Future Products and Services">
        <LegalTodo id="legal.future" />
        {/* TODO: Placeholder for AI tools, marketplace, enterprise, subscriptions notices */}
      </LegalSection>
    </LegalLayout>
  );
}
