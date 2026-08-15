import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
  variant?: 'icon' | 'button';
}

export function ShareButton({
  title = 'FlowVault Watch Face',
  text = 'Check out this watch face on FlowVault',
  url,
  className = '',
  variant = 'button',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = url || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if user cancels or share API throws
        if ((err as Error).name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        title="Share watch face"
        aria-label="Share watch face"
        className={`p-2.5 rounded-lg border border-[#e8d2a8]/40 bg-[#1c1813] text-[#e8d2a8] hover:bg-[#e8d2a8]/20 hover:border-[#e8d2a8] hover:shadow-[0_0_16px_rgba(232,210,168,0.25)] transition-all cursor-pointer ${className}`}
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-semibold rounded-lg border border-[#e8d2a8]/50 bg-[#1c1813] text-[#e8d2a8] hover:bg-[#e8d2a8]/20 hover:border-[#e8d2a8] hover:shadow-[0_0_16px_rgba(232,210,168,0.25)] transition-all cursor-pointer ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
