// Spec 012 — Unified Design Input (Image tab | HTML tab)
import { Label } from '@/components/ui/label';
import { UploadZone } from '@/components/UploadZone';

interface Props {
  activeTab: 'image' | 'html' | 'html_creator';
  onTabChange: (tab: 'image' | 'html' | 'html_creator') => void;
  // Image tab
  imageValue: string | null;
  onImageChange: (img: string | null) => void;
  onImageFileChange: (file: File | null) => void;
  // HTML tab
  htmlValue: string;
  onHtmlChange: (html: string) => void;
  // Live preview background (HTML tab)
  bgImage: string | null;
}

export function DesignInput({
  activeTab,
  onTabChange,
  imageValue,
  onImageChange,
  onImageFileChange,
  htmlValue,
  onHtmlChange,
  bgImage,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex rounded-lg overflow-hidden border border-zinc-700">
        <button
          onClick={() => onTabChange('image')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'image'
              ? 'bg-cyan-600 text-white'
              : 'bg-[#141414] text-zinc-400 hover:text-white'
          }`}
        >
          ↑ Image (AI)
        </button>
        <button
          onClick={() => onTabChange('html')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'html'
              ? 'bg-cyan-600 text-white'
              : 'bg-[#141414] text-zinc-400 hover:text-white'
          }`}
        >
          {'</>'} HTML
        </button>
        <button
          onClick={() => onTabChange('html_creator')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'html_creator'
              ? 'bg-cyan-600 text-white'
              : 'bg-[#141414] text-zinc-400 hover:text-white'
          }`}
        >
          HTML Creator
        </button>
      </div>

      {activeTab === 'image' ? (
        <UploadZone
          label="Full Design"
          sublabel="Complete design with all elements"
          value={imageValue}
          onChange={onImageChange}
          onFileChange={onImageFileChange}
        />
      ) : (
        <>
          {/* HTML textarea */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-300">HTML Layout</Label>
            <textarea
              value={htmlValue}
              onChange={(e) => onHtmlChange(e.target.value)}
              placeholder="Paste your watch face HTML here..."
              className="w-full h-48 px-3 py-2 rounded-md bg-[#0F0F0F] border border-zinc-700 text-white text-xs font-mono placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none resize-y"
            />
          </div>

          {/* Live preview — background + HTML overlay + circular mask */}
          {(bgImage || htmlValue.trim()) && (
            <div className="space-y-2">
              <Label className="text-sm text-zinc-300">Preview</Label>
              <div className="flex justify-center">
                <div
                  style={{
                    position: 'relative',
                    width: 240,
                    height: 240,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#000',
                    flexShrink: 0,
                  }}
                >
                  {bgImage && (
                    <img
                      src={bgImage}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      alt="background"
                    />
                  )}
                  {htmlValue.trim() && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: 480,
                        height: 480,
                        transform: 'scale(0.5)',
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                      }}
                      dangerouslySetInnerHTML={{ __html: htmlValue }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
