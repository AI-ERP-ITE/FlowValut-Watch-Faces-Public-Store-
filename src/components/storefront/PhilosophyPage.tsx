import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PhilosophyPage() {
  return (
    <div className="maison-collection-page">
      <header className="maison-collection-hero">
        <div className="maison-collection-hero-shade" />
        <div className="maison-collection-hero-copy">
          <Link to="/" className="maison-back-link"><ArrowLeft size={14} /> Back to Browse</Link>
          <p className="maison-eyebrow">FlowVault Philosophy</p>
          <h1>Time, refined for the digital age.</h1>
          <p>Swiss watchmaking principles meet digital craftsmanship: emotional design, exact proportion, and functional intelligence composed for the wrist.</p>
        </div>
      </header>

      <section className="maison-section">
        <div className="max-w-4xl mx-auto space-y-10">
          <blockquote className="text-xl sm:text-2xl font-serif text-[#e8d2a8] italic text-center leading-relaxed border-y border-[#3a3528]/50 py-8">
            “FlowVault does not create watchfaces.<br />
            <strong className="not-italic text-[#f4e8d1] font-semibold">FlowVault creates digital timepieces.</strong>”
          </blockquote>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/80">
              <span className="text-xs font-mono text-[#e8d2a8] block mb-2">01 — Core Principle</span>
              <h3 className="text-lg font-serif text-[#f4e8d1] mb-2">Proportion First</h3>
              <p className="text-xs text-[#a09a8e] leading-relaxed">
                Information is balanced with the precision of a mechanical dial. Negative space and typography are calibrated so the display feels calm at wrist distance.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/80">
              <span className="text-xs font-mono text-[#e8d2a8] block mb-2">02 — Core Principle</span>
              <h3 className="text-lg font-serif text-[#f4e8d1] mb-2">Material Realism</h3>
              <p className="text-xs text-[#a09a8e] leading-relaxed">
                Light, depth, texture, and shadow create a convincing digital presence without superficial decoration or unnecessary visual noise.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/80">
              <span className="text-xs font-mono text-[#e8d2a8] block mb-2">03 — Core Principle</span>
              <h3 className="text-lg font-serif text-[#f4e8d1] mb-2">Native Intelligence</h3>
              <p className="text-xs text-[#a09a8e] leading-relaxed">
                Battery, heart rate, step count, and weather metrics are integrated as complications rather than added as digital overlays.
              </p>
            </div>
          </div>

          <div className="text-center pt-8">
            <Link to="/#all-models" className="inline-flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-widest font-semibold rounded-lg bg-[#e8d2a8] text-[#090b0f] hover:bg-[#f4e8d1] transition-colors">
              Explore the Timepieces <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
