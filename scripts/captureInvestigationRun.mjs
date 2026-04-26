import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const FEATURE_DIR = path.join(ROOT, 'specs', '032-device-parity-root-cause');
const OUT_DIR = path.join(FEATURE_DIR, 'investigation', 'evidence', 'run-records');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function argValue(name, fallback = '') {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function buildRunId(operator) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `run-${stamp}-${operator}`;
}

const operator = argValue('--operator', 'unknown-operator');
const fixtureId = argValue('--fixture', 'unset-fixture');
const issueFocus = argValue('--issue', 'both');
const buildHash = argValue('--buildHash', 'local-dev');

ensureDir(OUT_DIR);
const runId = buildRunId(operator);

const runRecord = {
  runId,
  featureId: '032-device-parity-root-cause',
  fixtureId,
  issueFocus,
  buildHash,
  operator,
  startedAt: nowIso(),
  runStatus: 'in_progress',
  stageCaptures: [],
  matrixRows: [],
  hypothesisResults: [],
};

const filePath = path.join(OUT_DIR, `${runId}.json`);
fs.writeFileSync(filePath, JSON.stringify(runRecord, null, 2), 'utf8');

console.log(`Created run record: ${path.relative(ROOT, filePath)}`);
console.log(`runId=${runId}`);
