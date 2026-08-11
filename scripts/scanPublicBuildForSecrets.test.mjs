import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { scanDirectoryForSecrets } from './scanPublicBuildForSecrets.mjs';

function withTempBuild(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'flowvault-secret-scan-'));
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

describe('compiled-output credential scan', () => {
  it('allows public browser configuration and Paddle client-side tokens', () => withTempBuild((root) => {
    writeFileSync(path.join(root, 'index.js'), 'const firebaseApiKey="browser-safe"; const paddle="test_browser_token";');
    assert.doesNotThrow(() => scanDirectoryForSecrets(root));
  }));

  it('rejects backend credential patterns', () => withTempBuild((root) => {
    writeFileSync(path.join(root, 'index.js'), 'const token="github_pat_example_secret_value";');
    assert.throws(() => scanDirectoryForSecrets(root), /GitHub personal access token/);
  }));
});

