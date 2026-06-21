import { useState, useCallback, useEffect } from 'react';

const PREFS_KEY = 'fv_cookie_prefs_v1';
const LEGACY_KEY = 'fv_cookie_consent';

export interface CookiePrefs {
  essential: true;
  analytics: boolean;
  functional: boolean;
  security: true;
  thirdParty: boolean;
  timestamp: string;
}

const DEFAULT_PREFS: CookiePrefs = {
  essential: true,
  analytics: false,
  functional: false,
  security: true,
  thirdParty: false,
  timestamp: '',
};

function readPrefs(): CookiePrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as CookiePrefs;
    // Migrate legacy simple consent
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'accepted') {
      return { essential: true, analytics: true, functional: true, security: true, thirdParty: true, timestamp: new Date().toISOString() };
    }
    if (legacy === 'declined') {
      return { ...DEFAULT_PREFS, timestamp: new Date().toISOString() };
    }
  } catch { /* ignore */ }
  return null;
}

function savePrefs(prefs: CookiePrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.setItem(LEGACY_KEY, 'accepted'); // keep legacy key consistent
  } catch { /* ignore */ }
}

/** Hook — use this anywhere to read cookie consent state */
export function useCookieConsent() {
  const [prefs, setPrefs] = useState<CookiePrefs | null>(() => readPrefs());

  const accept = useCallback(() => {
    const p: CookiePrefs = { essential: true, analytics: true, functional: true, security: true, thirdParty: true, timestamp: new Date().toISOString() };
    savePrefs(p);
    setPrefs(p);
  }, []);

  const reject = useCallback(() => {
    const p: CookiePrefs = { ...DEFAULT_PREFS, timestamp: new Date().toISOString() };
    savePrefs(p);
    setPrefs(p);
  }, []);

  const save = useCallback((custom: Omit<CookiePrefs, 'essential' | 'security' | 'timestamp'>) => {
    const p: CookiePrefs = { ...custom, essential: true, security: true, timestamp: new Date().toISOString() };
    savePrefs(p);
    setPrefs(p);
  }, []);

  return { prefs, hasConsented: !!prefs?.timestamp, accept, reject, save };
}

// ── Category toggle row ──────────────────────────────────────────────────────

interface CategoryRowProps {
  label: string;
  description: string;
  examples: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (v: boolean) => void;
}

function CategoryRow({ label, description, examples, checked, locked, onChange }: CategoryRowProps) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-[#1a2030] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[#dce3ee]">{label}</span>
          {locked && (
            <span className="text-[10px] uppercase tracking-wide text-[#5a7a5a] border border-[#2a4a2a] bg-[#0d1a0d] rounded px-1.5 py-0.5">
              Always On
            </span>
          )}
        </div>
        <p className="text-xs text-[#6b7a8d] leading-relaxed">{description}</p>
        <p className="text-[10px] text-[#4a5a6a] mt-1">{examples}</p>
      </div>
      <div className="shrink-0 mt-0.5">
        <button
          role="switch"
          aria-checked={checked}
          disabled={locked}
          onClick={() => !locked && onChange?.(!checked)}
          className={`
            relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c4aa7a]/50
            ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}
            ${checked ? 'bg-[#c4aa7a]' : 'bg-[#2a3545]'}
          `}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

interface CookiePreferenceCenterProps {
  onClose: () => void;
}

export function CookiePreferenceCenter({ onClose }: CookiePreferenceCenterProps) {
  const { prefs, accept, reject, save } = useCookieConsent();
  const [analytics, setAnalytics] = useState(prefs?.analytics ?? false);
  const [functional, setFunctional] = useState(prefs?.functional ?? false);
  const [thirdParty, setThirdParty] = useState(prefs?.thirdParty ?? false);

  // Trap focus inside modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleSave() {
    save({ analytics, functional, thirdParty });
    onClose();
  }

  function handleAcceptAll() {
    accept();
    onClose();
  }

  function handleRejectAll() {
    reject();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preference center"
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[#2a3545] bg-[#0d1117] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a2030]">
          <div>
            <h2 className="text-base font-semibold text-[#e9edf5]">Cookie Preferences</h2>
            <p className="text-xs text-[#5a6a7a] mt-0.5">Manage which cookies you allow</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cookie preferences"
            className="rounded-lg p-1.5 text-[#5a6a7a] hover:text-[#9ba6b8] hover:bg-[#141a26] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Categories */}
        <div className="overflow-y-auto px-6 py-2 flex-1">
          <CategoryRow
            label="Essential"
            description="Required for the site to function. Cannot be disabled."
            examples="Session management, purchase flow, security tokens"
            checked={true}
            locked
          />
          <CategoryRow
            label="Security"
            description="Protect against fraud, unauthorized access, and abuse."
            examples="Cloudflare security cookies, CSRF tokens"
            checked={true}
            locked
          />
          <CategoryRow
            label="Functional"
            description="Remember your preferences and improve your experience."
            examples="UI preferences, language settings"
            checked={functional}
            onChange={setFunctional}
          />
          <CategoryRow
            label="Analytics"
            description="Help us understand how visitors use the platform."
            examples="Page views, download statistics, error rates"
            checked={analytics}
            onChange={setAnalytics}
          />
          <CategoryRow
            label="Third-Party"
            description="Set by Paddle (checkout) and Cloudflare (CDN). Required for purchases."
            examples="Paddle checkout cookies, Cloudflare bot protection"
            checked={thirdParty}
            onChange={setThirdParty}
          />
        </div>

        {/* Actions */}
        <div className="px-6 py-5 border-t border-[#1a2030] flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleRejectAll}
            className="flex-1 px-4 py-2.5 rounded-lg text-xs font-medium text-[#6b7a8d] border border-[#2a3545] hover:border-[#3a4e65] hover:text-[#9ba6b8] transition-colors"
          >
            Reject All
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-lg text-xs font-medium text-[#9ba6b8] border border-[#2a3545] hover:border-[#c4aa7a]/50 hover:text-[#c4aa7a] transition-colors"
          >
            Save Preferences
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#c4aa7a]/20 text-[#e0c98a] border border-[#8a7050]/50 hover:bg-[#c4aa7a]/30 transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
