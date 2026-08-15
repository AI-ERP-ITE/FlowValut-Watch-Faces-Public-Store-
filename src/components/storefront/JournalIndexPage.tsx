import { useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface JournalStory {
  number: string;
  category: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
}

const journalStories: JournalStory[] = [
  {
    number: '01',
    category: 'Craftsmanship',
    title: 'The Art of Digital Guilloché',
    excerpt: 'Guilloché has always been about discipline disguised as decoration. Repeated geometry, precise rhythm and controlled depth transform a flat surface into something that feels alive.',
    paragraphs: [
      'Guilloché has always been about discipline disguised as decoration. Repeated geometry, precise rhythm and controlled depth transform a flat surface into something that feels alive.',
      'At FlowVault, that philosophy is translated into the digital dial. Every pattern is designed to create depth without noise, texture without clutter and craftsmanship without imitation.',
      'The result is not simply a decorative background. It is a surface engineered to reward closer inspection while remaining calm at wrist distance.',
    ],
  },
  {
    number: '02',
    category: 'Design Principles',
    title: 'Why Proportion Creates Luxury',
    excerpt: 'Luxury begins long before materials, color or ornamentation. It begins with proportion.',
    paragraphs: [
      'Luxury begins long before materials, color or ornamentation.',
      'It begins with proportion.',
      'The relationship between the dial, hands, markers, complications and negative space determines whether a watch feels refined or crowded. When those relationships are correct, even a simple design can feel exceptional.',
      'FlowVault treats proportion as the foundation of every timepiece. Decoration may enhance a design, but balance is what gives it permanence.',
      'A premium watch should never need to shout.',
    ],
  },
  {
    number: '03',
    category: 'Collections',
    title: 'Inside the Legacy Collection',
    excerpt: 'Legacy is FlowVault’s purest expression of restrained Swiss luxury.',
    paragraphs: [
      'Legacy is FlowVault’s purest expression of restrained Swiss luxury.',
      'Its identity is built around timeless proportion, quiet confidence and craftsmanship that reveals itself gradually rather than demanding immediate attention.',
      'Each Legacy model begins independently, allowing the architecture, complications and detailing to evolve freely while preserving the same core values: elegance, balance, readability and material realism.',
      'Different watches. The same creative ancestry.',
    ],
  },
  {
    number: '04',
    category: 'Perspective',
    title: 'From Mechanical Watch to Digital Timepiece',
    excerpt: 'FlowVault does not begin with a smartwatch interface. It begins with a watch.',
    paragraphs: [
      'FlowVault does not begin with a smartwatch interface.',
      'It begins with a watch.',
      'Every design is first imagined as a physical object: a dial with depth, materials, machining, reflections, hands and believable construction. Only then is technology introduced.',
      'Battery, health, activity and weather information are integrated as complications rather than added as digital overlays.',
      'The objective is simple: Create a timepiece that feels mechanically credible, digitally intelligent and unmistakably premium.',
    ],
  },
];

export function JournalIndexPage() {
  const [selectedStory, setSelectedStory] = useState<JournalStory | null>(null);

  return (
    <div className="maison-collection-page">
      <header className="maison-collection-hero">
        <div className="maison-collection-hero-shade" />
        <div className="maison-collection-hero-copy">
          <Link to="/" className="maison-back-link"><ArrowLeft size={14} /> Back to Browse</Link>
          <p className="maison-eyebrow">FlowVault Journal</p>
          <h1>Stories of Digital Horology</h1>
          <p>Notes on proportion, craft, collection identity, and the evolving language of time.</p>
          <span>4 Editorial Articles</span>
        </div>
      </header>

      <section className="maison-section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {journalStories.map((story) => (
            <article
              key={story.number}
              onClick={() => setSelectedStory(story)}
              className="maison-journal-card cursor-pointer p-8 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/80 hover:border-[#e8d2a8]/60 hover:bg-[#1a202c] transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-[#e8d2a8]">{story.number} — {story.category}</span>
                <span className="text-xs text-[#e8d2a8] group-hover:translate-x-1 transition-transform flex items-center gap-1">Read <ArrowRight size={13} /></span>
              </div>
              <h2 className="text-2xl font-serif text-[#f4e8d1] mb-3 group-hover:text-[#e8d2a8] transition-colors">{story.title}</h2>
              <p className="text-xs text-[#a09a8e] leading-relaxed line-clamp-3">{story.excerpt}</p>
            </article>
          ))}
        </div>

        {selectedStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedStory(null)}>
            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#e8d2a8]/40 bg-[#0d0f14] p-8 text-[#f4e8d1] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setSelectedStory(null)}
                aria-label="Close article"
                className="absolute top-6 right-6 p-2 rounded-full border border-[#3a3528] bg-[#1a202c] text-[#a09a8e] hover:text-[#e8d2a8] hover:border-[#e8d2a8] transition-all"
              >
                <X size={18} />
              </button>

              <span className="text-xs uppercase tracking-widest text-[#e8d2a8] font-mono block mb-2">{selectedStory.number} — {selectedStory.category}</span>
              <h2 className="text-3xl font-serif text-[#e8d2a8] mb-6 leading-tight">{selectedStory.title}</h2>

              <div className="space-y-4 text-sm text-[#d0caae] leading-relaxed border-t border-[#3a3528]/50 pt-6">
                {selectedStory.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-[#3a3528]/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStory(null)}
                  className="px-5 py-2 text-xs uppercase tracking-widest font-semibold rounded-lg bg-[#e8d2a8] text-[#090b0f] hover:bg-[#f4e8d1] transition-colors"
                >
                  Close Article
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
