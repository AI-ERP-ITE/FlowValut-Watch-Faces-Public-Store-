import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return [];
    const index = trimmed.indexOf('=');
    return [[trimmed.slice(0, index), trimmed.slice(index + 1).trim()]];
  }));
}

export function writePublicRuntimeConfig({ appRoot, distRoot, target }) {
  const mode = target === 'production' ? 'public' : 'staging';
  const values = {
    ...parseEnvFile(path.join(appRoot, `.env.${mode}`)),
    ...parseEnvFile(path.join(appRoot, `.env.${mode}.local`)),
    ...process.env,
  };
  const environment = target;
  const paddleEnvironment = target === 'production' ? 'production' : 'sandbox';
  const purchaseFunctionsBaseUrl = (values.VITE_PURCHASE_FUNCTIONS_BASE_URL || values.VITE_FIREBASE_FUNCTIONS_BASE_URL || '').replace(/\/$/, '');
  const checkoutEnabled = values.VITE_CHECKOUT_ENABLED === 'true';
  const paddleClientToken = (values.VITE_PADDLE_CLIENT_TOKEN || '').trim();
  if (!purchaseFunctionsBaseUrl) throw new Error(`Missing ${target} Public Store Functions origin`);
  if (checkoutEnabled && !paddleClientToken) throw new Error(`${target} checkout is enabled but its browser token is missing`);
  const config = {
    schemaVersion: 1,
    environment,
    checkoutEnabled,
    paddleEnvironment,
    purchaseFunctionsBaseUrl,
    ...(paddleClientToken ? { paddleClientToken } : {}),
  };
  writeFileSync(
    path.join(distRoot, 'flowvault-runtime-config.js'),
    `window.__FLOWVAULT_RUNTIME_CONFIG__ = Object.freeze(${JSON.stringify(config)});\n`,
    'utf8',
  );
}

