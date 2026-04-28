const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = REQUIRED_ENV_VARS.filter((key) => {
  const value = process.env[key];
  return typeof value !== 'string' || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error('[private-build-preflight] Missing required Firebase environment variables:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error('');
  console.error('Private bundle build blocked to prevent "Private Console Locked" deployment.');
  console.error('Set required VITE_FIREBASE_* vars, then rerun: npm run build:private');
  process.exit(1);
}

console.log('[private-build-preflight] Firebase env preflight OK.');
