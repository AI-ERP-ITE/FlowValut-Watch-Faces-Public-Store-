import type { WatchFaceElement } from '@/types';
import { gaugePointerAssetName } from '@/lib/gaugePointerDefaults';

export type Surface3dConfig = NonNullable<WatchFaceElement['surface3d']>;
export type Surface3dProfile = Surface3dConfig['profile'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finiteNumber = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const SURFACE_3D_PRESETS: ReadonlyArray<{
  value: Surface3dProfile;
  label: string;
  settings: Pick<Surface3dConfig, 'direction' | 'radius' | 'depth' | 'soften' | 'lightElevation' | 'lightIntensity' | 'diffuse' | 'specular' | 'shininess'>;
}> = [
  { value: 'soft-rounded', label: 'Soft Rounded', settings: { direction: 'raised', radius: 4, depth: 36, soften: 3, lightElevation: 42, lightIntensity: 0.72, diffuse: 0.72, specular: 0.16, shininess: 18 } },
  { value: 'matte-plastic', label: 'Matte Plastic', settings: { direction: 'raised', radius: 3, depth: 42, soften: 2, lightElevation: 48, lightIntensity: 0.68, diffuse: 0.82, specular: 0.12, shininess: 12 } },
  { value: 'polished-metal', label: 'Polished Metal', settings: { direction: 'raised', radius: 3, depth: 56, soften: 1, lightElevation: 38, lightIntensity: 0.78, diffuse: 0.62, specular: 0.46, shininess: 34 } },
  { value: 'controlled-chrome', label: 'Controlled Chrome', settings: { direction: 'raised', radius: 2, depth: 62, soften: 1, lightElevation: 34, lightIntensity: 0.82, diffuse: 0.54, specular: 0.62, shininess: 48 } },
  { value: 'recessed-engraved', label: 'Recessed Engraved', settings: { direction: 'recessed', radius: 3, depth: 44, soften: 2, lightElevation: 45, lightIntensity: 0.7, diffuse: 0.76, specular: 0.18, shininess: 20 } },
] as const;

export const DEFAULT_SURFACE_3D: Surface3dConfig = {
  enabled: false,
  direction: 'raised',
  radius: 4,
  depth: 36,
  soften: 2,
  profile: 'soft-rounded',
  lightAzimuth: 315,
  lightElevation: 42,
  lightColor: '#FFFFFF',
  lightIntensity: 0.72,
  ambientColor: '#FFFFFF',
  ambientIntensity: 0,
  diffuse: 0.72,
  specular: 0.16,
  specularColor: '#FFFFFF',
  shininess: 18,
  fillOpacity: 1,
  effectOpacity: 1,
  scaleWithObject: true,
  rendererVersion: 1,
};

const PROFILE_VALUES = new Set<Surface3dProfile>(SURFACE_3D_PRESETS.map((preset) => preset.value));

export function normalizeSurface3d(input?: Partial<Surface3dConfig> | null): Surface3dConfig {
  const source = input ?? {};
  const profile = PROFILE_VALUES.has(source.profile as Surface3dProfile)
    ? source.profile as Surface3dProfile
    : DEFAULT_SURFACE_3D.profile;
  return {
    enabled: source.enabled === true,
    direction: source.direction === 'recessed' ? 'recessed' : 'raised',
    radius: Math.round(clamp(finiteNumber(source.radius, DEFAULT_SURFACE_3D.radius), 1, 12)),
    depth: clamp(finiteNumber(source.depth, DEFAULT_SURFACE_3D.depth), 0, 100),
    soften: Math.round(clamp(finiteNumber(source.soften, DEFAULT_SURFACE_3D.soften), 0, 8)),
    profile,
    lightAzimuth: ((finiteNumber(source.lightAzimuth, DEFAULT_SURFACE_3D.lightAzimuth) % 360) + 360) % 360,
    lightElevation: clamp(finiteNumber(source.lightElevation, DEFAULT_SURFACE_3D.lightElevation), 15, 75),
    lightColor: /^#[0-9a-f]{6}$/i.test(source.lightColor ?? '') ? source.lightColor! : DEFAULT_SURFACE_3D.lightColor,
    lightIntensity: clamp(finiteNumber(source.lightIntensity, DEFAULT_SURFACE_3D.lightIntensity), 0, 1),
    ambientColor: /^#[0-9a-f]{6}$/i.test(source.ambientColor ?? '') ? source.ambientColor! : DEFAULT_SURFACE_3D.ambientColor,
    ambientIntensity: clamp(finiteNumber(source.ambientIntensity, DEFAULT_SURFACE_3D.ambientIntensity), 0, 0.5),
    diffuse: clamp(finiteNumber(source.diffuse, DEFAULT_SURFACE_3D.diffuse), 0, 1),
    specular: clamp(finiteNumber(source.specular, DEFAULT_SURFACE_3D.specular), 0, 0.75),
    specularColor: /^#[0-9a-f]{6}$/i.test(source.specularColor ?? '')
      ? source.specularColor!
      : (/^#[0-9a-f]{6}$/i.test(source.lightColor ?? '') ? source.lightColor! : DEFAULT_SURFACE_3D.specularColor),
    shininess: clamp(finiteNumber(source.shininess, DEFAULT_SURFACE_3D.shininess), 4, 64),
    fillOpacity: clamp(finiteNumber(source.fillOpacity, DEFAULT_SURFACE_3D.fillOpacity), 0, 1),
    effectOpacity: clamp(finiteNumber(source.effectOpacity, DEFAULT_SURFACE_3D.effectOpacity), 0, 1),
    scaleWithObject: true,
    rendererVersion: 1,
  };
}

export function isSurface3dEnabled(element: Pick<WatchFaceElement, 'surface3d'>): boolean {
  return element.surface3d?.enabled === true;
}

export function isSurface3dEligible(element: Pick<WatchFaceElement, 'type' | 'arcRenderMode'>): boolean {
  if (element.type === 'ARC_PROGRESS') return element.arcRenderMode === 'png-frames';
  return [
    'IMG', 'IMG_STATUS', 'IMG_LEVEL',
    'IMG_TIME', 'IMG_DATE', 'IMG_WEEK', 'TEXT_IMG', 'TIME_READING',
    'TIME_POINTER', 'GAUGE_POINTER',
  ].includes(element.type);
}

export function getSurface3dAssetNames(element: WatchFaceElement): string[] {
  const names: Array<string | undefined> = [];
  if (element.type === 'IMG' || element.type === 'IMG_STATUS') {
    names.push(element.iconKey ? `icon_${element.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.png` : element.src);
  } else if (element.type === 'GAUGE_POINTER') {
    names.push(gaugePointerAssetName(element));
  } else if (element.type === 'TIME_POINTER') {
    names.push(element.hourHandSrc, element.minuteHandSrc, element.hideSeconds ? undefined : element.secondHandSrc, element.coverSrc);
  } else if (element.type === 'ARC_PROGRESS' && element.arcRenderMode === 'png-frames') {
    names.push(element.arcPngTrackSrc, element.arcPngActiveSrc, ...(element.arcPngFrames ?? []));
  } else {
    names.push(
      ...(element.images ?? []), ...(element.fontArray ?? []), element.colonImage,
      element.negativeImage, element.degreeImage, element.percentImage, element.decimalImage,
    );
  }
  return [...new Set(names.filter((name): name is string => !!name && !name.startsWith('data:') && !/^https?:/i.test(name)))];
}

export function replaceSurface3dAssetName(element: WatchFaceElement, sourceName: string, replacementName: string): void {
  const replace = (value?: string) => value === sourceName ? replacementName : value;
  if ((element.type === 'IMG' || element.type === 'IMG_STATUS') && getSurface3dAssetNames(element).includes(sourceName)) {
    element.src = replacementName;
    element.assetFilename = replacementName;
    element.iconKey = undefined;
  }
  if (element.type === 'GAUGE_POINTER' && gaugePointerAssetName(element) === sourceName) {
    element.src = replacementName;
    element.assetFilename = replacementName;
  }
  if (element.type === 'TIME_POINTER') {
    element.hourHandSrc = replace(element.hourHandSrc);
    element.minuteHandSrc = replace(element.minuteHandSrc);
    element.secondHandSrc = replace(element.secondHandSrc);
    element.coverSrc = replace(element.coverSrc);
  }
  element.images = element.images?.map((name) => replace(name)!);
  element.fontArray = element.fontArray?.map((name) => replace(name)!);
  element.colonImage = replace(element.colonImage);
  element.negativeImage = replace(element.negativeImage);
  element.degreeImage = replace(element.degreeImage);
  element.percentImage = replace(element.percentImage);
  element.decimalImage = replace(element.decimalImage);
  element.arcPngTrackSrc = replace(element.arcPngTrackSrc);
  element.arcPngActiveSrc = replace(element.arcPngActiveSrc);
  element.arcPngFrames = element.arcPngFrames?.map((name) => replace(name)!);
}

function blurHeightField(source: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius <= 0) return source;
  const horizontal = new Float32Array(source.length);
  const output = new Float32Array(source.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        sum += source[y * width + clamp(x + offset, 0, width - 1)];
      }
      horizontal[y * width + x] = sum / (radius * 2 + 1);
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        sum += horizontal[clamp(y + offset, 0, height - 1) * width + x];
      }
      output[y * width + x] = sum / (radius * 2 + 1);
    }
  }
  return output;
}

