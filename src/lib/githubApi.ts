// GitHub API Integration for uploading ZPK files

import type { GitHubUploadResult } from '@/types';
import {
  bridgeReadContent,
  bridgeWriteContent,
  fetchBackendRepoInfo,
  isBackendBridgeConfigured,
} from '@/lib/backendGitHubBridge';

export interface GitHubConfig {
  token?: string;
  owner: string;
  repo: string;
  branch?: string;
}

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB limit for GitHub API

// Convert ArrayBuffer to base64 in chunks to avoid stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

// Upload file to GitHub repository
export async function uploadToGitHub(
  config: GitHubConfig,
  filename: string,
  content: Blob | string,
  message?: string
): Promise<GitHubUploadResult> {
  const { token, owner, repo, branch = 'main' } = config;
  const useBackendBridge = isBackendBridgeConfigured();
  
  try {
    // Validate parameters
    if (!useBackendBridge && (!token || !token.trim())) {
      throw new Error('GitHub token is missing');
    }
    if (!owner || !owner.trim()) {
      throw new Error('GitHub owner is missing');
    }
    if (!repo || !repo.trim()) {
      throw new Error('GitHub repo is missing');
    }

    console.log('[GitHub] Starting upload...');
    console.log('[GitHub] Config:', { owner, repo, branch, filename });
    
    // Skip repo verification for now - go directly to upload
    console.log('[GitHub] Proceeding with file upload to:', `${owner}/${repo}`);
    
    // Upload to docs/zpk/ folder so it's accessible via GitHub Pages
    const filepath = `docs/zpk/${filename}`;
    console.log('[GitHub] Upload path:', filepath);
    
    let base64Content: string;
    let contentSize: number;
    
    if (content instanceof Blob) {
      contentSize = content.size;
      console.log('[GitHub] File size:', contentSize, 'bytes');
      
      if (contentSize > MAX_FILE_SIZE) {
        console.warn(`[GitHub] File size (${contentSize}) exceeds single upload limit (${MAX_FILE_SIZE}). File may need to be split.`);
      }
      
      console.log('[GitHub] Converting blob to base64...');
      const arrayBuffer = await content.arrayBuffer();
      base64Content = arrayBufferToBase64(arrayBuffer);
      console.log('[GitHub] Base64 conversion complete, length:', base64Content.length);
    } else {
      contentSize = content.length;
      base64Content = btoa(content);
    }
    
    // Check if file already exists (to get SHA for update)
    console.log('[GitHub] Checking if file exists...');
    const existingFile = await getFileSha(config, filepath);
    if (existingFile) {
      console.log('[GitHub] File exists, will update (SHA:', existingFile.sha.substring(0, 8), '...')
    } else {
      console.log('[GitHub] File does not exist, will create new');
    }
    
    // Prepare request body
    const body: Record<string, string> = {
      message: message || `Upload watch face: ${filename}`,
      content: base64Content,
      branch,
    };
    
    if (existingFile) {
      body.sha = existingFile.sha;
    }
    
    if (useBackendBridge) {
      await bridgeWriteContent({
        path: filepath,
        contentBase64: base64Content,
        message: body.message,
        branch,
        sha: body.sha,
      });

      const pagesUrl = `https://${owner}.github.io/${repo}/zpk/${filename}`;
      const folderMatch = filename.match(/^([^\/]+)\//);
      const watchfaceId = folderMatch ? folderMatch[1] : filename.replace('.zpk', '').replace('-qr.png', '');
      return {
        success: true,
        url: pagesUrl,
        downloadUrl: pagesUrl,
        watchfaceId,
      };
    }

    // Upload file
    console.log('[GitHub] Uploading to GitHub API...');
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`;
    console.log('[GitHub] API URL:', apiUrl);
    
    const response = await fetch(
      apiUrl,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    
    if (!response.ok) {
      console.error('[GitHub] Upload failed with status:', response.status);
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch {
        // Response body empty or not JSON — use status text
      }
      
      if (response.status === 413) {
        throw new Error(`File too large (${contentSize} bytes). Max: ${MAX_FILE_SIZE} bytes. Consider splitting the upload.`);
      }
      // 422 with "sha" missing = file exists but getFileSha failed. Retry with SHA.
      if (response.status === 422 && errorMsg.includes('sha') && !existingFile) {
        console.warn('[GitHub] 422: file exists but SHA was not fetched. Retrying with direct SHA fetch...');
        const retrySha = await getFileSha(config, filepath);
        if (retrySha) {
          console.log('[GitHub] Retry: got SHA', retrySha.sha.substring(0, 8), '— re-uploading...');
          body.sha = retrySha.sha;
          const retryResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          if (!retryResponse.ok) {
            const retryError = await retryResponse.text().catch(() => '');
            throw new Error(`Upload retry failed (${retryResponse.status}): ${retryError}`);
          }
          // Retry succeeded — parse and return below
          let retryData: Record<string, unknown> | null = null;
          try {
            const text = await retryResponse.text();
            if (text) retryData = JSON.parse(text);
          } catch { /* empty */ }
          const pagesUrl = `https://${owner}.github.io/${repo}/zpk/${filename}`;
          const folderMatch = filename.match(/^([^\/]+)\//);
          const watchfaceId = folderMatch ? folderMatch[1] : filename.replace('.zpk', '').replace('-qr.png', '');
          return {
            success: true,
            url: (retryData as Record<string, Record<string, string>> | null)?.content?.html_url || pagesUrl,
            downloadUrl: pagesUrl,
            watchfaceId,
          };
        }
        throw new Error(`File exists but could not fetch SHA for update. ${errorMsg}`);
      }
      if (response.status === 422) {
        throw new Error(`Invalid file upload: ${errorMsg}. The file may be corrupted or in wrong format.`);
      }
      if (response.status === 401) {
        throw new Error('GitHub token is invalid or expired.');
      }
      
      throw new Error(`Upload failed: ${errorMsg}`);
    }
    
    // Parse response — guard against empty body (can happen on large uploads)
    let data: Record<string, unknown> | null = null;
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch {
      console.warn('[GitHub] Could not parse response body, proceeding with URL construction');
    }
    console.log('[GitHub] Upload successful!');
    
    // Construct GitHub Pages URL
    // GitHub Pages serves docs/ folder at root: https://owner.github.io/repo/
    // So docs/zpk/watchface1/face.zpk is accessible at: https://owner.github.io/repo/zpk/watchface1/face.zpk
    const pagesUrl = `https://${owner}.github.io/${repo}/zpk/${filename}`;
    console.log('[GitHub] File uploaded to:', filepath);
    console.log('[GitHub] Accessible at:', pagesUrl);
    
    // Extract folder name for watchface ID (e.g., from "watchface1/face.zpk" extract "watchface1")
    const folderMatch = filename.match(/^([^\/]+)\//);
    const watchfaceId = folderMatch ? folderMatch[1] : filename.replace('.zpk', '').replace('-qr.png', '');
    
    console.log('[GitHub] Watchface ID:', watchfaceId);
    
    return {
      success: true,
      url: (data as Record<string, Record<string, string>> | null)?.content?.html_url || pagesUrl,
      downloadUrl: pagesUrl,
      watchfaceId: watchfaceId,
    };
  } catch (error) {
    console.error('[GitHub] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Verify file is accessible on GitHub Pages (non-blocking, runs in background)
// Get file SHA (for updating existing files)
async function getFileSha(
  config: GitHubConfig,
  filename: string
): Promise<{ sha: string } | null> {
  const { token, owner, repo, branch = 'main' } = config;
  const useBackendBridge = isBackendBridgeConfigured();
  
  try {
    if (!owner || !repo) {
      console.warn('[GitHub] Invalid owner or repo for getFileSha, skipping SHA check');
      return null;
    }

    if (useBackendBridge) {
      const bridged = await bridgeReadContent(filename, branch);
      if (!bridged.exists || !bridged.sha) return null;
      return { sha: bridged.sha };
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}?ref=${branch}`;
    console.log('[GitHub] Checking file SHA at:', apiUrl);
    
    const response = await fetch(
      apiUrl,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    
    console.log('[GitHub] File check response status:', response.status);
    
    if (response.status === 404) {
      console.log('[GitHub] File does not exist (404), will create new');
      return null; // File doesn't exist
    }
    
    if (!response.ok) {
      console.warn(`[GitHub] File check failed with status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log('[GitHub] Existing file found, SHA:', data.sha);
    return { sha: data.sha };
  } catch (error) {
    console.error('[GitHub] Error checking file SHA:', error);
    return null;
  }
}

// Test GitHub connection
export async function testGitHubConnection(config: GitHubConfig): Promise<boolean> {
  if (isBackendBridgeConfigured()) {
    try {
      await fetchBackendRepoInfo();
      return true;
    } catch {
      return false;
    }
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}`,
      {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    
    return response.ok;
  } catch {
    return false;
  }
}

// Get repository info
export async function getRepoInfo(config: GitHubConfig): Promise<{
  name: string;
  description: string;
  html_url: string;
  has_pages: boolean;
} | null> {
  if (isBackendBridgeConfigured()) {
    try {
      return await fetchBackendRepoInfo();
    } catch {
      return null;
    }
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}`,
      {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    
    if (!response.ok) return null;
    
    return await response.json();
  } catch {
    return null;
  }
}

// List files in repository
export async function listFiles(
  config: GitHubConfig,
  path: string = ''
): Promise<string[]> {
  if (isBackendBridgeConfigured() && path) {
    try {
      const bridged = await bridgeReadContent(path, config.branch || 'main');
      return bridged.exists ? [path.split('/').pop() || path] : [];
    } catch {
      return [];
    }
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data
      .filter((item: { type: string }) => item.type === 'file')
      .map((item: { name: string }) => item.name);
  } catch {
    return [];
  }
}

// Complete upload flow: Upload ZPK + QR code to same folder, verify, and return both URLs
export async function uploadZPKWithQR(
  config: GitHubConfig,
  watchfaceId: string,
  zpkBlob: Blob,
  qrDataUrl: string,
  watchfaceName: string,
  previewDataUrl?: string,
  sourceJsonBlob?: Blob
): Promise<GitHubUploadResult> {
  try {
    console.log('[GitHub] Starting folder-based ZPK+QR upload flow...');
    console.log('[GitHub] Watchface ID:', watchfaceId);
    
    // Step 1: Upload ZPK to docs/zpk/{watchfaceId}/face.zpk
    console.log('[GitHub] Step 1: Uploading ZPK file...');
    const zpkPath = `${watchfaceId}/face.zpk`;
    const zpkResult = await uploadToGitHub(
      config,
      zpkPath,
      zpkBlob,
      `Upload watch face ZPK: ${watchfaceName}`
    );
    
    if (!zpkResult.success) {
      throw new Error(`ZPK upload failed: ${zpkResult.error}`);
    }
    
    console.log('[GitHub] ZPK uploaded successfully to:', zpkResult.downloadUrl);
    
    // Step 2: Convert QR data URL to Blob
    console.log('[GitHub] Step 2: Converting QR code to blob...');
    const qrBlob = await fetch(qrDataUrl).then(r => r.blob());
    console.log('[GitHub] QR blob created, size:', qrBlob.size);
    
    // Step 3: Upload QR code to docs/zpk/{watchfaceId}/qr.png
    console.log('[GitHub] Step 3: Uploading QR code...');
    const qrPath = `${watchfaceId}/qr.png`;
    const qrResult = await uploadToGitHub(
      config,
      qrPath,
      qrBlob,
      `Upload QR code for: ${watchfaceName}`
    );
    
    if (!qrResult.success) {
      throw new Error(`QR code upload failed: ${qrResult.error}`);
    }
    
    console.log('[GitHub] QR code uploaded successfully to:', qrResult.downloadUrl);

    // Step 4: Upload preview screenshot if provided
    if (previewDataUrl) {
      console.log('[GitHub] Step 4: Uploading preview screenshot...');
      const previewBlob = await fetch(previewDataUrl).then(r => r.blob());
      console.log('[GitHub] Preview blob created, size:', previewBlob.size);
      const previewPath = `${watchfaceId}/preview.png`;
      const previewResult = await uploadToGitHub(
        config,
        previewPath,
        previewBlob,
        `Upload preview screenshot for: ${watchfaceName}`
      );
      if (previewResult.success) {
        console.log('[GitHub] Preview uploaded to:', previewResult.downloadUrl);
      } else {
        console.warn('[GitHub] Preview upload failed (non-fatal):', previewResult.error);
      }
    }
    
    // Note: Files may take 30-60 seconds to appear on GitHub Pages, but upload is successful
    console.log('[GitHub] Upload complete! Files will be accessible on GitHub Pages shortly.');

    // Step 5: Upload source.json if provided (non-fatal)
    if (sourceJsonBlob) {
      try {
        console.log('[GitHub] Step 5: Uploading source.json...');
        const sourcePath = `${watchfaceId}/source.json`;
        const sourceResult = await uploadToGitHub(
          config,
          sourcePath,
          sourceJsonBlob,
          `Upload source.json for: ${watchfaceName}`
        );
        if (sourceResult.success) {
          console.log('[GitHub] source.json uploaded to:', sourceResult.downloadUrl);
        } else {
          console.warn('[GitHub] source.json upload failed (non-fatal):', sourceResult.error);
        }
      } catch (e) {
        console.warn('[GitHub] source.json upload threw (non-fatal):', e);
      }
    }
    
    console.log('[GitHub] Upload flow complete!');
    return {
      success: true,
      url: zpkResult.url,
      downloadUrl: zpkResult.downloadUrl,
      qrUrl: qrResult.downloadUrl,
      watchfaceId: watchfaceId,
    };
  } catch (error) {
    console.error('[GitHub] Upload flow failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Regenerate + overwrite qr.png for a single watchface folder
export async function regenerateSingleQR(
  config: GitHubConfig,
  watchfaceId: string,
  baseUrl: string   // e.g. 'https://owner.github.io/repo'
): Promise<{ success: boolean; qrDataUrl?: string; error?: string }> {
  try {
    const { generateQRCode } = await import('./qrGenerator');
    const zpkUrl = `${baseUrl.replace(/\/$/, '')}/zpk/${watchfaceId}/face.zpk`;
    const qrDataUrl = await generateQRCode(zpkUrl);
    const qrBlob = await fetch(qrDataUrl).then((r) => r.blob());
    const result = await uploadToGitHub(
      config,
      `${watchfaceId}/qr.png`,
      qrBlob,
      `Regenerate QR code for: ${watchfaceId}`
    );
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, qrDataUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Batch-regenerate QR codes for every entry in the catalog.
// Calls onProgress(done, total, currentId) after each attempt.
// Returns lists of succeeded and failed watchface IDs.
export async function batchRegenerateQRCodes(
  config: GitHubConfig,
  watchfaceIds: string[],
  baseUrl: string,
  onProgress: (done: number, total: number, currentId: string) => void
): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < watchfaceIds.length; i++) {
    const id = watchfaceIds[i];
    onProgress(i, watchfaceIds.length, id);

    const result = await regenerateSingleQR(config, id, baseUrl);
    if (result.success) {
      succeeded.push(id);
    } else {
      failed.push({ id, error: result.error ?? 'unknown' });
    }

    // 500 ms delay between requests to avoid GitHub API rate limiting
    if (i < watchfaceIds.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  onProgress(watchfaceIds.length, watchfaceIds.length, '');
  return { success: succeeded, failed };
}

