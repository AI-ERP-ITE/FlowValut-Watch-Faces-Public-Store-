import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCatalog } from '@/context/CatalogContext';
import { ExternalLink } from 'lucide-react';
import {
  createPaddleCheckout,
  getOrderStatus,
  regenerateDownload,
  requestDownload,
} from '@/lib/purchaseApi';

export function BuyPage() {
  const { id } = useParams<{ id: string }>();
  const { getById, baseUrl, loading, error } = useCatalog();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [regenerationKey, setRegenerationKey] = useState<string | null>(null);

  const entry = id ? getById(id) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8E9196] text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[#8E9196]">
        <span className="text-5xl">⌚</span>
        <p className="text-sm">Watchface not found.</p>
        <Link to="/" className="text-xs underline underline-offset-4 hover:text-zinc-200">
          Back to Browse
        </Link>
      </div>
    );
  }

  const isFree = entry.price === 0;

  useEffect(() => {
    if (!orderId || token || !pollingStatus) return;

    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const status = await getOrderStatus(orderId);
        if (status.status === 'paid_confirmed') {
          setToken(status.token);
          setPollingStatus(false);
          window.clearInterval(intervalId);
          return;
        }

        if (status.status === 'failed') {
          setPollingStatus(false);
          setActionError('Payment failed. Please try again.');
          window.clearInterval(intervalId);
          return;
        }

        if (status.status === 'refunded') {
          setPollingStatus(false);
          setActionError('Payment was refunded. Download disabled.');
          window.clearInterval(intervalId);
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not verify order status');
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [orderId, pollingStatus, token]);

  async function handleDownloadWithToken(currentToken: string) {
    try {
      setDownloading(true);
      setActionError(null);
      const result = await requestDownload(currentToken);
      window.location.href = result.signedUrl;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  async function handleRestoreDownload() {
    try {
      if (!orderId) {
        throw new Error('Order is missing for restore flow');
      }

      setActionError(null);
      const regenerated = await regenerateDownload(
        regenerationKey
          ? { regenerationKey }
          : { orderId, email: buyerEmail || undefined }
      );
      setToken(regenerated.token);
      await handleDownloadWithToken(regenerated.token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Restore download failed');
    }
  }

  async function handleContinue() {
    if (!entry) return;

    try {
      setStartingCheckout(true);
      setActionError(null);

      const result = await createPaddleCheckout(entry.id, buyerEmail || undefined);
      setOrderId(result.orderId);

      if (result.type === 'simulated') {
        window.location.href = result.downloadUrl;
        return;
      }

      setRegenerationKey(result.regenerationKey);

      if (result.type === 'free') {
        if (!result.token) {
          throw new Error('Missing token for free checkout');
        }
        setToken(result.token);
        await handleDownloadWithToken(result.token);
        return;
      }

      if (result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
        window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
      setPollingStatus(true);
      setStartingCheckout(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start checkout');
      setStartingCheckout(false);
    }
  }

  return (
    <div className="min-h-screen vault-shell flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo / brand */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-2">
            <img src={logoSrc} alt="Flowvault logo" className="h-10 w-auto" />
          </div>
          <p className="text-xs text-[#8E9196] uppercase tracking-widest font-mono">
            Flowvault
          </p>
          <h1 className="text-2xl font-light text-[#E1E4EA] tracking-tight">
            {isFree ? 'Get Your Free Download' : 'Complete Your Paddle Purchase'}
          </h1>
        </div>

        {/* Preview card */}
        <div className="rounded-2xl border border-[#2f3743] bg-[#121418] overflow-hidden">
          {entry.previewPath && (
            <div className="aspect-square w-full overflow-hidden bg-[#1a1f29]">
              <img
                src={`${baseUrl}${entry.previewPath}`}
                alt={entry.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[#E1E4EA] font-medium text-sm">{entry.name}</p>
              <p className="text-[#8E9196] text-xs mt-0.5 capitalize">
                {entry.categories.join(' · ')}
              </p>
            </div>
            {isFree ? (
              <span className="text-emerald-400 font-bold text-lg">FREE</span>
            ) : (
              <span className="text-[#E8D2A8] font-bold text-lg">
                ${entry.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {!isFree && (
          <div className="space-y-2">
            <label htmlFor="buyer-email" className="text-xs text-[#8E9196]">
              Email (optional, used for ownership recovery if no key)
            </label>
            <input
              id="buyer-email"
              type="email"
              value={buyerEmail}
              onChange={(event) => setBuyerEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[#2f3743] bg-[#11151d] px-3 py-2 text-sm text-[#E1E4EA] outline-none focus:border-[#bc9456]"
            />
          </div>
        )}

        {/* CTA */}
        {!orderId && (
          <button
            type="button"
            onClick={handleContinue}
            disabled={startingCheckout}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#bc9456] text-[#17120a] font-semibold text-sm hover:bg-[#d2af78] transition-colors"
          >
            {startingCheckout
              ? 'Starting...'
              : isFree
                ? 'Download Now'
                : 'Continue to Paddle'}
            <ExternalLink className="h-4 w-4" />
          </button>
        )}

        {orderId && !token && (
          <div className="space-y-2">
            <p className="text-xs text-[#8E9196] text-center">
              Complete payment in Paddle Checkout. This page waits for webhook confirmation.
            </p>
            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs underline underline-offset-4 text-[#8E9196] hover:text-[#E1E4EA]"
              >
                Open Paddle Checkout
              </a>
            )}
            {pollingStatus && (
              <p className="text-[11px] text-center text-[#8E9196]">Waiting for webhook confirmation...</p>
            )}
          </div>
        )}

        {token && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleDownloadWithToken(token)}
              disabled={downloading}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#bc9456] text-[#17120a] font-semibold text-sm hover:bg-[#d2af78] transition-colors"
            >
              {downloading ? 'Preparing download...' : 'Download Your ZPK'}
            </button>
            <button
              type="button"
              onClick={handleRestoreDownload}
              className="w-full py-2 rounded-xl border border-[#2f3743] text-[#E1E4EA] text-xs hover:border-[#bc9456]"
            >
              Restore Download
            </button>
          </div>
        )}

        {actionError && (
          <p className="text-xs text-red-300 text-center">{actionError}</p>
        )}

        {/* Back link */}
        <p className="text-center text-[#8E9196] text-xs">
          Changed your mind?{' '}
          <Link
            to={`/face/${entry.id}`}
            className="underline underline-offset-4 hover:text-[#E1E4EA] transition-colors"
          >
            Go back
          </Link>
        </p>
      </div>
    </div>
  );
}
