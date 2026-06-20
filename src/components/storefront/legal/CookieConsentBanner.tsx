import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'fv_cookie_consent';

type ConsentValue = 'accepted' | 'declined' | null;

function getStored(): ConsentValue {
  try {
    return (localStorage.getItem(CONSENT_KEY) as ConsentValue) || null;
  } catch {
    return null;
  }
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getStored()) {
      // Short delay so page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch { /* ignore */ }
    setVisible(false);
  }

  function decline() {
    try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-4 sm:px-6 pointer-events-none"
    >
      <div className="pointer-events-auto max-w-2xl mx-auto rounded-2xl border border-[#2a3545] bg-[#0d1117]/95 backdrop-blur-md shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#c9d2de] leading-relaxed">
            We use essential cookies to make this site work.{' '}
            <Link to="/cookies" className="text-[#c4aa7a] underline underline-offset-2 hover:text-[#e0c98a] transition-colors">
              Cookie Policy
            </Link>
            {' '}·{' '}
            <Link to="/privacy" className="text-[#c4aa7a] underline underline-offset-2 hover:text-[#e0c98a] transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[#7a8899] border border-[#2a3545] hover:border-[#3a4e65] hover:text-[#9ba6b8] transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#c4aa7a]/20 text-[#e0c98a] border border-[#8a7050]/50 hover:bg-[#c4aa7a]/30 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
