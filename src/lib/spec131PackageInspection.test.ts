import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { generateWatchFaceCode } from './jsCodeGenerator';

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const digits = (prefix: string) => Array.from({ length: 10 }, (_, i) => `${prefix}_${i}.png`);
const bounds = { x: 10, y: 10, width: 100, height: 40 };

function numeric(id: string, dataType: string, extra: Partial<WatchFaceElement> = {}): WatchFaceElement {
  return {
    id, name: id, type: 'TEXT_IMG', dataType, bounds, visible: true, zIndex: 1,
    fontArray: digits(id), ...extra,
  };
}

describe('T026 generated ZPK contract inspection', () => {
  it('packs every Spec 131 runtime reference exactly once in a real nested zip', async () => {
    const weather = Array.from({ length: 29 }, (_, i) => `weather_${i}.png`);
    const moon = Array.from({ length: 7 }, (_, i) => `moon_${i}.png`);
    const humidity = Array.from({ length: 101 }, (_, value) =>
      value <= 30 ? 'humidity_dry.png' : value <= 60 ? 'humidity_ok.png' : 'humidity_wet.png');
    const bio = Array.from({ length: 101 }, (_, value) =>
      value <= 30 ? 'bio_low.png' : value <= 70 ? 'bio_mid.png' : 'bio_high.png');

    const elements: WatchFaceElement[] = [
      numeric('pai', 'PAI_DAILY'),
      numeric('fat', 'FAT_BURNING'),
      numeric('distance', 'DISTANCE', { decimalImage: 'distance_decimal.png' }),
      numeric('spo2', 'SPO2'),
      numeric('aqi', 'AQI'),
      numeric('bio_digits', 'BIO_CHARGE'),
      {
        id: 'sunrise', name: 'Sunrise', type: 'TIME_READING', dataType: 'SUN_RISE',
        bounds: { x: 10, y: 60, width: 130, height: 40 }, visible: true, zIndex: 2,
        fontArray: digits('sunrise'), colonImage: 'sunrise_colon.png', timeReadingDisplay: 'DIGITAL',
      },
      { id: 'weather', name: 'Weather', type: 'IMG_LEVEL', dataType: 'WEATHER_STATUS', bounds, visible: true, zIndex: 3, images: weather },
      { id: 'moon', name: 'Moon', type: 'IMG_LEVEL', dataType: 'MOON', bounds, visible: true, zIndex: 4, images: moon, imageSwitcherFrameCount: 7 },
      { id: 'humidity', name: 'Humidity ranges', type: 'IMG_LEVEL', dataType: 'HUMIDITY', bounds, visible: true, zIndex: 5, images: humidity, imageSwitcherFrameCount: 101 },
      { id: 'bio_ranges', name: 'Bio ranges', type: 'IMG_LEVEL', dataType: 'BIO_CHARGE', bounds, visible: true, zIndex: 6, images: bio, imageSwitcherFrameCount: 101 },
    ];
    const config: WatchFaceConfig = {
      name: 'Spec 131 package audit', watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 }, elements,
      background: { type: 'color', value: '#000000' },
    };
    const code = generateWatchFaceCode(config);
    const referenced = new Set(
      [...code.watchfaceIndexJs.matchAll(/'([^']+\.png)'/g)].map(match => match[1]),
    );
    const expectedAssets = new Set([
      'background.png',
      ...elements.flatMap(element => element.fontArray || []),
      'distance_decimal.png', 'sunrise_colon.png',
      ...weather, ...moon,
      'humidity_dry.png', 'humidity_ok.png', 'humidity_wet.png',
      'bio_low.png', 'bio_mid.png', 'bio_high.png',
    ]);
    expect([...referenced].filter(asset => !expectedAssets.has(asset))).toEqual([]);

    const device = new JSZip();
    device.file('app.json', code.appJson);
    device.file('app.js', code.appJs);
    device.file('watchface/index.js', code.watchfaceIndexJs);
    for (const asset of expectedAssets) device.file(`assets/${asset}`, png);
    const deviceBytes = await device.generateAsync({ type: 'uint8array', compression: 'STORE' });

    const outer = new JSZip();
    outer.file('app.json', code.appJson);
    outer.file('device.zip', deviceBytes);
    outer.file('app-side.zip', await new JSZip().file('app.json', '{}').generateAsync({ type: 'uint8array' }));
    const zpkBytes = await outer.generateAsync({ type: 'uint8array', compression: 'STORE' });

    const inspectedOuter = await JSZip.loadAsync(zpkBytes);
    expect(Object.keys(inspectedOuter.files).sort()).toEqual(['app-side.zip', 'app.json', 'device.zip']);
    const inspectedDevice = await JSZip.loadAsync(await inspectedOuter.file('device.zip')!.async('uint8array'));
    const packageEntries = Object.keys(inspectedDevice.files);
    for (const asset of referenced) {
      expect(packageEntries.filter(path => path === `assets/${asset}`)).toHaveLength(1);
    }
    const runtime = await inspectedDevice.file('watchface/index.js')!.async('string');
    expect(runtime).toContain('hmUI.data_type.PAI_DAILY');
    expect(runtime).toContain('hmUI.data_type.FAT_BURNING');
    expect(runtime).toContain("dont_path: 'distance_decimal.png'");
    expect(runtime).toContain('hmUI.data_type.WEATHER');
    expect(runtime).toContain('hmUI.data_type.MOON');
    expect(runtime).toContain('image_length: 101');
    expect(runtime).not.toMatch(/hmUI\.data_type\.(PAI|FAT_BURN)[,\s]/);
  });
});
