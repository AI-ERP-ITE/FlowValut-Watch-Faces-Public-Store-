import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalLayout({ title, subtitle, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-[#6b7683]">
        <Link to="/" className="hover:text-[#c4aa7a] transition-colors">Home</Link>
        <span>/</span>
        <Link to="/legal" className="hover:text-[#c4aa7a] transition-colors">Legal</Link>
        <span>/</span>
        <span className="text-[#9ba6b8]">{title}</span>
      </nav>

      {/* Header */}
      <div className="mb-10 pb-8 border-b border-[#1e2530]">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#c4aa7a] mb-2">Legal</p>
        <h1 className="text-3xl font-semibold text-[#e9edf5]">{title}</h1>
        {subtitle && <p className="mt-3 text-[#8f9aac] text-sm">{subtitle}</p>}
        <p className="mt-4 text-xs text-[#5a6373]">Last updated: {lastUpdated}</p>
      </div>

      {/* Content */}
      <div className="prose prose-invert prose-sm max-w-none text-[#9ba6b8] space-y-6">
        {children}
      </div>

      {/* Footer nav */}
      <div className="mt-16 pt-8 border-t border-[#1e2530]">
        <p className="text-xs text-[#5a6373] mb-4">Other legal documents</p>
        <div className="flex flex-wrap gap-3 text-xs">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-[#8f9aac] hover:text-[#c4aa7a] transition-colors underline underline-offset-4">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export const LEGAL_LINKS = [
  { to: '/terms',          label: 'Terms of Service' },
  { to: '/privacy',        label: 'Privacy Policy' },
  { to: '/eula',           label: 'End User License Agreement' },
  { to: '/refunds',        label: 'Refund Policy' },
  { to: '/acceptable-use', label: 'Acceptable Use' },
  { to: '/copyright',      label: 'Copyright Policy' },
  { to: '/support',        label: 'Support Policy' },
  { to: '/cookies',        label: 'Cookie Policy' },
  { to: '/legal',          label: 'Legal Notices' },
];

/** Shared placeholder section used on every legal page */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-[#dce3ee] mb-2">{heading}</h2>
      {children}
    </section>
  );
}

/** TODO marker — will be replaced with NotebookLM-generated text */
export function LegalTodo({ id }: { id: string }) {
  return (
    <p className="rounded border border-dashed border-[#3a4655] bg-[#111820] px-4 py-3 text-xs text-[#5a7a9a] font-mono">
      {/* TODO: Insert NotebookLM-generated legal text for section "{id}" */}
      [Placeholder — legal text for <strong className="text-[#7a9fc0]">{id}</strong> will be inserted here]
    </p>
  );
}
