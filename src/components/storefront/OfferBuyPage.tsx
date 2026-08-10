import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getFlowVaultConfig } from '@/config/flowVaultConfig';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { offerCompatibleDevices, resolveLegacySku, skuOffer, skuPackages } from '@/lib/storeReadModel';
import { confirmOfferPayment, createOfferCheckout, DOWNLOAD_ALLOWANCE_EXHAUSTED_MESSAGE, fulfillEntitlement, getOrderStatus, isDownloadAllowanceExhaustedError, regenerateDownload } from '@/lib/purchaseApi';
import { isPaddleCheckoutClosedError, openPaddleTransaction, PaddleCheckoutClosedError, preparePaddleCheckout, waitForPaddleCheckoutCompletion } from '@/lib/paddleCheckout';
import { generateQRCode } from '@/lib/qrGenerator';

type PackageDelivery = { canonicalName: string; signedUrl: string; qrCodeDataUrl: string };

async function preparePackageDeliveries(packages: Array<{ canonicalName: string; signedUrl: string }>): Promise<PackageDelivery[]> {
  return Promise.all(packages.map(async (item) => ({ ...item, qrCodeDataUrl: await generateQRCode(item.signedUrl) })));
}

export function OfferBuyPage() {
  const checkoutEnabled = getFlowVaultConfig().checkoutEnabled;
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const recoveryKey = searchParams.get('recovery')?.trim() ?? '';
  const recoveryDeviceId = searchParams.get('device')?.trim() ?? '';
  const { data, loading, error } = useStoreReadModel();
  const directOffer = data?.offers.find((item) => item.id === id) ?? null;
  const sku = directOffer
    ? data?.skus.find((item) => item.id === directOffer.includedSkuIds[0]) ?? null
    : data?.skus.find((item) => item.id === id) ?? (data && id ? resolveLegacySku(data, id) : null);
  const offer = directOffer ?? (data && sku ? skuOffer(data, sku.id) : null);
  const devices = data && offer ? offerCompatibleDevices(data, offer) : [];
  const [deviceId, setDeviceId] = useState('');
  const [email, setEmail] = useState('');
  const [recoveryOrderId, setRecoveryOrderId] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [vipMode, setVipMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<PackageDelivery[]>([]);
  const [deliveryToken, setDeliveryToken] = useState<string | null>(null);
  const [deliveryExhausted, setDeliveryExhausted] = useState(false);
  const [recoveryDelivery, setRecoveryDelivery] = useState(false);
  const downloadsRef = useRef<HTMLElement | null>(null);

  async function showDeliveries(token: string, device: string, isRecovery: boolean) {
    const result = await fulfillEntitlement(token, device);
    setDownloads(await preparePackageDeliveries(result.packages));
    setDeliveryToken(token);
    setDeliveryExhausted(false);
    setRecoveryDelivery(isRecovery);
    setMessage(null);
  }

  function showDeliveryError(error: unknown) {
    if (isDownloadAllowanceExhaustedError(error)) {
      setDownloads([]);
      setDeliveryToken(null);
      setDeliveryExhausted(true);
      setMessage(null);
      return;
    }
    setMessage(error instanceof Error ? error.message : 'Purchase recovery failed');
  }

  useEffect(() => {
    if (checkoutEnabled) void preparePaddleCheckout().catch(() => undefined);
  }, [checkoutEnabled]);

  useEffect(() => {
    if (!id || recoveryKey) return;
    const raw = window.sessionStorage.getItem(`flowvault-order:${id}`);
    if (!raw) return;
    try {
      const recovery = JSON.parse(raw) as { orderId?: unknown; deviceId?: unknown };
      if (typeof recovery.orderId !== 'string' || typeof recovery.deviceId !== 'string') return;
      setDeviceId(recovery.deviceId);
      setPurchaseOrderId(recovery.orderId);
      setBusy(true);
      setMessage('Recovering your confirmed purchase…');
      void getOrderStatus(recovery.orderId)
        .then(async (status) => {
          if (status.status !== 'paid_confirmed') throw new Error('Payment confirmation is still pending.');
          await showDeliveries(status.token, recovery.deviceId as string, false);
        })
        .catch(showDeliveryError)
        .finally(() => setBusy(false));
    } catch {
      window.sessionStorage.removeItem(`flowvault-order:${id}`);
    }
  }, [id, recoveryKey]);

  useEffect(() => {
    if (!recoveryKey || !recoveryDeviceId) return;
    setDeviceId(recoveryDeviceId);
    setBusy(true);
    setMessage('Recovering your protected FlowVault delivery…');
    void regenerateDownload({ regenerationKey: recoveryKey })
      .then(async ({ token }) => showDeliveries(token, recoveryDeviceId, true))
      .catch(showDeliveryError)
      .finally(() => setBusy(false));
  }, [recoveryDeviceId, recoveryKey]);

  useEffect(() => {
    if (downloads.length > 0) downloadsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [downloads]);

  useEffect(() => {
    if (!deliveryToken || !deviceId || downloads.length === 0) return;
    let active = true;
    const timer = window.setInterval(() => {
      void fulfillEntitlement(deliveryToken, deviceId).catch((error) => {
        if (active && isDownloadAllowanceExhaustedError(error)) showDeliveryError(error);
      });
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [deliveryToken, deviceId, downloads.length]);

  if (loading) return <Status text="Loading Offer…" />;
  if (error || !data) return <Status text={error ?? 'Store unavailable'} />;
  if (!sku || !offer) return <Status text="This finished timepiece is not currently offered." />;

  const preview = skuPackages(data, sku.id)[0]?.mainPreviewPath;
  const campaignPrice = offer.campaignPrice ?? offer.regularPrice;
  const price = vipMode ? offer.regularPrice : campaignPrice;

  async function start() {
    if (!offer || !deviceId) return;
    if (!checkoutEnabled) {
      setMessage('Purchasing is coming soon. Checkout is currently unavailable.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const paddleReady = price > 0 ? preparePaddleCheckout() : Promise.resolve();
      const checkout = await createOfferCheckout(offer.id, deviceId, email || undefined, vipMode ? 'VIP_STANDARD' : 'CAMPAIGN');
      setPurchaseOrderId(checkout.orderId);
      if (checkout.type === 'paid') {
        if (!checkout.paddleTransactionId) throw new Error('Paddle transaction is missing.');
        window.sessionStorage.setItem(`flowvault-order:${offer.id}`, JSON.stringify({ orderId: checkout.orderId, deviceId }));
        let checkoutClosed = false;
        const checkoutCompleted = waitForPaddleCheckoutCompletion(checkout.paddleTransactionId);
        try {
          await paddleReady;
          await openPaddleTransaction(checkout.paddleTransactionId, { allowVipCode: vipMode });
        } catch (paddleError) {
          if (checkout.checkoutUrl) {
            window.location.assign(checkout.checkoutUrl);
            return;
          }
          throw paddleError;
        }
        void checkoutCompleted
          .then(() => confirmOfferPayment(checkout.orderId))
          .catch((error) => {
            if (isPaddleCheckoutClosedError(error)) checkoutClosed = true;
          });
        setMessage('Complete payment in Paddle. This page will prepare your device packages after confirmation.');
        const startedPollingAt = Date.now();
        const deadline = startedPollingAt + 10 * 60_000;
        let token: string | null = null;
        while (Date.now() < deadline && !token) {
          if (checkoutClosed) throw new PaddleCheckoutClosedError();
          const status = await getOrderStatus(checkout.orderId);
          if (status.status === 'paid_confirmed') token = status.token;
          else if (status.status === 'failed' || status.status === 'refunded') throw new Error(`Payment ${status.status}.`);
          if (!token) {
            const elapsed = Date.now() - startedPollingAt;
            await new Promise((resolve) => window.setTimeout(resolve, elapsed < 20_000 ? 1000 : 2500));
          }
        }
        if (checkoutClosed) throw new PaddleCheckoutClosedError();
        if (!token) throw new Error('Payment confirmation timed out. Your order remains recoverable.');
        await showDeliveries(token, deviceId, false);
      } else {
        if (!checkout.token) throw new Error('Free order token is missing.');
        await showDeliveries(checkout.token, deviceId, false);
      }
    } catch (err) {
      if (isPaddleCheckoutClosedError(err)) {
        if (offer) window.sessionStorage.removeItem(`flowvault-order:${offer.id}`);
        setPurchaseOrderId(null);
        setMessage(err.message);
      } else {
        setMessage(err instanceof Error ? err.message : 'Checkout failed');
      }
    } finally {
      setBusy(false);
    }
  }

  async function recoverPurchase() {
    if (!deviceId || !recoveryOrderId.trim() || !recoveryEmail.trim()) return;
    setBusy(true);
    setMessage('Validating your original purchase…');
    try {
      const { token } = await regenerateDownload({ orderId: recoveryOrderId.trim(), email: recoveryEmail.trim() });
      await showDeliveries(token, deviceId, true);
    } catch (err) {
      showDeliveryError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen vault-shell px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <Link to="/" className="text-xs text-[#9da6b5]">Browse /</Link>
        <section className="overflow-hidden rounded-2xl border border-[#303744] bg-[#171b23]">
          {preview && <img src={preview} alt={sku.canonicalName} className="aspect-square w-full object-contain" />}
          <div className="p-5">
            <p className="vault-micro">{offer.type === 'BUNDLE' ? 'Complete Color Collection' : 'Finished FlowVault timepiece'}</p>
            <h1 className="mt-2 text-2xl text-white">{offer.name}</h1>
            <p className="mt-2 text-xl text-[#e8d2a8]">${price.toFixed(2)}</p>
            {offer.includedSkuIds.length > 1 && <p className="mt-2 text-sm text-[#9da6b5]">Includes all {offer.includedSkuIds.length} color variants. Every compatible package will be delivered.</p>}
          </div>
        </section>
        {downloads.length === 0 ? <>
          <label className="block text-sm text-[#aeb6c3]">
            Watch device
            <select disabled={busy} value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className="mt-2 w-full rounded-lg border border-[#343b48] bg-[#11151d] p-3 text-white disabled:opacity-50">
              <option value="">Choose your watch</option>
              {devices.map((device) => <option key={device.id} value={device.id}>{device.brand} {device.name}</option>)}
            </select>
          </label>
          {offer.regularPrice > 0 && <label className="flex items-start gap-2 rounded-xl border border-[#343b48] bg-[#11151d] p-3 text-sm text-[#aeb6c3]">
            <input disabled={busy} type="checkbox" checked={vipMode} onChange={(event) => setVipMode(event.target.checked)} className="mt-1 disabled:opacity-50" />
            <span><span className="block text-[#e8d2a8]">I have a FlowVault VIP code</span><span className="mt-1 block text-xs text-[#8f99a9]">VIP codes apply to the standard price and cannot be combined with an active store promotion. Enter the code securely inside Paddle Checkout.</span></span>
          </label>}
          <label className="block text-sm text-[#aeb6c3]">
            Email
            <input disabled={busy} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-[#343b48] bg-[#11151d] p-3 text-white disabled:opacity-50" />
          </label>
          <label className="flex gap-2 text-xs text-[#9da6b5]">
            <input disabled={busy} type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            I agree to the <Link to="/terms" className="underline">Terms, Privacy Policy, EULA, and Refund Policy</Link>.
          </label>
          <button type="button" disabled={!checkoutEnabled || !deviceId || !email.trim() || !agreed || busy} onClick={start} className="w-full rounded-xl bg-[#bc9456] p-3 font-semibold text-[#17120a] disabled:cursor-not-allowed disabled:opacity-40">
            {!checkoutEnabled ? 'Coming Soon' : busy ? 'Preparing…' : price === 0 ? 'Get device package' : `Secure checkout — $${price.toFixed(2)}`}
          </button>
          {!checkoutEnabled && <p className="text-center text-xs text-[#9da6b5]">Purchasing is temporarily unavailable while FlowVault prepares for launch.</p>}
          <details className="rounded-xl border border-[#343b48] p-4 text-sm text-[#aeb6c3]">
            <summary className="cursor-pointer text-[#e8d2a8]">Recover an existing purchase</summary>
            <p className="mt-3 text-xs">For completed purchases only. Use the FlowVault order ID from your delivery email and the exact email used at checkout. Unpaid or canceled checkout attempts cannot be recovered.</p>
            <input aria-label="Order ID" placeholder="Order ID" value={recoveryOrderId} onChange={(event) => setRecoveryOrderId(event.target.value)} className="mt-3 w-full rounded-lg border border-[#343b48] bg-[#11151d] p-3 text-white" />
            <input aria-label="Original purchase email" placeholder="Original purchase email" type="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-[#343b48] bg-[#11151d] p-3 text-white" />
            <button type="button" onClick={recoverPurchase} disabled={busy || !deviceId || !recoveryOrderId.trim() || !recoveryEmail.trim()} className="mt-3 w-full rounded-lg border border-[#bc9456] p-3 text-[#e8d2a8] disabled:opacity-40">Recover final download</button>
          </details>
        </> : (
          <div className="rounded-xl border border-[#4e674f] bg-[#17231b] p-4 text-center text-[#bfe2c3]">Payment confirmed</div>
        )}
        {deliveryExhausted && (
          <div role="alert" className="rounded-xl border border-[#9b5d46] bg-[#2a1713] p-4 text-sm leading-6 text-[#f0c2b4]">
            <strong className="block text-[#f2d0c6]">Download allowance used</strong>
            {DOWNLOAD_ALLOWANCE_EXHAUSTED_MESSAGE}
          </div>
        )}
        {message && <p className="text-sm text-[#e1b4a9]">{message}</p>}
        {downloads.length > 0 && purchaseOrderId && (
          <div className="rounded-xl border border-[#343b48] bg-[#11151d] p-3 text-xs text-[#aeb6c3]">
            <span>FlowVault order: <span className="font-mono text-[#e8d2a8]">{purchaseOrderId}</span></span>
            <button type="button" onClick={() => void navigator.clipboard.writeText(purchaseOrderId)} className="ml-3 underline text-[#e8d2a8]">Copy</button>
          </div>
        )}
        {downloads.length > 0 && (
          <section ref={downloadsRef} className="space-y-2" aria-live="polite">
            <h2 className="text-lg text-white">Your device packages</h2>
            {recoveryDelivery && <p className="rounded-lg border border-[#7b673d] bg-[#211d13] p-3 text-sm text-[#e8d2a8]">Final recovery transfer: use either the QR installation or the ZPK download. Completing either one consumes the remaining allowance.</p>}
            {downloads.map((item) => (
              <div key={item.signedUrl} className="rounded-xl border border-[#343b48] p-4">
                <img src={item.qrCodeDataUrl} alt={`Install ${item.canonicalName} with the Zepp app`} className="mx-auto h-56 w-56 rounded-lg bg-white p-2" />
                <p className="mt-3 text-center text-xs text-[#9da6b5]">Scan with the Zepp app to install on your selected watch.</p>
                <a href={item.signedUrl} onClick={() => { if (recoveryDelivery) setMessage('Your final recovery transfer is starting. This page will update when it is consumed.'); }} className="mt-3 block rounded-lg border border-[#4a5362] p-3 text-center text-[#e8d2a8]">Download {item.canonicalName}.zpk</a>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function Status({ text }: { text: string }) {
  return <div className="grid min-h-screen place-items-center text-[#8e96a3]">{text}</div>;
}
