import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { repackZpkCanonicalName } from './zpkReleaseRepacker';

async function fixture(version: 'v2' | 'v3', corrupt = false) {
  const manifest = JSON.stringify({ configVersion: version, app: { appName: 'AOD test 4', description: 'Custom watch face - AOD test 4' }, i18n: { en: { appName: 'AOD test 4' } } });
  const nested = async (asset: string) => new JSZip().file('app.json', manifest).file('assets/payload.bin', asset).generateAsync({ type: 'uint8array', compression: 'STORE' });
  return new JSZip().file('app.json', manifest).file('device.zip', corrupt ? new Uint8Array([1, 2, 3]) : await nested('DEVICE')).file('app-side.zip', await nested('APP')).file('preview_en.png', 'PNG').generateAsync({ type: 'uint8array', compression: 'STORE' });
}

describe.each(['v2', 'v3'] as const)('%s release repack', (version) => {
  it('changes only allowlisted manifests and preserves payload hashes', async () => {
    const result = await repackZpkCanonicalName(await fixture(version), 'FlowVault Legacy 01 — Steel — Classic');
    expect(result.report.changedJsonPaths.length).toBeGreaterThanOrEqual(3);
    expect(result.report.entries.filter((entry) => entry.path.endsWith('payload.bin')).every((entry) => !entry.changed)).toBe(true);
    expect(result.report.entries.filter((entry) => entry.changed).every((entry) => entry.allowlisted)).toBe(true);
  });
});

describe('corruption safety', () => {
  it('fails closed on a corrupt nested package', async () => await expect(repackZpkCanonicalName(await fixture('v3', true), 'FlowVault Safe')).rejects.toThrow());
  it('fails when a required nested package is missing', async () => {
    const zip = new JSZip().file('app.json', JSON.stringify({ app: { appName: 'x' } })).file('device.zip', await new JSZip().file('app.json', JSON.stringify({ app: { appName: 'x' } })).generateAsync({ type: 'uint8array' }));
    await expect(repackZpkCanonicalName(await zip.generateAsync({ type: 'uint8array' }), 'FlowVault Safe')).rejects.toThrow('MISSING_REQUIRED_ENTRY');
  });
});
