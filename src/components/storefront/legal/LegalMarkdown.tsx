import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';

/** Slugify a heading string to a valid HTML id */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

interface LegalMarkdownProps {
  content: string;
}

/**
 * Renders a legal markdown string using react-markdown.
 * - Injects id anchors on h2/h3 headings for ToC scroll-spy.
 * - Internal /links are rendered via React Router <Link>.
 * - Applies site-themed prose styles.
 */
export function LegalMarkdown({ content }: LegalMarkdownProps) {
  return (
    <div className="legal-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with anchor IDs for scroll-spy
          h1: ({ children }) => (
            <h1 id={slugify(String(children))} className="text-2xl font-semibold text-[#e9edf5] mt-8 mb-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h2 id={id} className="text-lg font-semibold text-[#dce3ee] mt-8 mb-3 scroll-mt-24">
                <a href={`#${id}`} className="group flex items-center gap-2 hover:text-[#c4aa7a] transition-colors">
                  {children}
                  <span className="opacity-0 group-hover:opacity-50 text-[#c4aa7a] text-sm">#</span>
                </a>
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h3 id={id} className="text-base font-medium text-[#c9d2de] mt-6 mb-2 scroll-mt-24">
                {children}
              </h3>
            );
          },
          // Body text
          p: ({ children }) => (
            <p className="text-[#8f9aac] text-sm leading-7 mb-4">{children}</p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="my-4 space-y-2 pl-5 list-none">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 space-y-2 pl-5 list-decimal marker:text-[#5a6373]">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[#8f9aac] text-sm leading-7 relative pl-4 before:absolute before:left-0 before:top-2.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#c4aa7a]/50">
              {children}
            </li>
          ),
          // Links — internal vs external
          a: ({ href, children }) => {
            const isInternal = href && (href.startsWith('/') || href.startsWith('#'));
            if (isInternal) {
              return (
                <Link to={href!} className="text-[#c4aa7a] underline underline-offset-2 hover:text-[#e0c98a] transition-colors">
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c4aa7a] underline underline-offset-2 hover:text-[#e0c98a] transition-colors"
              >
                {children}
              </a>
            );
          },
          // Strong / em
          strong: ({ children }) => (
            <strong className="font-semibold text-[#c9d2de]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#a0abb8]">{children}</em>
          ),
          // Horizontal rule
          hr: () => <hr className="my-8 border-[#1e2530]" />,
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 border-l-2 border-[#c4aa7a]/40 text-[#7a8899] italic text-sm">
              {children}
            </blockquote>
          ),
          // Code
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <pre className="my-4 rounded-lg bg-[#0a0e14] border border-[#1e2530] p-4 overflow-x-auto">
                  <code className="text-xs font-mono text-[#8f9aac]">{children}</code>
                </pre>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-[#141a24] border border-[#1e2530] text-xs font-mono text-[#c4aa7a]">
                {children}
              </code>
            );
          },
          // Tables
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-lg border border-[#1e2530]">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#0d1117] text-[#7a8899] text-xs uppercase tracking-wide">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 border-t border-[#1a1f28] text-[#8f9aac]">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
