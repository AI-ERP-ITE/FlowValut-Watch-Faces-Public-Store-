import { getFlowVaultConfig } from '@/config/flowVaultConfig';

export interface PaddlePaidStartResponse {
  type: 'paid';
  provider: 'paddle';
  orderId: string;
  paddleTransactionId: string;
  checkoutUrl?: string | null;
  regenerationKey: string;
  pricingMode?: 'CAMPAIGN' | 'VIP_STANDARD';
}

export interface SimulatedStartResponse {
  type: 'simulated';
  downloadUrl: string;
  finalPrice: number;
  orderId: string;
}

export type PurchaseStartResponse =
  | SimulatedStartResponse
  | { type: 'free'; provider: 'paddle'; orderId: string; token: string | null; regenerationKey: string }
  | PaddlePaidStartResponse;

export type OrderStatusResponse =
  | { status: 'pending' }
  | { status: 'failed' }
  | { status: 'refunded' }
  | { status: 'paid_confirmed'; token: string };

export interface DownloadResponse {
  signedUrl: string;
}

export interface OfferCheckoutResponse {
  type: 'free' | 'paid'; provider: 'paddle'; orderId: string; token?: string | null;
  paddleTransactionId?: string; checkoutUrl?: string | null; regenerationKey: string;
  offerSnapshot: { offerId: string; name: string; type: 'SKU' | 'BUNDLE'; includedSkuIds: string[]; chargedPrice: number; currency: 'USD' };
}

export interface EntitlementFulfillmentResponse {
  orderId: string; offerId: string; deviceId: string; technicalTargetId: string; completeColorCollection: boolean;
  packages: Array<{ packageId: string; skuId: string; revision: string; canonicalName: string; signedUrl: string }>;
}

export interface ConfirmOfferPaymentResponse {
  status: 'pending' | 'paid_confirmed';
  token?: string;
}

export const DOWNLOAD_ALLOWANCE_EXHAUSTED_MESSAGE = 'This purchase has used all three permitted transfers: two initial transfers and one final recovery transfer. The ZPK download and QR installation are no longer available.';

const DOWNLOAD_ALLOWANCE_ERROR_CODES = new Set([
  'DOWNLOAD_ALLOWANCE_EXHAUSTED',
  'DOWNLOAD_LIMIT_REACHED',
  'Download limit reached',
  'Regeneration limit reached',
]);

function backendErrorMessage(payload: { error?: string; message?: string } | null, fallback: string): string {
  if (payload?.error && DOWNLOAD_ALLOWANCE_ERROR_CODES.has(payload.error)) return DOWNLOAD_ALLOWANCE_EXHAUSTED_MESSAGE;
  return payload?.message || payload?.error || fallback;
}

export function isDownloadAllowanceExhaustedError(error: unknown): boolean {
  return error instanceof Error && error.message === DOWNLOAD_ALLOWANCE_EXHAUSTED_MESSAGE;
}

function requirePurchaseBaseUrl(): string {
  return getFlowVaultConfig().purchaseFunctionsBaseUrl;
}

function requireCheckoutEnabled(): void {
  if (!getFlowVaultConfig().checkoutEnabled) {
    throw new Error('Purchasing is coming soon. Checkout is currently unavailable.');
  }
}

export async function createPaddleCheckout(watchfaceId: string, email?: string): Promise<PurchaseStartResponse> {
  requireCheckoutEnabled();
  const base = requirePurchaseBaseUrl();

  const endpoint = `${base}/createOrderOrCheckout`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ watchfaceId, ...(email ? { email } : {}) }),
  });

  const payload = (await response.json().catch(() => null)) as
    | PurchaseStartResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    const message = payload && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `Purchase request failed (${response.status})`;
    throw new Error(message);
  }

  if (!payload || typeof payload !== 'object' || !('type' in payload)) {
    throw new Error('Invalid purchase response from backend');
  }

  if (
    payload.type === 'simulated' &&
    'downloadUrl' in payload &&
    typeof payload.downloadUrl === 'string' &&
    'finalPrice' in payload &&
    typeof payload.finalPrice === 'number' &&
    'orderId' in payload &&
    typeof payload.orderId === 'string'
  ) {
    return payload as SimulatedStartResponse;
  }

  if (
    payload.type === 'paid' &&
    'provider' in payload &&
    payload.provider === 'paddle' &&
    typeof payload.orderId === 'string' &&
    typeof payload.paddleTransactionId === 'string' &&
    typeof payload.regenerationKey === 'string'
  ) {
    return payload as PaddlePaidStartResponse;
  }

  if (
    payload.type === 'free' &&
    'provider' in payload &&
    payload.provider === 'paddle' &&
    typeof payload.orderId === 'string' &&
    'token' in payload &&
    typeof payload.regenerationKey === 'string'
  ) {
    return payload as PurchaseStartResponse;
  }

  throw new Error('Invalid checkout response from backend');
}

