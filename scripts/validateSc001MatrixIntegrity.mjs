import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const DEFAULT_PLANNED = path.join(ROOT, 'specs', '032-device-parity-root-cause', 'investigation', 'templates', 'device-matrix.csv');
const DEFAULT_ACTUAL = path.join(ROOT, 'specs', '032-device-parity-root-cause', 'investigation', 'device-matrix-filled.csv');

const MANDATORY_FIELDS = [
  'matrixRowId',
  'issueFocus',
  'fixtureId',
  'deviceClass',
  'deviceModel',
  'firmwareVersion',
  'launchCondition',
  'transitionPhase',
  'runIndex',
  'observedResult',
  'measuredDeltaOrFailureRate',
  'evidenceRefIds',
  'operator',
  'executedAt',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { planned: DEFAULT_PLANNED, actual: DEFAULT_ACTUAL, report: '' };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--planned' && args[i + 1]) {
      out.planned = path.resolve(args[++i]);
      continue;
    }
    if (args[i] === '--actual' && args[i + 1]) {
      out.actual = path.resolve(args[++i]);
      continue;
    }
    if (args[i] === '--report' && args[i + 1]) {
      out.report = path.resolve(args[++i]);
      continue;
    }
    positional.push(args[i]);
  }
  if (positional[0]) out.planned = path.resolve(positional[0]);
  if (positional[1]) out.actual = path.resolve(positional[1]);
  if (positional[2]) out.report = path.resolve(positional[2]);
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

function missingMandatory(row) {
  const missing = [];
  for (const field of MANDATORY_FIELDS) {
    if (!row[field]) missing.push(field);
  }
  return missing;
}

function toReport(result) {
  const lines = [];
  lines.push('# SC-001 Matrix Integrity Report');
  lines.push('');
  lines.push(`- plannedRows: ${result.plannedRows}`);
  lines.push(`- completedRows: ${result.completedRows}`);
  lines.push(`- completionPercent: ${result.completionPercent}`);
  lines.push(`- orphanRows: ${result.orphanRows.length}`);
  lines.push(`- rowsWithMissingMandatoryFields: ${result.rowsWithMissingMandatoryFields.length}`);
  lines.push(`- pass: ${result.pass}`);
  lines.push('');
  if (result.orphanRows.length > 0) {
    lines.push('## Orphan Rows');
    for (const id of result.orphanRows) lines.push(`- ${id}`);
    lines.push('');
  }
  if (result.rowsWithMissingMandatoryFields.length > 0) {
    lines.push('## Missing Mandatory Fields');
    for (const item of result.rowsWithMissingMandatoryFields) {
      lines.push(`- ${item.matrixRowId}: ${item.missing.join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const args = parseArgs();
for (const p of [args.planned, args.actual]) {
  if (!fs.existsSync(p)) {
    console.error(`Matrix file not found: ${p}`);
    process.exit(2);
  }
}

const plannedRows = parseCsv(fs.readFileSync(args.planned, 'utf8'));
const actualRows = parseCsv(fs.readFileSync(args.actual, 'utf8'));

const plannedIds = new Set(plannedRows.map((r) => r.matrixRowId).filter(Boolean));
const actualIds = actualRows.map((r) => r.matrixRowId).filter(Boolean);

const orphanRows = actualIds.filter((id) => !plannedIds.has(id));
const rowsWithMissingMandatoryFields = actualRows
  .map((row) => ({ matrixRowId: row.matrixRowId || '(missing-id)', missing: missingMandatory(row) }))
  .filter((x) => x.missing.length > 0);

const completedRows = actualRows.length;
const completionPercent = plannedRows.length === 0 ? 0 : Number(((completedRows / plannedRows.length) * 100).toFixed(2));

const pass = completionPercent >= 95 && orphanRows.length === 0 && rowsWithMissingMandatoryFields.length === 0;

const result = {
  plannedRows: plannedRows.length,
  completedRows,
  completionPercent,
  orphanRows,
  rowsWithMissingMandatoryFields,
  pass,
};

if (args.report) {
  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.writeFileSync(args.report, toReport(result), 'utf8');
}

console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
