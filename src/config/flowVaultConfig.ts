export type FlowVaultEnvironment = 'staging' | 'production';
export type PaddleEnvironment = 'sandbox' | 'production';

export interface FlowVaultConfig {
  environment: FlowVaultEnvironment;
  checkoutEnabled: boolean;
  paddleEnvironment: PaddleEnvironment;
  purchaseFunctionsBaseUrl: string;
  paddleClientToken?: string;
}

type PublicEnvironment = Record<string, string | undefined>;

function requiredChoice<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  key: string,
): T {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !allowed.includes(normalized as T)) {
    throw new Error(`${key} must be one of: ${allowed.join(', ')}`);
  }
  return normalized as T;
}

function requiredBoolean(value: string | undefined, key: string): boolean {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`${key} must be true or false`);
}

export function resolveFlowVaultConfig(env: PublicEnvironment): FlowVaultConfig {
  const environment = requiredChoice(
    env.VITE_DEPLOY_ENVIRONMENT,
    ['staging', 'production'] as const,
    'VITE_DEPLOY_ENVIRONMENT',
  );
  const paddleEnvironment = requiredChoice(
    env.VITE_PADDLE_ENVIRONMENT,
    ['sandbox', 'production'] as const,
    'VITE_PADDLE_ENVIRONMENT',
  );
  const checkoutEnabled = requiredBoolean(env.VITE_CHECKOUT_ENABLED, 'VITE_CHECKOUT_ENABLED');
  const purchaseFunctionsBaseUrl = (env.VITE_PURCHASE_FUNCTIONS_BASE_URL ?? '').trim().replace(/\/$/, '');
  const paddleClientToken = (env.VITE_PADDLE_CLIENT_TOKEN ?? '').trim() || undefined;

  if (!purchaseFunctionsBaseUrl) {
    throw new Error('VITE_PURCHASE_FUNCTIONS_BASE_URL is required');
  }
  if (environment === 'staging' && paddleEnvironment !== 'sandbox') {
    throw new Error('Staging must use Paddle Sandbox');
  }
  if (environment === 'production' && paddleEnvironment !== 'production') {
    throw new Error('Production must use Paddle production');
  }
  return {
    environment,
    checkoutEnabled,
    paddleEnvironment,
    purchaseFunctionsBaseUrl,
    ...(paddleClientToken ? { paddleClientToken } : {}),
  };
}

export function assertCheckoutConfigured(config: FlowVaultConfig): void {
  if (!config.checkoutEnabled) return;
  if (!config.paddleClientToken) {
    throw new Error('Checkout is enabled but VITE_PADDLE_CLIENT_TOKEN is missing');
  }
}

export function getFlowVaultConfig(): FlowVaultConfig {
  return resolveFlowVaultConfig(import.meta.env);
}