export async function createOfferCheckout(offerId: string, deviceId: string, email?: string, pricingMode: 'CAMPAIGN' | 'VIP_STANDARD' = 'CAMPAIGN'): Promise<OfferCheckoutResponse> {
  requireCheckoutEnabled();
  const environment = getFlowVaultConfig().environment;
  const endpoint = environment === 'staging' ? 'createSandboxOfferCheckout' : 'createLiveOfferCheckout';
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    response = await fetch(`${requirePurchaseBaseUrl()}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offerId, deviceId, pricingMode, ...(email ? { email } : {}) }), signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Checkout preparation timed out. Please try again.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => null) as OfferCheckoutResponse | { error?: string } | null;
  if (!response.ok) throw new Error(payload && 'error' in payload && payload.error ? payload.error : `Offer checkout failed (${response.status})`);
  if (!payload || !('type' in payload) || !('offerSnapshot' in payload)) throw new Error('Invalid Offer checkout response');
  return payload;
}

export async function fulfillEntitlement(token: string, deviceId: string): Promise<EntitlementFulfillmentResponse> {
  const response = await fetch(`${requirePurchaseBaseUrl()}/fulfillEntitlement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, deviceId }) });
  const payload = await response.json().catch(() => null) as EntitlementFulfillmentResponse | { error?: string; message?: string } | null;
  if (!response.ok) throw new Error(backendErrorMessage(payload && !('packages' in payload) ? payload : null, `Fulfillment failed (${response.status})`));
  if (!payload || !('packages' in payload) || !Array.isArray(payload.packages)) throw new Error('Invalid fulfillment response');
  return payload;
}

export async function confirmOfferPayment(orderId: string): Promise<ConfirmOfferPaymentResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${requirePurchaseBaseUrl()}/confirmSandboxOfferPayment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as ConfirmOfferPaymentResponse | { error?: string } | null;
    if (!response.ok) throw new Error(payload && 'error' in payload && payload.error ? payload.error : `Payment confirmation failed (${response.status})`);
    if (!payload || !('status' in payload) || (payload.status !== 'pending' && payload.status !== 'paid_confirmed')) {
      throw new Error('Invalid payment confirmation response');
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  const base = requirePurchaseBaseUrl();

  const endpoint = `${base}/orderStatus?orderId=${encodeURIComponent(orderId)}`;
  const response = await fetch(endpoint, { method: 'GET' });

  const payload = (await response.json().catch(() => null)) as
    | OrderStatusResponse
    | { error?: string; message?: string }
    | null;

  if (!response.ok) {
    const message = payload && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `Order status request failed (${response.status})`;
    throw new Error(message);
  }

  if (!payload || typeof payload !== 'object' || !('status' in payload)) {
    throw new Error('Invalid order status response');
  }

  if (
    payload.status === 'pending' ||
    payload.status === 'failed' ||
    payload.status === 'refunded'
  ) {
    return payload;
  }

  if (payload.status === 'paid_confirmed' && 'token' in payload && typeof payload.token === 'string') {
    return payload;
  }

  throw new Error('Invalid order status response');
}

export async function requestDownload(token: string): Promise<DownloadResponse> {
  const base = requirePurchaseBaseUrl();

  const endpoint = `${base}/download?token=${encodeURIComponent(token)}`;
  const response = await fetch(endpoint, { method: 'GET' });

  const payload = (await response.json().catch(() => null)) as
    | DownloadResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    const message = payload && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `Download request failed (${response.status})`;
    throw new Error(message);
  }

  if (!payload || typeof payload !== 'object' || !('signedUrl' in payload) || typeof payload.signedUrl !== 'string') {
    throw new Error('Invalid download response');
  }

  return payload;
}

export async function regenerateDownload(input: {
  orderId?: string;
  email?: string;
  regenerationKey?: string;
}): Promise<{ token: string }> {
  const base = requirePurchaseBaseUrl();

  const endpoint = `${base}/regenerateDownload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | { token?: string }
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(backendErrorMessage(payload && 'error' in payload ? payload : null, `Recovery request failed (${response.status})`));
  }

  if (!payload || typeof payload !== 'object' || !('token' in payload) || typeof payload.token !== 'string') {
    throw new Error('Invalid regenerate response from backend');
  }

  return { token: payload.token };
}

export async function createOrderOrCheckout(watchfaceId: string): Promise<PurchaseStartResponse> {
  return createPaddleCheckout(watchfaceId);
}

export async function capturePayPalOrder(): Promise<never> {
  throw new Error('PayPal provider is disabled');
}
