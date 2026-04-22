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

function writeReport(file, lines) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

const args = parseArgs();
const appJsonPath = path.join(args.extracted, 'app.json');
const watchfacePath = path.join(args.extracted, 'watchface', 'index.js');

const checks = [];
let pass = true;

checks.push({ id: 'app.json.exists', pass: fs.existsSync(appJsonPath) });
checks.push({ id: 'watchface.index.exists', pass: fs.existsSync(watchfacePath) });

let appJson = null;
if (fs.existsSync(appJsonPath)) {
  try {
    appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    checks.push({ id: 'app.json.validJson', pass: true });
    checks.push({ id: 'app.json.configVersion.v3', pass: appJson.configVersion === 'v3' });
    checks.push({ id: 'app.json.targets.default.module.watchface', pass: !!appJson?.targets?.default?.module?.watchface?.path });
  } catch {
    checks.push({ id: 'app.json.validJson', pass: false });
  }
}

if (fs.existsSync(watchfacePath)) {
  const code = fs.readFileSync(watchfacePath, 'utf8');
  checks.push({ id: 'watchface.contains.timePointer', pass: /TIME_POINTER/.test(code) });
  checks.push({ id: 'watchface.contains.pxWrapper', pass: /px\(/.test(code) });
  checks.push({ id: 'watchface.contains.assetsRefs', pass: /assets\//.test(code) });

  const hourPath = /hour_path:\s*'([^']+)'/.exec(code)?.[1]
    ?? /hour\s*:\s*\{[^}]*path:\s*'([^']+)'/.exec(code)?.[1];
  const minutePath = /minute_path:\s*'([^']+)'/.exec(code)?.[1]
    ?? /minute\s*:\s*\{[^}]*path:\s*'([^']+)'/.exec(code)?.[1];
  const secondPath = /second_path:\s*'([^']+)'/.exec(code)?.[1]
    ?? /second\s*:\s*\{[^}]*path:\s*'([^']+)'/.exec(code)?.[1];
  const coverPath = /hour_cover_path:\s*'([^']+)'/.exec(code)?.[1];

  checks.push({ id: 'timePointer.hourPath.assetsPrefix', pass: !!hourPath && hourPath.startsWith('assets/') });
  checks.push({ id: 'timePointer.minutePath.assetsPrefix', pass: !!minutePath && minutePath.startsWith('assets/') });
  checks.push({ id: 'timePointer.secondPath.assetsPrefix', pass: !secondPath || secondPath.startsWith('assets/') });
  checks.push({ id: 'timePointer.coverOptional', pass: !/hour_cover_path/.test(code) || (!!coverPath && coverPath.startsWith('assets/')) });

  const requiredPointerAssets = [hourPath, minutePath, secondPath, coverPath]
    .filter(Boolean)
    .map((ref) => path.join(args.extracted, ref));
  const allPointerAssetsPresent = requiredPointerAssets.every((assetPath) => fs.existsSync(assetPath));
  checks.push({ id: 'timePointer.referencedAssets.exist', pass: allPointerAssetsPresent });
}

for (const c of checks) {
  if (!c.pass) pass = false;
}

const result = { extracted: args.extracted, pass, checks };
if (args.report) {
  const lines = ['# ZPK Parity Validation Report', '', `- extracted: ${args.extracted}`, `- pass: ${pass}`, ''];
  for (const c of checks) lines.push(`- ${c.id}: ${c.pass ? 'pass' : 'fail'}`);
  writeReport(args.report, lines);
}

console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
