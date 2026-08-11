import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(appRoot, '..');
const productionProject = 'zeppfaceloader-b0b106e9';
const stagingProject = 'flowvault-staging-2026';

function read(relativePath) {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

const stagingEnv = read('app/.env.staging');
const publicEnv = read('app/.env.public');
const stagingFunctionsEnv = read('firebase/functions/.env.flowvault-staging-2026');
const productionFunctionsEnv = read('firebase/functions/.env.zeppfaceloader-b0b106e9');
const stagingDeploy = read('app/scripts/deployStaging.mjs');

const assertions = [
  [stagingEnv.includes(stagingProject) && !stagingEnv.includes(productionProject), 'staging frontend must use only the staging Firebase project'],
  [publicEnv.includes(productionProject) && !publicEnv.includes(stagingProject), 'public frontend must use only the production Firebase project'],
  [stagingFunctionsEnv.includes('PADDLE_LIVE_CHECKOUT_ENABLED=false'), 'staging must disable live Paddle checkout'],
  [stagingFunctionsEnv.includes(`PURCHASE_FUNCTIONS_BASE_URL=https://us-central1-${stagingProject}.cloudfunctions.net`), 'staging backend base must match staging project'],
  [productionFunctionsEnv.includes(`PURCHASE_FUNCTIONS_BASE_URL=https://us-central1-${productionProject}.cloudfunctions.net`), 'production backend base must match production project'],
  [stagingDeploy.includes(`const projectId = '${stagingProject}'`) && stagingDeploy.includes("firebase.staging.json"), 'staging deploy must hard-code the isolated project and config'],
];

const failures = assertions.filter(([pass]) => !pass).map(([, message]) => message);
if (failures.length) throw new Error(`Environment separation failed:\n- ${failures.join('\n- ')}`);
console.log('Environment separation verified: staging and production Firebase/Paddle targets are isolated.');
