import { describe, expect, it } from 'vitest';
import { assertCheckoutConfigured, resolveFlowVaultConfig } from './flowVaultConfig';

const functionsBase = 'https://us-central1-zeppfaceloader-b0b106e9.cloudfunctions.net';

describe('FlowVault environment configuration', () => {
  it('accepts the staging Sandbox contract', () => {
    const config = resolveFlowVaultConfig({
      VITE_DEPLOY_ENVIRONMENT: 'staging',
      VITE_CHECKOUT_ENABLED: 'true',
      VITE_PADDLE_ENVIRONMENT: 'sandbox',
      VITE_PURCHASE_FUNCTIONS_BASE_URL: `${functionsBase}/`,
      VITE_PADDLE_CLIENT_TOKEN: 'test_browser_token',
    });

    expect(config).toEqual({
      environment: 'staging',
      checkoutEnabled: true,
      paddleEnvironment: 'sandbox',
      purchaseFunctionsBaseUrl: functionsBase,
      paddleClientToken: 'test_browser_token',
    });
    expect(() => assertCheckoutConfigured(config)).not.toThrow();
  });

  it('keeps the current production build on the disabled checkout setting', () => {
    const config = resolveFlowVaultConfig({
      VITE_DEPLOY_ENVIRONMENT: 'production',
      VITE_CHECKOUT_ENABLED: 'false',
      VITE_PADDLE_ENVIRONMENT: 'production',
      VITE_PURCHASE_FUNCTIONS_BASE_URL: functionsBase,
    });

    expect(config.checkoutEnabled).toBe(false);
    expect(config.paddleEnvironment).toBe('production');
    expect(() => assertCheckoutConfigured(config)).not.toThrow();
  });

  it('rejects Sandbox configuration in production', () => {
    expect(() => resolveFlowVaultConfig({
      VITE_DEPLOY_ENVIRONMENT: 'production',
      VITE_CHECKOUT_ENABLED: 'false',
      VITE_PADDLE_ENVIRONMENT: 'sandbox',
      VITE_PURCHASE_FUNCTIONS_BASE_URL: functionsBase,
    })).toThrow('Production must use Paddle production');
  });

  it('supports a later production launch through the same explicit switch', () => {
    const config = resolveFlowVaultConfig({
      VITE_DEPLOY_ENVIRONMENT: 'production',
      VITE_CHECKOUT_ENABLED: 'true',
      VITE_PADDLE_ENVIRONMENT: 'production',
      VITE_PURCHASE_FUNCTIONS_BASE_URL: functionsBase,
      VITE_PADDLE_CLIENT_TOKEN: 'live_browser_token',
    });

    expect(config.checkoutEnabled).toBe(true);
    expect(() => assertCheckoutConfigured(config)).not.toThrow();
  });

  it('requires a browser-safe client token only when checkout is enabled', () => {
    const config = resolveFlowVaultConfig({
      VITE_DEPLOY_ENVIRONMENT: 'staging',
      VITE_CHECKOUT_ENABLED: 'true',
      VITE_PADDLE_ENVIRONMENT: 'sandbox',
      VITE_PURCHASE_FUNCTIONS_BASE_URL: functionsBase,
    });

    expect(() => assertCheckoutConfigured(config)).toThrow('VITE_PADDLE_CLIENT_TOKEN is missing');
  });
});
