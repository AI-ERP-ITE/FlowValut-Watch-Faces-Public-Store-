/**
 * firebaseStorageClient.ts
 * Shared Firebase Storage helpers for all lab asset types and image switchers.
 *
 * All upload functions return { storagePath, downloadURL }.
 * All functions throw on error — callers should wrap in try/catch and console.warn.
 * Designed to be used by firestoreLabSync.ts and imageSwitcherSync.ts only.
 */

import { getApp } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

// ── Storage bucket access ─────────────────────────────────────────────────────

function getStorageBucket() {
  return getStorage(getApp());
}

// ── Upload helpers ────────────────────────────────────────────────────────────

/**
 * Upload a text string (SVG/HTML source) to Firebase Storage.
 * Content-type: text/plain
 */
export async function uploadSourceText(
  storagePath: string,
  content: string,
): Promise<{ storagePath: string; downloadURL: string }> {
  const storage = getStorageBucket();
  const storageRef = ref(storage, storagePath);
  const blob = new Blob([content], { type: 'text/plain' });
  await uploadBytes(storageRef, blob, { contentType: 'text/plain' });
  const downloadURL = await getDownloadURL(storageRef);
  return { storagePath, downloadURL };
}

/**
 * Upload a binary blob (PNG, font bytes) to Firebase Storage.
 */
export async function uploadBinaryBlob(
  storagePath: string,
  blob: Blob,
  contentType: string,
): Promise<{ storagePath: string; downloadURL: string }> {
  const storage = getStorageBucket();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType });
  const downloadURL = await getDownloadURL(storageRef);
  return { storagePath, downloadURL };
}

// ── Download helpers ──────────────────────────────────────────────────────────

/**
 * Download text content from a CDN URL (source HTML/SVG).
 * Uses fetch() — caller must handle CORS if needed (Storage URLs are CORS-enabled).
 */
export async function downloadText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[firebaseStorageClient] downloadText failed: ${response.status} ${url}`);
  }
  return response.text();
}

/**
 * Download binary blob from a CDN URL (baked PNG, font file).
 */
export async function downloadBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[firebaseStorageClient] downloadBlob failed: ${response.status} ${url}`);
  }
  return response.blob();
}

// ── Delete helper ─────────────────────────────────────────────────────────────

/**
 * Delete a single Storage object by path. No-op (logged) if not found.
 */
export async function deleteStorageObject(storagePath: string): Promise<void> {
  try {
    const storage = getStorageBucket();
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    // 'storage/object-not-found' is expected during delete — ignore it
    const code = (err as { code?: string })?.code;
    if (code !== 'storage/object-not-found') {
      throw err;
    }
  }
}

// ── Blob ↔ Data URL converters ────────────────────────────────────────────────

/**
 * Convert a data URL string to a Blob.
 * Works for any data URL format (image/png, font/ttf, etc.)
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Convert a Blob to a data URL string.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert an ArrayBuffer to a Blob.
 */
export function arrayBufferToBlob(buffer: ArrayBuffer, contentType: string): Blob {
  return new Blob([buffer], { type: contentType });
}

// ── SHA-256 hashing ───────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hex digest of a string or ArrayBuffer.
 * Uses Web Crypto API (requires secure context: HTTPS or localhost).
 */
export async function sha256Hex(content: string | ArrayBuffer): Promise<string> {
  const buffer =
    typeof content === 'string'
      ? new TextEncoder().encode(content)
      : new Uint8Array(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
