import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const DEFAULT_MATRIX = path.join(ROOT, 'specs', '032-device-parity-root-cause', 'investigation', 'device-matrix-filled.csv');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { matrix: DEFAULT_MATRIX, report: '' };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--matrix' && args[i + 1]) {
      out.matrix = path.resolve(args[++i]);
      continue;
    }
    if (args[i] === '--report' && args[i + 1]) {
      out.report = path.resolve(args[++i]);
      continue;
    }
    positional.push(args[i]);
  }
  if (positional[0]) out.matrix = path.resolve(positional[0]);
  if (positional[1]) out.report = path.resolve(positional[1]);
  return out;
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? '').trim();
    });
    return row;
  });
}

function groupCount(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function toReport(result) {
  const lines = [];
  lines.push('# Run Minimums Report');
  lines.push('');
  lines.push(`- matrix: ${result.matrix}`);
  lines.push(`- engraveGroups: ${result.engrave.groups}`);
  lines.push(`- pointerGroups: ${result.pointer.groups}`);
  lines.push(`- pass: ${result.pass}`);
  lines.push('');
  lines.push('## Engrave Group Counts (>=5)');
  for (const item of result.engrave.details) {
    lines.push(`- ${item.key}: ${item.count} (${item.pass ? 'pass' : 'fail'})`);
  }
  lines.push('');
  lines.push('## Pointer Pattern Counts (>=10)');
  for (const item of result.pointer.details) {
    lines.push(`- ${item.key}: ${item.count} (${item.pass ? 'pass' : 'fail'})`);
  }
  lines.push('');
  return lines.join('\n');
}

const args = parseArgs();
if (!fs.existsSync(args.matrix)) {
  console.error(`Matrix file not found: ${args.matrix}`);
  process.exit(2);
}

const rows = parseCsv(fs.readFileSync(args.matrix, 'utf8'));
const engraveRows = rows.filter((r) => r.issueFocus === 'engrave');
const pointerRows = rows.filter((r) => r.issueFocus === 'pointer');

const engraveCounts = groupCount(
  engraveRows,
  (r) => `${r.fixtureId}|${r.deviceModel}|${r.launchCondition}|${r.transitionPhase}`
);
const pointerCounts = groupCount(
  pointerRows,
  (r) => `${r.handPackPattern || 'unknown-pattern'}`
);

const engraveDetails = [...engraveCounts.entries()].map(([key, count]) => ({
  key,
  count,
  pass: count >= 5,
}));
const pointerDetails = [...pointerCounts.entries()].map(([key, count]) => ({
  key,
  count,
  pass: count >= 10,
}));

const pass = engraveDetails.every((x) => x.pass) && pointerDetails.every((x) => x.pass) && engraveDetails.length > 0 && pointerDetails.length > 0;

const result = {
  matrix: args.matrix,
  pass,
  engrave: {
    groups: engraveDetails.length,
    details: engraveDetails,
  },
  pointer: {
    groups: pointerDetails.length,
    details: pointerDetails,
  },
};

if (args.report) {
  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.writeFileSync(args.report, toReport(result), 'utf8');
}

console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
