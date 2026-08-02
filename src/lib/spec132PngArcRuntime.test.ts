import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { generateWatchFaceCode } from './jsCodeGenerator';

const bounds = { x: 40, y: 50, width: 120, height: 120 };

function config(element: WatchFaceElement): WatchFaceConfig {
  return {
    name: 'Spec 132 PNG Arc',
    watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' },
    elements: [element],
  };
}

function nativeArc(extra: Partial<WatchFaceElement> = {}): WatchFaceElement {
  return {
    id: 'arc', type: 'ARC_PROGRESS', name: 'Battery Arc', dataType: 'BATTERY',
    bounds, visible: true, zIndex: 2, center: { x: 100, y: 110 }, radius: 50,
    startAngle: -120, endAngle: 120, lineWidth: 8, color: '0x12AB34', ...extra,
  };
}

describe('Spec 132 PNG Arc runtime contract', () => {
  it('keeps missing mode and explicit native mode byte-identical', () => {
    const legacy = generateWatchFaceCode(config(nativeArc())).watchfaceIndexJs;
    const explicit = generateWatchFaceCode(config(nativeArc({ arcRenderMode: 'native' }))).watchfaceIndexJs;
    expect(explicit).toBe(legacy);
    expect(legacy).toContain('hmUI.widget.ARC_PROGRESS');
    expect(legacy).not.toContain('PNG Arc image progress');
  });

  it('emits track plus ordered IMG_LEVEL frames and no native arc', () => {
    const frames = Array.from({ length: 11 }, (_, index) => `png_arc_main_arc_${String(index).padStart(2, '0')}.png`);
    const runtime = generateWatchFaceCode(config(nativeArc({
      arcRenderMode: 'png-frames',
      arcPngTrackSrc: 'png_arc_track_main_arc.png',
      arcPngFrames: frames,
      arcPngFrameCount: 11,
    }))).watchfaceIndexJs;

    expect(runtime).toContain('PNG Arc static track');
    expect(runtime).toContain("src: 'png_arc_track_main_arc.png'");
    expect(runtime).toContain('hmUI.widget.IMG_LEVEL');
    expect(runtime).toContain('image_length: 11');
    expect(runtime).toContain('type: hmUI.data_type.BATTERY');
    expect(runtime).not.toContain('hmUI.widget.ARC_PROGRESS');
    expect(runtime.indexOf(frames[0])).toBeLessThan(runtime.indexOf(frames[10]));
  });

  it('resolves every PNG Arc runtime reference in a nested package', async () => {
    const frames = Array.from({ length: 11 }, (_, index) => `png_arc_main_arc_${String(index).padStart(2, '0')}.png`);
    const track = 'png_arc_track_main_arc.png';
    const generated = generateWatchFaceCode(config(nativeArc({
      arcRenderMode: 'png-frames', arcPngTrackSrc: track,
      arcPngFrames: frames, arcPngFrameCount: 11,
    })));
    const expected = new Set(['background.png', track, ...frames]);
    const referenced = new Set(
      [...generated.watchfaceIndexJs.matchAll(/['"]([^'"]+\.png)['"]/g)].map(match => match[1]),
    );
    expect([...referenced].filter(name => !expected.has(name))).toEqual([]);

    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const device = new JSZip();
    device.file('watchface/index.js', generated.watchfaceIndexJs);
    for (const asset of expected) device.file(`assets/${asset}`, pngHeader);
    const outer = new JSZip();
    outer.file('device.zip', await device.generateAsync({ type: 'uint8array', compression: 'STORE' }));

    const reopened = await JSZip.loadAsync(await outer.generateAsync({ type: 'uint8array', compression: 'STORE' }));
    const reopenedDevice = await JSZip.loadAsync(await reopened.file('device.zip')!.async('uint8array'));
    for (const asset of referenced) {
      expect(reopenedDevice.file(`assets/${asset}`), asset).not.toBeNull();
    }
  });
});
