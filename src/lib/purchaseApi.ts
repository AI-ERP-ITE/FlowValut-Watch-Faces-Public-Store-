const PURCHASE_BASE_URL = (import.meta.env.VITE_PURCHASE_FUNCTIONS_BASE_URL as string | undefined)?.trim();

export interface PaddlePaidStartResponse {
  type: 'paid';
  provider: 'paddle';
  orderId: string;
  paddleTransactionId: string;
  checkoutUrl?: string | null;
  regenerationKey: string;
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

function requirePurchaseBaseUrl(): string {
  if (!PURCHASE_BASE_URL) {
    throw new Error('Purchase backend is not configured. Missing VITE_PURCHASE_FUNCTIONS_BASE_URL.');
  }
  return PURCHASE_BASE_URL.replace(/\/$/, '');
}

export async function createPaddleCheckout(watchfaceId: string, email?: string): Promise<PurchaseStartResponse> {
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

export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  const base = requirePurchaseBaseUrl();

  const endpoint = `${base}/orderStatus?orderId=${encodeURIComponent(orderId)}`;
  const response = await fetch(endpoint, { method: 'GET' });

  const payload = (await response.json().catch(() => null)) as
    | OrderStatusResponse
    | { error?: string }
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
    const message = payload && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `Capture request failed (${response.status})`;
    throw new Error(message);
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
