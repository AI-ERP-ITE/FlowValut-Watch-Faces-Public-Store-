import JSZip from 'jszip';

export interface RepackEntryReport { path: string; originalSha256: string; releasedSha256: string; changed: boolean; allowlisted: boolean }
export interface ZpkParityReport { canonicalName: string; originalSha256: string; releasedSha256: string; changedJsonPaths: string[]; entries: RepackEntryReport[] }

const NESTED_ARCHIVES = ['device.zip', 'app-side.zip'] as const;
const ALLOWED_KEYS = new Set(['appName', 'description']);

async function sha256(data: Uint8Array): Promise<string> {
  const view = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', view);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function rewriteNames(value: unknown, canonicalName: string, path = '$', changed: string[] = []): unknown {
  if (Array.isArray(value)) return value.map((item, index) => rewriteNames(item, canonicalName, `${path}[${index}]`, changed));
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (key === 'appName' && typeof child === 'string') { output[key] = canonicalName; changed.push(childPath); }
    else if (key === 'description' && typeof child === 'string') { output[key] = child ? `Custom watch face - ${canonicalName}` : canonicalName; changed.push(childPath); }
    else output[key] = rewriteNames(child, canonicalName, childPath, changed);
  }
  return output;
}

function assertAllowlistedJsonDiff(original: unknown, released: unknown, path = '$', changes: string[] = []): string[] {
  if (Object.is(original, released)) return changes;
  if (Array.isArray(original) && Array.isArray(released) && original.length === released.length) {
    original.forEach((value, index) => assertAllowlistedJsonDiff(value, released[index], `${path}[${index}]`, changes)); return changes;
  }
  if (original && released && typeof original === 'object' && typeof released === 'object') {
    const keys = new Set([...Object.keys(original as object), ...Object.keys(released as object)]);
    for (const key of keys) assertAllowlistedJsonDiff((original as Record<string, unknown>)[key], (released as Record<string, unknown>)[key], `${path}.${key}`, changes);
    return changes;
  }
  const key = path.split('.').pop() ?? '';
  if (!ALLOWED_KEYS.has(key)) throw new Error(`UNAUTHORIZED_METADATA_DIFFERENCE:${path}`);
  changes.push(path); return changes;
}

async function repackArchive(input: Uint8Array, canonicalName: string, scope: string, reports: RepackEntryReport[], changedPaths: string[]): Promise<Uint8Array> {
  const originalZip = await JSZip.loadAsync(input, { checkCRC32: true });
  const outputZip = new JSZip();
  const names = Object.keys(originalZip.files).sort();
  if (!originalZip.file('app.json')) throw new Error(`MISSING_MANIFEST:${scope}/app.json`);
  for (const name of names) {
    const entry = originalZip.files[name];
    if (entry.dir) { outputZip.folder(name); continue; }
    const original = await entry.async('uint8array');
    let released = original;
    let allowlisted = false;
    if (name === 'app.json') {
      const parsed = JSON.parse(new TextDecoder().decode(original));
      const localChanges: string[] = [];
      const rewritten = rewriteNames(parsed, canonicalName, '$', localChanges);
      const verifiedChanges = assertAllowlistedJsonDiff(parsed, rewritten);
      if (verifiedChanges.length === 0) throw new Error(`EMBEDDED_NAME_NOT_FOUND:${scope}/app.json`);
      changedPaths.push(...verifiedChanges.map((path) => `${scope}/app.json:${path}`));
      released = new TextEncoder().encode(JSON.stringify(rewritten, null, 2));
      allowlisted = true;
    }
    reports.push({ path: `${scope}/${name}`, originalSha256: await sha256(original), releasedSha256: await sha256(released), changed: await sha256(original) !== await sha256(released), allowlisted });
    outputZip.file(name, released, { date: entry.date, compression: 'STORE' });
  }
  return outputZip.generateAsync({ type: 'uint8array', compression: 'STORE' });
}

export async function repackZpkCanonicalName(input: Uint8Array, canonicalName: string): Promise<{ bytes: Uint8Array; report: ZpkParityReport }> {
  if (!canonicalName.trim()) throw new Error('Canonical name is required');
  const outer = await JSZip.loadAsync(input, { checkCRC32: true });
  const output = new JSZip();
  const reports: RepackEntryReport[] = [];
  const changedJsonPaths: string[] = [];
  for (const name of Object.keys(outer.files).sort()) {
    const entry = outer.files[name];
    if (entry.dir) { output.folder(name); continue; }
    const original = await entry.async('uint8array');
    let released = original;
    let allowlisted = false;
    if (name === 'app.json') released = await repackArchive(await new JSZip().file('app.json', original).generateAsync({ type: 'uint8array', compression: 'STORE' }), canonicalName, 'outer', reports, changedJsonPaths).then(async (wrapped) => (await JSZip.loadAsync(wrapped)).file('app.json')!.async('uint8array'));
    else if (NESTED_ARCHIVES.includes(name as typeof NESTED_ARCHIVES[number])) released = await repackArchive(original, canonicalName, name, reports, changedJsonPaths);
    if (name === 'app.json' || NESTED_ARCHIVES.includes(name as typeof NESTED_ARCHIVES[number])) allowlisted = true;
    reports.push({ path: name, originalSha256: await sha256(original), releasedSha256: await sha256(released), changed: await sha256(original) !== await sha256(released), allowlisted });
    output.file(name, released, { date: entry.date, compression: 'STORE' });
  }
  for (const required of ['app.json', ...NESTED_ARCHIVES]) if (!outer.file(required)) throw new Error(`MISSING_REQUIRED_ENTRY:${required}`);
  if (changedJsonPaths.length < 3) throw new Error('CANONICAL_NAME_NOT_REPLACED_AT_ALL_LAYERS');
  if (reports.some((entry) => entry.changed && !entry.allowlisted)) throw new Error('UNAUTHORIZED_PAYLOAD_DIFFERENCE');
  const bytes = await output.generateAsync({ type: 'uint8array', compression: 'STORE' });
  return { bytes, report: { canonicalName, originalSha256: await sha256(input), releasedSha256: await sha256(bytes), changedJsonPaths, entries: reports } };
}
