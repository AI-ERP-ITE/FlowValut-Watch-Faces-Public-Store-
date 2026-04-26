import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(process.cwd());

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseline: '', candidate: '' };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--baseline' && args[i + 1]) {
      out.baseline = path.resolve(args[++i]);
      continue;
    }
    if (args[i] === '--candidate' && args[i + 1]) {
      out.candidate = path.resolve(args[++i]);
      continue;
    }
    positional.push(args[i]);
  }
  if (positional[0]) out.baseline = path.resolve(positional[0]);
  if (positional[1]) out.candidate = path.resolve(positional[1]);
  return out;
}

function pickDefaultExtractedRoots() {
  const extractedRoot = path.resolve(
    ROOT,
    'specs/032-device-parity-root-cause/investigation/evidence/extracted',
  );
  const latest = path.join(extractedRoot, 'latest');

  if (!fs.existsSync(extractedRoot) || !fs.existsSync(latest)) {
    return { baseline: '', candidate: '' };
  }

  const candidates = fs
    .readdirSync(extractedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'latest')
    .map((entry) => {
      const fullPath = path.join(extractedRoot, entry.name);
      const stat = fs.statSync(fullPath);
      return { name: entry.name, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const baseline = candidates[0]?.fullPath ?? latest;
  return { baseline, candidate: latest };
}

function hashFile(file) {
  const data = fs.readFileSync(file);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function resolveExtractedFile(rootDir, rel) {
  const probes = [
    path.join(rootDir, rel),
    path.join(rootDir, 'device', rel),
    path.join(rootDir, 'outer', rel),
  ];
  return probes.find((candidate) => fs.existsSync(candidate)) || '';
}

function compareFile(rel, baselineRoot, candidateRoot) {
  const a = resolveExtractedFile(baselineRoot, rel);
  const b = resolveExtractedFile(candidateRoot, rel);
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    return { file: rel, pass: false, reason: 'missing in baseline or candidate' };
  }
  const ha = hashFile(a);
  const hb = hashFile(b);
  return { file: rel, pass: ha === hb, baselineHash: ha, candidateHash: hb };
}

const args = parseArgs();
if (!args.baseline || !args.candidate) {
  const fallback = pickDefaultExtractedRoots();
  args.baseline = args.baseline || fallback.baseline;
  args.candidate = args.candidate || fallback.candidate;
}
if (!args.baseline || !args.candidate) {
  console.error('Usage: node scripts/checkInstrumentationNonIntrusive.mjs --baseline <path> --candidate <path>');
  process.exit(2);
}

const checks = [
  compareFile('app.json', args.baseline, args.candidate),
  compareFile(path.join('watchface', 'index.js'), args.baseline, args.candidate),
];

const pass = checks.every((c) => c.pass);
const result = { baseline: path.relative(ROOT, args.baseline), candidate: path.relative(ROOT, args.candidate), pass, checks };
console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
