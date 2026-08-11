import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.map', '.txt', '.xml', '.svg']);
const BLOCKED_PATTERNS = [
  { name: 'Paddle API key', pattern: /pdl_(?:sdbx|live)_apikey_[A-Za-z0-9_-]+/g },
  { name: 'Paddle webhook secret', pattern: /pdl_ntfset_[A-Za-z0-9_-]+/g },
  { name: 'GitHub personal access token', pattern: /(?:github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]{20,})/g },
  { name: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'service-account private key field', pattern: /["']private_key["']\s*:/g },
  { name: 'Firebase Admin service account', pattern: /["']client_email["']\s*:\s*["'][^"']+\.iam\.gserviceaccount\.com/g },
];

function walkFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const absolute = path.join(root, entry);
    if (statSync(absolute).isDirectory()) files.push(...walkFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

export function scanDirectoryForSecrets(root) {
  if (!existsSync(root)) throw new Error(`Build output does not exist: ${root}`);
  const files = walkFiles(root);
  const findings = [];
  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const content = readFileSync(file, 'utf8');
    for (const rule of BLOCKED_PATTERNS) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(content)) findings.push(`${path.relative(root, file)}: ${rule.name}`);
    }
  }
  if (findings.length) throw new Error(`Credential scan failed:\n${findings.map((item) => `- ${item}`).join('\n')}`);
  return { scannedRoot: root, fileCount: files.length };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = path.resolve(process.argv[2] || 'dist');
  try {
    const result = scanDirectoryForSecrets(root);
    console.log(`Credential scan passed: ${result.fileCount} files checked in ${root}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

