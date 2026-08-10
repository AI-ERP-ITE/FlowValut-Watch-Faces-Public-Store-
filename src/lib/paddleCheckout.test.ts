import { beforeAll, describe, expect, it, vi } from 'vitest';

const paddleMock = vi.hoisted(() => ({
  eventCallback: null as ((event: { name: string; data?: { transaction_id?: string } }) => void) | null,
  initialize: vi.fn(async (options: { eventCallback: typeof paddleMock.eventCallback }) => {
    paddleMock.eventCallback = options.eventCallback;
    return { Checkout: { open: vi.fn(), close: vi.fn() } };
  }),
}));

vi.mock('@paddle/paddle-js', () => ({ initializePaddle: paddleMock.initialize }));

import {
  isPaddleCheckoutClosedError,
  preparePaddleCheckout,
  waitForPaddleCheckoutCompletion,
} from './paddleCheckout';

beforeAll(async () => {
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  vi.stubEnv('VITE_DEPLOY_ENVIRONMENT', 'staging');
  vi.stubEnv('VITE_CHECKOUT_ENABLED', 'true');
  vi.stubEnv('VITE_PADDLE_ENVIRONMENT', 'sandbox');
  vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', 'test_browser_token');
  vi.stubEnv('VITE_PURCHASE_FUNCTIONS_BASE_URL', 'https://example.invalid');
  await preparePaddleCheckout();
});

describe('Paddle checkout terminal events', () => {
  it('resolves the matching transaction when checkout completes', async () => {
    const completion = waitForPaddleCheckoutCompletion('txn_completed');
    paddleMock.eventCallback?.({ name: 'checkout.completed', data: { transaction_id: 'txn_completed' } });
    await expect(completion).resolves.toBeUndefined();
  });

  it('rejects the matching transaction when the buyer closes checkout', async () => {
    const completion = waitForPaddleCheckoutCompletion('txn_closed');
    paddleMock.eventCallback?.({ name: 'checkout.closed', data: { transaction_id: 'txn_closed' } });
    await expect(completion).rejects.toSatisfy(isPaddleCheckoutClosedError);
  });
});
