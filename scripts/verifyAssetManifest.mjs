import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const DEFAULT_EXTRACTED = path.join(ROOT, 'specs', '032-device-parity-root-cause', 'investigation', 'evidence', 'extracted', 'latest');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { extracted: DEFAULT_EXTRACTED, report: '' };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--extracted' && args[i + 1]) {
      out.extracted = path.resolve(args[++i]);
      continue;
    }
    if (args[i] === '--report' && args[i + 1]) {
      out.report = path.resolve(args[++i]);
      continue;
    }
    positional.push(args[i]);
  }
  if (positional[0]) out.extracted = path.resolve(positional[0]);
  if (positional[1]) out.report = path.resolve(positional[1]);
  return out;
}

function collectAssetRefs(code) {
  const re = /assets\/[^'\"\s)]+/g;
  return [...new Set(code.match(re) ?? [])];
}

const args = parseArgs();
const watchfacePath = path.join(args.extracted, 'watchface', 'index.js');
if (!fs.existsSync(watchfacePath)) {
  console.error(`Missing watchface index: ${watchfacePath}`);
  process.exit(2);
}

const code = fs.readFileSync(watchfacePath, 'utf8');
const refs = collectAssetRefs(code);
const missing = refs.filter((ref) => !fs.existsSync(path.join(args.extracted, ref)));
const pass = missing.length === 0;

const result = {
  extracted: args.extracted,
  referencedAssetCount: refs.length,
  missingAssetCount: missing.length,
  missing,
  pass,
};

if (args.report) {
  const lines = ['# Asset Manifest Report', '', `- extracted: ${args.extracted}`, `- referencedAssetCount: ${refs.length}`, `- missingAssetCount: ${missing.length}`, `- pass: ${pass}`, ''];
  if (missing.length > 0) {
    lines.push('## Missing Assets');
    for (const m of missing) lines.push(`- ${m}`);
  }
  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.writeFileSync(args.report, lines.join('\n'), 'utf8');
}

console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
