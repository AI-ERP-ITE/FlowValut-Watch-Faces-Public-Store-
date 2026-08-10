import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOfferCheckout, createPaddleCheckout, DOWNLOAD_ALLOWANCE_EXHAUSTED_MESSAGE, fulfillEntitlement, INITIAL_DOWNLOAD_ALLOWANCE_USED_MESSAGE, isInitialDownloadAllowanceUsedError, regenerateDownload } from './purchaseApi';

function setProductionCheckoutDisabled() {
  vi.stubEnv('VITE_DEPLOY_ENVIRONMENT', 'production');
  vi.stubEnv('VITE_CHECKOUT_ENABLED', 'false');
  vi.stubEnv('VITE_PADDLE_ENVIRONMENT', 'production');
  vi.stubEnv('VITE_PURCHASE_FUNCTIONS_BASE_URL', 'https://example.invalid');
}

function setStaging() {
  vi.stubEnv('VITE_DEPLOY_ENVIRONMENT', 'staging');
  vi.stubEnv('VITE_CHECKOUT_ENABLED', 'true');
  vi.stubEnv('VITE_PADDLE_ENVIRONMENT', 'sandbox');
  vi.stubEnv('VITE_PURCHASE_FUNCTIONS_BASE_URL', 'https://staging.example.invalid');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('production checkout kill switch', () => {
  it('blocks legacy checkout before any network request', async () => {
    setProductionCheckoutDisabled();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(createPaddleCheckout('face-1')).rejects.toThrow('Purchasing is coming soon');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks Offer checkout before any network request', async () => {
    setProductionCheckoutDisabled();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(createOfferCheckout('offer-1', 'device-1')).rejects.toThrow('Purchasing is coming soon');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('download allowance errors', () => {
  it('distinguishes completed initial transfers from lifetime exhaustion', async () => {
    setStaging();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'INITIAL_DOWNLOAD_ALLOWANCE_USED',
      recoveryAvailable: true,
    }), { status: 403, headers: { 'Content-Type': 'application/json' } })));

    const error = await fulfillEntitlement('token', 'device').catch((caught) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(INITIAL_DOWNLOAD_ALLOWANCE_USED_MESSAGE);
    expect(isInitialDownloadAllowanceUsedError(error)).toBe(true);
  });

  it('turns an exhausted fulfillment response into customer-facing guidance', async () => {
    setStaging();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'DOWNLOAD_ALLOWANCE_EXHAUSTED',
      message: 'All download transfers for this purchase have been used.',
    }), { status: 403, headers: { 'Content-Type': 'application/json' } })));

    await expect(fulfillEntitlement('token', 'device')).rejects.toThrow(DOWNLOAD_ALLOWANCE_EXHAUSTED_MESSAGE);
  });

  it('uses the same guidance after the one recovery regeneration is consumed', async () => {
    setStaging();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'Regeneration limit reached',
    }), { status: 403, headers: { 'Content-Type': 'application/json' } })));

    await expect(regenerateDownload({ regenerationKey: 'recovery-key' })).rejects.toThrow(DOWNLOAD_ALLOWANCE_EXHAUSTED_MESSAGE);
  });
});
