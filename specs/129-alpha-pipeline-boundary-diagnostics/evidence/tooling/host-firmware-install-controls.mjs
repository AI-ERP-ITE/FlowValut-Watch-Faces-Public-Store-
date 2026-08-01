import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const firmwareRoot = path.join(specRoot, 'evidence', 'firmware');
const controlsRoot = path.join(firmwareRoot, 'install-controls');
const sourceManifest = JSON.parse(await fs.readFile(
  path.join(firmwareRoot, 'T050-install-control-manifest.json'),
  'utf8',
));
const envText = await fs.readFile(path.join(appRoot, '.env.private.local'), 'utf8');
const environment = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  return match ? [[match[1].trim(), match[2].trim()]] : [];
}));
const token = environment.GITHUB_TOKEN;
const repo = environment.GITHUB_REPO;
if (!token || !repo) throw new Error('Private GitHub test credentials are not configured');
const [owner, repository] = repo.split('/');
const branch = 'main';
const remoteRoot = 'spec129-alpha-tests/rgba-boundary-20260729';
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'FlowVault-Spec129-Diagnostic',
};

async function upload(remotePath, bytes) {
  const endpoint = `https://api.github.com/repos/${owner}/${repository}/contents/${remotePath}`;
  const existingResponse = await fetch(`${endpoint}?ref=${branch}`, { headers });
  let existingSha;
  if (existingResponse.ok) {
    existingSha = (await existingResponse.json()).sha;
  } else if (existingResponse.status !== 404) {
    throw new Error(`GitHub lookup failed ${existingResponse.status}: ${remotePath}`);
  }
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `test(spec129): upload ${path.posix.basename(remotePath)}`,
      content: bytes.toString('base64'),
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });
  if (!response.ok) throw new Error(`GitHub upload failed ${response.status}: ${remotePath}`);
  const payload = await response.json();
  return {
    remotePath,
    blobSha: payload.content.sha,
    downloadUrl: payload.content.download_url,
    commitSha: payload.commit.sha,
  };
}

const hosted = [];
for (const control of sourceManifest.controls) {
  const bytes = await fs.readFile(path.join(controlsRoot, control.file));
  if (sha256(bytes) !== control.sha256) throw new Error(`${control.id}: local hash drift`);
  const remote = await upload(`${remoteRoot}/${control.file}`, bytes);
  const downloadResponse = await fetch(remote.downloadUrl);
  const downloadedBytes = Buffer.from(await downloadResponse.arrayBuffer());
  const qrName = `${control.id}-direct-download-qr.png`;
  await QRCode.toFile(path.join(firmwareRoot, qrName), remote.downloadUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
  hosted.push({
    id: control.id,
    file: control.file,
    kind: control.kind,
    localSha256: control.sha256,
    remotePath: remote.remotePath,
    blobSha: remote.blobSha,
    commitSha: remote.commitSha,
    downloadUrl: remote.downloadUrl,
    unauthenticatedDownloadStatus: downloadResponse.status,
    downloadedByteLength: downloadedBytes.length,
    downloadedSha256: sha256(downloadedBytes),
    hostedBytesExact: downloadResponse.ok && sha256(downloadedBytes) === control.sha256,
    qrFile: qrName,
    qrMeaning: 'Direct-download URL only',
    zeppInstallSemantics:
      control.kind === 'Official Zeus ZAB'
        ? 'UNVERIFIED/BLOCKED: not an authenticated Zeus preview QR'
        : 'UNVERIFIED until scanned on device',
  });
}

const output = {
  task: 'T050-T051',
  testOnly: true,
  repository: repo,
  branch,
  remoteRoot,
  allHostedBytesExact: hosted.every(({ hostedBytesExact }) => hostedBytesExact),
  hosted,
};
await fs.writeFile(
  path.join(firmwareRoot, 'T050-T051-hosted-control-validation.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(JSON.stringify({
  task: output.task,
  repository: output.repository,
  remoteRoot: output.remoteRoot,
  allHostedBytesExact: output.allHostedBytesExact,
  hosted: hosted.map((item) => ({
    id: item.id,
    status: item.unauthenticatedDownloadStatus,
    hostedBytesExact: item.hostedBytesExact,
    qrFile: item.qrFile,
    zeppInstallSemantics: item.zeppInstallSemantics,
  })),
}, null, 2));
if (!output.allHostedBytesExact) process.exitCode = 1;
