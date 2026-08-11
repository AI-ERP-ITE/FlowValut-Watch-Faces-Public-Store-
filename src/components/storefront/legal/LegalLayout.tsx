import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LegalTableOfContents } from './LegalTableOfContents';
import { LegalMetaTags } from './LegalMetaTags';
import { LegalVersionBadge } from './LegalVersionBadge';

export const LEGAL_LINKS = [
  { to: '/terms',          label: 'Terms of Service' },
  { to: '/privacy',        label: 'Privacy Policy' },
  { to: '/cookies',        label: 'Cookie Policy' },
  { to: '/eula',           label: 'EULA' },
  { to: '/refunds',        label: 'Refund Policy' },
  { to: '/acceptable-use', label: 'Acceptable Use' },
  { to: '/copyright',      label: 'Copyright Policy' },
  { to: '/support',        label: 'Support Policy' },
  { to: '/legal',          label: 'Legal Notices' },
];

interface LegalLayoutProps {
  title: string;
  description: string;
  version?: string;
  effectiveDate?: string;
  lastUpdated?: string;
  /** Markdown content string — used to build ToC */
  content?: string;
  children: ReactNode;
}

export function LegalLayout({
  title,
  description,
  version = '1.0',
  effectiveDate = 'June 18, 2026',
  lastUpdated,
  content = '',
  children,
}: LegalLayoutProps) {
  const location = useLocation();
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Back-to-top visibility
  useEffect(() => {
    const handler = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Scroll to top on route change
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);

  // Prev / Next in the doc order
  const currentIdx = LEGAL_LINKS.findIndex(l => l.to === location.pathname);
  const prev = currentIdx > 0 ? LEGAL_LINKS[currentIdx - 1] : null;
  const next = currentIdx < LEGAL_LINKS.length - 1 ? LEGAL_LINKS[currentIdx + 1] : null;

  return (
    <>
      <LegalMetaTags title={title} description={description} path={location.pathname} />

      {/* Skip link */}
      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9998] px-4 py-2 rounded bg-[#c4aa7a] text-[#0d1117] text-sm font-semibold"
      >
        Skip to content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-xs text-[#5a6373]">
          <Link to="/" className="hover:text-[#c4aa7a] transition-colors">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/legal" className="hover:text-[#c4aa7a] transition-colors">Legal</Link>
          {location.pathname !== '/legal' && (
            <>
              <span aria-hidden="true">/</span>
              <span className="text-[#9ba6b8]">{title}</span>
            </>
          )}
        </nav>

        <div className="flex gap-12">
          {/* ── Sidebar ToC (desktop) ─────────────────────────────── */}
          {content && (
            <aside className="hidden lg:block w-56 shrink-0">
              <LegalTableOfContents content={content} />
            </aside>
          )}

          {/* ── Main content ──────────────────────────────────────── */}
          <article
            id="legal-content"
            data-legal-searchable="true"
            className="flex-1 min-w-0"
          >
            {/* Page header */}
            <header className="mb-10 pb-8 border-b border-[#1e2530]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#c4aa7a] mb-2">Legal</p>
              <h1 className="text-3xl font-semibold text-[#e9edf5]">{title}</h1>
              {description && (
                <p className="mt-3 text-[#8f9aac] text-sm leading-relaxed max-w-2xl">{description}</p>
              )}
              <LegalVersionBadge version={version} effectiveDate={effectiveDate} lastUpdated={lastUpdated} />
            </header>

            {/* Page content */}
            {children}

            {/* Prev / Next navigation */}
            {(prev || next) && (
              <nav aria-label="Legal document navigation" className="mt-16 pt-8 border-t border-[#1e2530] grid grid-cols-2 gap-4">
                <div>
                  {prev && (
                    <Link
                      to={prev.to}
                      className="group flex flex-col gap-1 rounded-xl border border-[#1e2530] bg-[#0d1117] px-4 py-3 hover:border-[#3a5070] transition-colors"
                    >
                      <span className="text-[10px] uppercase tracking-wide text-[#4a5870] group-hover:text-[#6a7890]">← Previous</span>
                      <span className="text-sm text-[#8f9aac] group-hover:text-[#c4aa7a] transition-colors">{prev.label}</span>
                    </Link>
                  )}
                </div>
                <div className="flex justify-end">
                  {next && (
                    <Link
                      to={next.to}
                      className="group flex flex-col gap-1 rounded-xl border border-[#1e2530] bg-[#0d1117] px-4 py-3 hover:border-[#3a5070] transition-colors text-right w-full"
                    >
                      <span className="text-[10px] uppercase tracking-wide text-[#4a5870] group-hover:text-[#6a7890]">Next →</span>
                      <span className="text-sm text-[#8f9aac] group-hover:text-[#c4aa7a] transition-colors">{next.label}</span>
                    </Link>
                  )}
                </div>
              </nav>
            )}

            {/* All legal docs footer */}
            <div className="mt-12 pt-8 border-t border-[#1e2530]">
              <p className="text-xs text-[#4a5363] mb-4">All legal documents</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {LEGAL_LINKS.map(l => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`transition-colors underline underline-offset-4 ${l.to === location.pathname ? 'text-[#c4aa7a]' : 'text-[#5a6a7a] hover:text-[#9ba6b8]'}`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-[9990] h-10 w-10 rounded-full border border-[#2a3545] bg-[#0d1117]/90 text-[#8f9aac] hover:text-[#c4aa7a] hover:border-[#c4aa7a]/50 transition-colors shadow-lg flex items-center justify-center text-sm"
        >
          ↑
        </button>
      )}
    </>
  );
}

// Keep backward-compat exports used by old page code
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-semibold text-[#dce3ee] mb-2">{heading}</h2>
      {children}
    </section>
  );
}

export function LegalTodo({ id }: { id: string }) {
  return (
    <p className="rounded border border-dashed border-[#3a4655] bg-[#111820] px-4 py-3 text-xs text-[#5a7a9a] font-mono">
      [Placeholder — {id}]
    </p>
  );
}

