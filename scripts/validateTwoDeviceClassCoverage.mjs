import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const DEFAULT_MATRIX = path.join(ROOT, 'specs', '032-device-parity-root-cause', 'investigation', 'device-matrix-filled.csv');
const REQUIRED_CONDITIONS = ['fresh_launch', 'resume', 'repeated_cycle'];

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

function byClass(rows, cls) {
  return rows.filter((r) => (r.deviceClass || '').toLowerCase() === cls);
}

function conditionsPresent(rows) {
  return new Set(rows.map((r) => r.launchCondition).filter(Boolean));
}

function toReport(result) {
  const lines = [];
  lines.push('# Device Coverage Gate Report');
  lines.push('');
  lines.push(`- matrix: ${result.matrix}`);
  lines.push(`- primaryRows: ${result.primary.rows}`);
  lines.push(`- secondaryRows: ${result.secondary.rows}`);
  lines.push(`- pass: ${result.pass}`);
  lines.push('');
  lines.push('## Primary Launch Conditions');
  for (const c of REQUIRED_CONDITIONS) {
    lines.push(`- ${c}: ${result.primary.conditions.has(c) ? 'present' : 'missing'}`);
  }
  lines.push('');
  lines.push('## Secondary Launch Conditions');
  for (const c of REQUIRED_CONDITIONS) {
    lines.push(`- ${c}: ${result.secondary.conditions.has(c) ? 'present' : 'missing'}`);
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
const primaryRows = byClass(rows, 'primary');
const secondaryRows = byClass(rows, 'secondary');

const primaryConditions = conditionsPresent(primaryRows);
const secondaryConditions = conditionsPresent(secondaryRows);

const pass =
  primaryRows.length > 0 &&
  secondaryRows.length > 0 &&
  REQUIRED_CONDITIONS.every((c) => primaryConditions.has(c)) &&
  REQUIRED_CONDITIONS.every((c) => secondaryConditions.has(c));

const result = {
  matrix: args.matrix,
  primary: {
    rows: primaryRows.length,
    conditions: [...primaryConditions],
  },
  secondary: {
    rows: secondaryRows.length,
    conditions: [...secondaryConditions],
  },
  pass,
};

if (args.report) {
  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.writeFileSync(args.report, toReport({ ...result, primary: { ...result.primary, conditions: primaryConditions }, secondary: { ...result.secondary, conditions: secondaryConditions } }), 'utf8');
}

console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
