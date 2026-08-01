import type { WatchFaceElement } from '@/types';
import type { CustomGaugePointerRecord } from '@/lib/customGaugePointerStore';

interface NamedImageSource {
  name: string;
  dataUrl: string;
}

/** Resolves the exact source pixels that canvas preview uses before ZPK effects are baked. */
export function resolveGaugePointerExportSource(
  element: WatchFaceElement,
  filename: string,
  elementImages: readonly NamedImageSource[],
  customPointers: readonly CustomGaugePointerRecord[],
): string | null {
  if (element.src?.startsWith('data:')) return element.src;
  const local = elementImages.find((image) => image.name === filename)?.dataUrl;
  if (local) return local;
  if (element.handStyle?.startsWith('custom_gauge:')) {
    return customPointers.find((record) => record.key === element.handStyle)?.dataUrl ?? null;
  }
  return null;
}
