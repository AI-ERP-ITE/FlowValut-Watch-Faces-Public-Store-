import { initializePaddle, type Paddle, type PaddleEventData } from '@paddle/paddle-js';
import { assertCheckoutConfigured, getFlowVaultConfig } from '@/config/flowVaultConfig';

let paddlePromise: Promise<Paddle | undefined> | null = null;
let checkoutLoadedResolver: (() => void) | null = null;
const checkoutCompletedResolvers = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
const PADDLE_INITIALIZATION_TIMEOUT_MS = 15_000;

export class PaddleCheckoutClosedError extends Error {
  constructor() {
    super('Checkout canceled — no payment was taken. You can change the pricing option and try again.');
    this.name = 'PaddleCheckoutClosedError';
  }
}

export function isPaddleCheckoutClosedError(error: unknown): error is PaddleCheckoutClosedError {
  return error instanceof PaddleCheckoutClosedError;
}

function handlePaddleEvent(event: PaddleEventData): void {
  if (event.name === 'checkout.loaded') {
    checkoutLoadedResolver?.();
    checkoutLoadedResolver = null;
  }
  if (event.name === 'checkout.completed') {
    const transactionId = event.data?.transaction_id;
    if (transactionId) {
      checkoutCompletedResolvers.get(transactionId)?.resolve();
      checkoutCompletedResolvers.delete(transactionId);
    }
    window.setTimeout(() => void paddlePromise?.then((instance) => instance?.Checkout.close()), 1200);
  }
  if (event.name === 'checkout.closed') {
    const transactionId = event.data?.transaction_id;
    if (transactionId) {
      checkoutCompletedResolvers.get(transactionId)?.reject(new PaddleCheckoutClosedError());
      checkoutCompletedResolvers.delete(transactionId);
    }
  }
}

function withInitializationTimeout(promise: Promise<Paddle | undefined>): Promise<Paddle | undefined> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('Paddle Checkout took too long to load. Please refresh and try again.')),
      PADDLE_INITIALIZATION_TIMEOUT_MS,
    );
    promise.then(
      (value) => { window.clearTimeout(timeout); resolve(value); },
      (error) => { window.clearTimeout(timeout); reject(error); },
    );
  });
}

async function getPaddle(): Promise<Paddle> {
  const config = getFlowVaultConfig();
  assertCheckoutConfigured(config);
  if (!config.checkoutEnabled) throw new Error('Checkout is currently unavailable');

  if (!paddlePromise) {
    const options = config.paddleEnvironment === 'sandbox'
      ? {
          environment: 'sandbox' as const,
          token: config.paddleClientToken!,
          eventCallback: handlePaddleEvent,
        }
      : {
          token: config.paddleClientToken!,
          eventCallback: handlePaddleEvent,
        };
    paddlePromise = withInitializationTimeout(initializePaddle(options));
  }

  let paddle: Paddle | undefined;
  try {
    paddle = await paddlePromise;
  } catch (error) {
    paddlePromise = null;
    throw error;
  }
  if (!paddle) {
    paddlePromise = null;
    throw new Error('Paddle Checkout could not be initialized');
  }
  return paddle;
}

export async function preparePaddleCheckout(): Promise<void> {
  await getPaddle();
}

export function waitForPaddleCheckoutCompletion(transactionId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    checkoutCompletedResolvers.set(transactionId, { resolve, reject });
    window.setTimeout(() => {
      if (!checkoutCompletedResolvers.has(transactionId)) return;
      checkoutCompletedResolvers.delete(transactionId);
      reject(new Error('Paddle Checkout completion was not received.'));
    }, 10 * 60_000);
  });
}

export async function openPaddleTransaction(transactionId: string, options: { allowVipCode?: boolean } = {}): Promise<void> {
  if (!transactionId.trim()) throw new Error('Missing Paddle transaction ID');
  const paddle = await getPaddle();
  const loaded = new Promise<void>((resolve, reject) => {
    checkoutLoadedResolver = resolve;
    window.setTimeout(() => {
      if (!checkoutLoadedResolver) return;
      checkoutLoadedResolver = null;
      reject(new Error('Paddle Checkout did not open.'));
    }, 5_000);
  });
  paddle.Checkout.open({
    transactionId,
    settings: {
      displayMode: 'overlay',
      variant: 'one-page',
      theme: 'dark',
      showAddDiscounts: options.allowVipCode === true,
      allowDiscountRemoval: options.allowVipCode === true,
    },
  });
  await loaded;
}
