import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Create object URL for file preview (much more efficient than data URL)
export function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get image dimensions from object URL
export function getImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

// Download blob as file
export function downloadBlob(blob: Blob, filename: string) {
  try {
    console.log('[Download] Starting blob download:', { filename, size: blob.size, type: blob.type });
    
    if (!blob || blob.size === 0) {
      throw new Error('Blob is empty or invalid');
    }

    const url = URL.createObjectURL(blob);
    console.log('[Download] Object URL created:', url);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Set content type header
    if (!blob.type) {
      console.warn('[Download] No MIME type detected, defaulting to application/octet-stream');
    }
    
    document.body.appendChild(a);
    console.log('[Download] Anchor element added to DOM');
    
    a.click();
    console.log('[Download] Download triggered');
    
    // Add small delay before cleanup to ensure download initiates
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[Download] Object URL revoked and cleanup complete');
    }, 100);
  } catch (error) {
    console.error('[Download] Download failed with error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Download failed: ${errorMessage}`);
  }
}
