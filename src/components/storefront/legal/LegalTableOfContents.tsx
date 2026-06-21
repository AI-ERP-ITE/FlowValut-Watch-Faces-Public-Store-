import { useEffect, useRef, useState } from 'react';
import { slugify } from './LegalMarkdown';

interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

function parseHeadings(content: string): TocEntry[] {
  const lines = content.split('\n');
  const entries: TocEntry[] = [];
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h2) {
      const text = h2[1].trim();
      entries.push({ id: slugify(text), text, level: 2 });
    } else if (h3) {
      const text = h3[1].trim();
      entries.push({ id: slugify(text), text, level: 3 });
    }
  }
  return entries;
}

interface LegalTableOfContentsProps {
  content: string;
}

/**
 * Auto-generated Table of Contents with IntersectionObserver scroll-spy.
 * Highlights the currently visible section.
 */
export function LegalTableOfContents({ content }: LegalTableOfContentsProps) {
  const headings = parseHeadings(content);
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-10% 0% -80% 0%',
      threshold: 0,
    });

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="sticky top-24 space-y-1">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#5a6373] mb-3 px-2">Contents</p>
      <ol className="space-y-0.5">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveId(id);
              }}
              className={`
                block rounded px-2 py-1.5 text-xs leading-snug transition-colors
                ${level === 3 ? 'pl-5' : ''}
                ${activeId === id
                  ? 'text-[#c4aa7a] bg-[#c4aa7a]/8'
                  : 'text-[#5a6a7a] hover:text-[#9ba6b8]'
                }
              `}
            >
              {text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