function parseHex(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** Pure deterministic pixel renderer shared by canvas preview and export baking. */
export function renderSurface3dPixels(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  rawConfig?: Partial<Surface3dConfig> | null,
): Uint8ClampedArray {
  const config = normalizeSurface3d(rawConfig);
  const output = new Uint8ClampedArray(input);
  if (!config.enabled || width < 3 || height < 3 || input.length !== width * height * 4) return output;

  const alphaHeight = new Float32Array(width * height);
  for (let pixel = 0; pixel < alphaHeight.length; pixel += 1) alphaHeight[pixel] = input[pixel * 4 + 3] / 255;
  const softened = blurHeightField(alphaHeight, width, height, Math.min(config.soften, Math.floor(Math.min(width, height) / 4)));
  const sampleRadius = Math.max(1, Math.min(config.radius, Math.floor(Math.min(width, height) / 3)));
  const azimuth = config.lightAzimuth * Math.PI / 180;
  const elevation = config.lightElevation * Math.PI / 180;
  const lightX = Math.cos(elevation) * Math.cos(azimuth);
  const lightY = Math.cos(elevation) * Math.sin(azimuth);
  const lightZ = Math.sin(elevation);
  const halfLength = Math.hypot(lightX, lightY, lightZ + 1) || 1;
  const halfX = lightX / halfLength;
  const halfY = lightY / halfLength;
  const halfZ = (lightZ + 1) / halfLength;
  const direction = config.direction === 'recessed' ? -1 : 1;
  const depthScale = direction * (config.depth / 100) * 5;
  const light = parseHex(config.lightColor);
  const ambient = parseHex(config.ambientColor);
  const specularLight = parseHex(config.specularColor);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const offset = pixel * 4;
      const alpha = input[offset + 3];
      if (alpha === 0) continue;
      const left = softened[y * width + Math.max(0, x - sampleRadius)];
      const right = softened[y * width + Math.min(width - 1, x + sampleRadius)];
      const top = softened[Math.max(0, y - sampleRadius) * width + x];
      const bottom = softened[Math.min(height - 1, y + sampleRadius) * width + x];
      let normalX = -(right - left) * depthScale;
      let normalY = -(bottom - top) * depthScale;
      let normalZ = 1;
      const normalLength = Math.hypot(normalX, normalY, normalZ) || 1;
      normalX /= normalLength; normalY /= normalLength; normalZ /= normalLength;
      const lambert = Math.max(0, normalX * lightX + normalY * lightY + normalZ * lightZ);
      const diffuseDelta = (lambert - lightZ) * config.diffuse * config.lightIntensity;
      const specularDot = Math.max(0, normalX * halfX + normalY * halfY + normalZ * halfZ);
      const specular = Math.pow(specularDot, config.shininess) * config.specular * config.lightIntensity;
      const sourceChannels = [input[offset], input[offset + 1], input[offset + 2]];
      for (let channel = 0; channel < 3; channel += 1) {
        const base = sourceChannels[channel] * config.fillOpacity;
        const ambientBase = base + (ambient[channel] - base) * config.ambientIntensity;
        const diffuseValue = diffuseDelta >= 0
          ? ambientBase + (light[channel] - ambientBase) * diffuseDelta
          : ambientBase * (1 + diffuseDelta * 0.85);
        const effected = diffuseValue + (specularLight[channel] - diffuseValue) * specular;
        output[offset + channel] = Math.round(clamp(sourceChannels[channel] * (1 - config.effectOpacity) + effected * config.effectOpacity, 0, 255));
      }
      // Preserve the opaque core; remove only fringe pixels unsafe for the watch alpha pipeline.
      if (alpha < 8) {
        output[offset] = 0; output[offset + 1] = 0; output[offset + 2] = 0; output[offset + 3] = 0;
      } else {
        output[offset + 3] = alpha;
      }
    }
  }
  return output;
}

export function bakeSurface3dToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  config?: Partial<Surface3dConfig> | null,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const normalized = normalizeSurface3d(config);
  if (!normalized.enabled) return canvas;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  image.data.set(renderSurface3dPixels(image.data, canvas.width, canvas.height, normalized));
  context.putImageData(image, 0, 0);
  return canvas;
}
