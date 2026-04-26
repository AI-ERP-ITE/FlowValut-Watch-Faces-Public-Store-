import { uploadToGitHub, type GitHubConfig } from './githubApi';
import type { CatalogEntry, ModelEntry, SpecGroup } from '@/context/CatalogContext';
import {
  bridgeReadContent,
  bridgeWriteContent,
  isBackendBridgeConfigured,
} from '@/lib/backendGitHubBridge';

const CATALOG_PATH = 'docs/catalog.json';
const STOREFRONT_CONFIG_PATH = 'docs/storeConfig.json';

interface SourceMetadata {
  specGroup?: string | null;
  resolution?: string;
  shape?: 'round' | 'square';
  watchModel?: string;
}

export interface SpecGroupPatchResult {
  totalEntries: number;
  unknownBefore: number;
  patched: number;
  unknownAfter: number;
  updated: boolean;
}

export interface StorefrontConfig {
  featuredFaceId: string | null;
}

function decodeGitHubFileContent(content: string): string {
  const binary = atob(content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function fetchJsonFromGitHub<T>(
  config: GitHubConfig,
  repoPath: string
): Promise<T | null> {
  if (isBackendBridgeConfigured()) {
    const bridged = await bridgeReadContent(repoPath, config.branch || 'main');
    if (!bridged.exists || !bridged.content) return null;
    const decoded = decodeGitHubFileContent(bridged.content);
    return JSON.parse(decoded) as T;
  }

  const { token, owner, repo, branch = 'main' } = config;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}?ref=${branch}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch ${repoPath}: HTTP ${response.status}`);
  }

  const data = await response.json();
  const decoded = decodeGitHubFileContent(data.content);
  return JSON.parse(decoded) as T;
}

function normalizeModelName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getSourcePathFromZpk(zpkPath: string): string | null {
  const match = zpkPath.match(/^zpk\/([^/]+)\/face\.zpk$/i);
  if (!match) return null;
  return `docs/zpk/${match[1]}/source.json`;
}

function inferSpecGroupFromSource(
  source: SourceMetadata,
  models: Record<string, ModelEntry>,
  specGroups: Record<string, SpecGroup>
): string | null {
  if (source.specGroup && specGroups[source.specGroup]) {
    return source.specGroup;
  }

  if (source.watchModel) {
    const sourceModel = normalizeModelName(source.watchModel);
    const matched = Object.values(models).find((model) => {
      const known = normalizeModelName(model.name);
      return known.includes(sourceModel) || sourceModel.includes(known);
    });
    if (matched?.specGroup) return matched.specGroup;
  }

  if (source.resolution && source.shape) {
    const candidates = Object.entries(specGroups)
      .filter(([, sg]) => sg.resolution === source.resolution && sg.shape === source.shape)
      .map(([key]) => key);
    if (candidates.length === 1) return candidates[0] ?? null;
  }

  return null;
}

// ── Read ─────────────────────────────────────────────────────────────────

/**
 * Fetch the live catalog.json from the GitHub repo (raw content, not Pages).
 * Returns the parsed array, or throws on error.
 */
export async function fetchCatalogFromGitHub(
  config: GitHubConfig
): Promise<CatalogEntry[]> {
  if (isBackendBridgeConfigured()) {
    const bridged = await bridgeReadContent(CATALOG_PATH, config.branch || 'main');
    if (!bridged.exists || !bridged.content) return [];
    const decoded = decodeGitHubFileContent(bridged.content);
    return JSON.parse(decoded) as CatalogEntry[];
  }

  const { token, owner, repo, branch = 'main' } = config;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${CATALOG_PATH}?ref=${branch}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return []; // catalog doesn't exist yet
    throw new Error(`Failed to fetch catalog.json: HTTP ${response.status}`);
  }

  const data = await response.json();
  // GitHub returns file content as base64
  const decoded = decodeGitHubFileContent(data.content);
  return JSON.parse(decoded) as CatalogEntry[];
}

/**
 * Fetch docs/storeConfig.json from GitHub. Returns default config if missing.
 */
export async function fetchStorefrontConfigFromGitHub(
  config: GitHubConfig
): Promise<StorefrontConfig> {
  const parsed = await fetchJsonFromGitHub<StorefrontConfig>(config, STOREFRONT_CONFIG_PATH);
  return parsed ?? { featuredFaceId: null };
}

// ── Write ─────────────────────────────────────────────────────────────────

/**
 * Append a new entry to catalog.json in the GitHub repo.
 * Fetches current content → appends → writes back (preserves order).
 */
export async function appendToCatalog(
  config: GitHubConfig,
  entry: CatalogEntry
): Promise<void> {
  // 1. Read current catalog
  const current = await fetchCatalogFromGitHub(config);

  // Guard: don't add duplicate IDs
  if (current.some((e) => e.id === entry.id)) {
    throw new Error(`Catalog already contains an entry with id "${entry.id}"`);
  }

  // 2. Prepend (newest first)
  const updated = [entry, ...current];

  // 3. Upload updated catalog.json
  const blob = new Blob([JSON.stringify(updated, null, 2)], {
    type: 'application/json',
  });

  const result = await uploadToGitHub(
    config,
    // uploadToGitHub prepends docs/zpk/ — we need docs/ so we use a workaround:
    // pass the path ourselves via the internal function below
    '',
    blob,
    `Publish watchface: ${entry.name}`
  );

  // uploadToGitHub always uploads to docs/zpk/ — we need docs/ root for catalog.json
  // So call the GitHub API directly here.
  void result; // suppress unused result from above call (we don't use it)
}

/**
 * Upload catalog.json directly (not under docs/zpk/ like uploadToGitHub assumes).
 * This is the correct function to call for catalog updates.
 */
export async function writeCatalogToGitHub(
  config: GitHubConfig,
  entries: CatalogEntry[]
): Promise<void> {
  if (isBackendBridgeConfigured()) {
    const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(entries, null, 2))));
    const current = await bridgeReadContent(CATALOG_PATH, config.branch || 'main');
    await bridgeWriteContent({
      path: CATALOG_PATH,
      contentBase64,
      message: 'Update catalog.json',
      branch: config.branch || 'main',
      sha: current.exists ? current.sha : undefined,
    });
    return;
  }

  const { token, owner, repo, branch = 'main' } = config;

  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(entries, null, 2)))
  );

  // Check existing SHA
  let sha: string | undefined;
  const checkRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${CATALOG_PATH}?ref=${branch}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  const body: Record<string, string> = {
    message: 'Update catalog.json',
    content,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${CATALOG_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Failed to write catalog.json: ${err.message}`);
  }
}

