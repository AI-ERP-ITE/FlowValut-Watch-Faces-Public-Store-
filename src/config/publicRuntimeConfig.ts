export interface PublicRuntimeConfig {
  schemaVersion: 1;
  environment: 'staging' | 'production';
  checkoutEnabled: boolean;
  paddleEnvironment: 'sandbox' | 'production';
  purchaseFunctionsBaseUrl: string;
  paddleClientToken?: string;
}

declare global {
  interface Window {
    __FLOWVAULT_RUNTIME_CONFIG__?: PublicRuntimeConfig;
  }
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__FLOWVAULT_RUNTIME_CONFIG__;
}

export function getPublicFunctionsBaseUrl(): string {
  const value = getPublicRuntimeConfig()?.purchaseFunctionsBaseUrl?.trim().replace(/\/$/, '');
  if (!value) throw new Error('Public Store runtime configuration is unavailable.');
  return value;
}

