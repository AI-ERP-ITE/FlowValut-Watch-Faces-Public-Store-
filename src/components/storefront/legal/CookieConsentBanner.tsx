import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCookieConsent, CookiePreferenceCenter } from './CookiePreferenceCenter';

export function CookieConsentBanner() {
  const { hasConsented, accept, reject } = useCookieConsent();
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    if (!hasConsented) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [hasConsented]);

  function handleAccept() { accept(); setVisible(false); }
  function handleReject() { reject(); setVisible(false); }
  function handlePrefsClose() { setShowPrefs(false); setVisible(false); }

  if (!visible && !showPrefs) return null;

  return (
    <>
      {visible && !showPrefs && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-4 sm:px-6 pointer-events-none"
        >
          <div className="pointer-events-auto max-w-2xl mx-auto rounded-2xl border border-[#2a3545] bg-[#0d1117]/95 backdrop-blur-md shadow-2xl px-5 py-4">
            <p className="text-sm text-[#c9d2de] leading-relaxed mb-4">
              We use cookies to keep the site secure and improve your experience.{' '}
              <Link to="/cookies" className="text-[#c4aa7a] underline underline-offset-2 hover:text-[#e0c98a] transition-colors">Cookie Policy</Link>
              {' '}·{' '}
              <Link to="/privacy" className="text-[#c4aa7a] underline underline-offset-2 hover:text-[#e0c98a] transition-colors">Privacy Policy</Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleReject}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#7a8899] border border-[#2a3545] hover:border-[#3a4e65] hover:text-[#9ba6b8] transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={() => setShowPrefs(true)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#7a8899] border border-[#2a3545] hover:border-[#3a4e65] hover:text-[#9ba6b8] transition-colors"
              >
                Customize →
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#c4aa7a]/20 text-[#e0c98a] border border-[#8a7050]/50 hover:bg-[#c4aa7a]/30 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
      {showPrefs && <CookiePreferenceCenter onClose={handlePrefsClose} />}
    </>
  );
}