/**
 * Write docs/storeConfig.json directly in repository root docs/.
 */
export async function writeStorefrontConfigToGitHub(
  config: GitHubConfig,
  storefrontConfig: StorefrontConfig
): Promise<void> {
  if (isBackendBridgeConfigured()) {
    const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(storefrontConfig, null, 2))));
    const current = await bridgeReadContent(STOREFRONT_CONFIG_PATH, config.branch || 'main');
    await bridgeWriteContent({
      path: STOREFRONT_CONFIG_PATH,
      contentBase64,
      message: 'Update storeConfig.json',
      branch: config.branch || 'main',
      sha: current.exists ? current.sha : undefined,
    });
    return;
  }

  const { token, owner, repo, branch = 'main' } = config;

  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(storefrontConfig, null, 2)))
  );

  let sha: string | undefined;
  const checkRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${STOREFRONT_CONFIG_PATH}?ref=${branch}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  const body: Record<string, string> = {
    message: 'Update storeConfig.json',
    content,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${STOREFRONT_CONFIG_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Failed to write storeConfig.json: ${err.message}`);
  }
}

/**
 * Full publish flow: append entry + write catalog in one call.
 */
export async function publishToCatalog(
  config: GitHubConfig,
  entry: CatalogEntry
): Promise<void> {
  const current = await fetchCatalogFromGitHub(config);

  if (current.some((e) => e.id === entry.id)) {
    throw new Error(`Entry "${entry.id}" already exists in catalog`);
  }

  await writeCatalogToGitHub(config, [entry, ...current]);
}

/**
 * Backfill unknown/invalid catalog specGroup values using docs/zpk/{id}/source.json.
 * Writes docs/catalog.json only when at least one entry is patched.
 */
export async function patchCatalogSpecGroups(
  config: GitHubConfig
): Promise<SpecGroupPatchResult> {
  const [catalog, models, specGroups] = await Promise.all([
    fetchCatalogFromGitHub(config),
    fetchJsonFromGitHub<Record<string, ModelEntry>>(config, 'docs/models.json'),
    fetchJsonFromGitHub<Record<string, SpecGroup>>(config, 'docs/specGroups.json'),
  ]);

  if (!models) {
    throw new Error('docs/models.json not found in repository');
  }
  if (!specGroups) {
    throw new Error('docs/specGroups.json not found in repository');
  }

  const unknownBefore = catalog.filter(
    (entry) => !entry.specGroup || entry.specGroup === 'unknown' || !specGroups[entry.specGroup]
  ).length;

  if (unknownBefore === 0) {
    return {
      totalEntries: catalog.length,
      unknownBefore: 0,
      patched: 0,
      unknownAfter: 0,
      updated: false,
    };
  }

  const patchedById = new Map<string, string>();

  await Promise.all(
    catalog.map(async (entry) => {
      if (entry.specGroup && entry.specGroup !== 'unknown' && specGroups[entry.specGroup]) {
        return;
      }

      const sourcePath = getSourcePathFromZpk(entry.zpkPath);
      if (!sourcePath) return;

      const source = await fetchJsonFromGitHub<SourceMetadata>(config, sourcePath);
      if (!source) return;

      const inferred = inferSpecGroupFromSource(source, models, specGroups);
      if (inferred) {
        patchedById.set(entry.id, inferred);
      }
    })
  );

  const patched = patchedById.size;
  const updatedCatalog = catalog.map((entry) => {
    const inferred = patchedById.get(entry.id);
    return inferred ? { ...entry, specGroup: inferred } : entry;
  });

  const unknownAfter = updatedCatalog.filter(
    (entry) => !entry.specGroup || entry.specGroup === 'unknown' || !specGroups[entry.specGroup]
  ).length;

  if (patched > 0) {
    await writeCatalogToGitHub(config, updatedCatalog);
  }

  return {
    totalEntries: catalog.length,
    unknownBefore,
    patched,
    unknownAfter,
    updated: patched > 0,
  };
}
