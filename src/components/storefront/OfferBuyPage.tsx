import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { compatibleDevices, resolveLegacySku, skuOffer, skuPackages } from '@/lib/storeReadModel';
import { createOfferCheckout, fulfillEntitlement, getOrderStatus } from '@/lib/purchaseApi';

export function OfferBuyPage() {
  const { id } = useParams<{ id: string }>(); const { data, loading, error } = useStoreReadModel();
  const sku = data?.skus.find((item) => item.id === id) ?? (data && id ? resolveLegacySku(data, id) : null); const offer = data && sku ? skuOffer(data, sku.id) : null;
  const devices = data && sku ? compatibleDevices(data, sku.id) : []; const [deviceId, setDeviceId] = useState(''); const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<Array<{ canonicalName: string; signedUrl: string }>>([]);
  if (loading) return <Status text="Loading Offer…" />; if (error || !data) return <Status text={error ?? 'Store unavailable'} />;
  if (!sku || !offer) return <Status text="This finished timepiece is not currently offered." />;
  const preview = skuPackages(data, sku.id)[0]?.mainPreviewPath; const price = offer.campaignPrice ?? offer.regularPrice;
  async function start() {
    if (!offer || !deviceId) return; setBusy(true); setMessage(null);
    try {
      const checkout = await createOfferCheckout(offer.id, deviceId, email || undefined);
      if (checkout.type === 'paid') {
        if (checkout.checkoutUrl) window.open(checkout.checkoutUrl, '_blank', 'noopener,noreferrer');
        setMessage('Complete payment in Paddle. This page will prepare your device packages after confirmation.');
        const deadline = Date.now() + 10 * 60_000; let token: string | null = null;
        while (Date.now() < deadline && !token) { await new Promise((resolve) => window.setTimeout(resolve, 3000)); const status = await getOrderStatus(checkout.orderId); if (status.status === 'paid_confirmed') token = status.token; else if (status.status === 'failed' || status.status === 'refunded') throw new Error(`Payment ${status.status}.`); }
        if (!token) throw new Error('Payment confirmation timed out. Your order remains recoverable.');
        const result = await fulfillEntitlement(token, deviceId); setDownloads(result.packages); setMessage(null);
      } else {
        if (!checkout.token) throw new Error('Free order token is missing.');
        const result = await fulfillEntitlement(checkout.token, deviceId); setDownloads(result.packages);
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Checkout failed'); } finally { setBusy(false); }
  }
  return <main className="min-h-screen vault-shell px-4 py-10"><div className="mx-auto max-w-lg space-y-6"><Link to="/" className="text-xs text-[#9da6b5]">Browse /</Link><section className="overflow-hidden rounded-2xl border border-[#303744] bg-[#171b23]">{preview && <img src={preview} alt={sku.canonicalName} className="aspect-square w-full object-contain" />}<div className="p-5"><p className="vault-micro">{offer.type === 'BUNDLE' ? 'Complete Color Collection' : 'Finished FlowVault timepiece'}</p><h1 className="mt-2 text-2xl text-white">{offer.name}</h1><p className="mt-2 text-xl text-[#e8d2a8]">${price.toFixed(2)}</p>{offer.includedSkuIds.length > 1 && <p className="mt-2 text-sm text-[#9da6b5]">Includes all {offer.includedSkuIds.length} color variants. Every compatible package will be delivered.</p>}</div></section><label className="block text-sm text-[#aeb6c3]">Watch device<select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className="mt-2 w-full rounded-lg border border-[#343b48] bg-[#11151d] p-3 text-white"><option value="">Choose your watch</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.brand} {device.name}</option>)}</select></label><label className="block text-sm text-[#aeb6c3]">Email (optional)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-[#343b48] bg-[#11151d] p-3 text-white" /></label><label className="flex gap-2 text-xs text-[#9da6b5]"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />I agree to the <Link to="/terms" className="underline">Terms, Privacy Policy, EULA, and Refund Policy</Link>.</label><button type="button" disabled={!deviceId || !agreed || busy} onClick={start} className="w-full rounded-xl bg-[#bc9456] p-3 font-semibold text-[#17120a] disabled:opacity-40">{busy ? 'Preparing…' : price === 0 ? 'Get device package' : 'Continue to Paddle'}</button>{message && <p className="text-sm text-[#e1b4a9]">{message}</p>}{downloads.length > 0 && <section className="space-y-2"><h2 className="text-lg text-white">Your device packages</h2>{downloads.map((item) => <a key={item.signedUrl} href={item.signedUrl} className="block rounded-lg border border-[#343b48] p-3 text-[#e8d2a8]">Download {item.canonicalName}</a>)}</section>}</div></main>;
}
function Status({ text }: { text: string }) { return <div className="grid min-h-screen place-items-center text-[#8e96a3]">{text}</div>; }
