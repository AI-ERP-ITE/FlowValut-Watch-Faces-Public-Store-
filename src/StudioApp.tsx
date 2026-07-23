import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, Sparkles, Wand2, Settings, Eye, EyeOff, Grid3X3, Undo2, Redo2, Plus, FlaskConical, AlertTriangle, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import { Header } from '@/components/Header';
import { UploadZone } from '@/components/UploadZone';
import { QRDisplay } from '@/components/QRDisplay';
import { StepIndicator } from '@/components/StepIndicator';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ElementList } from '@/components/ElementList';
import { InteractiveCanvas, type CalibrationMode, type ElementWarningsMap } from '@/components/InteractiveCanvas';
import { PropertyPanel } from '@/components/PropertyPanel';

import { useApp, actions } from '@/context/AppContext';
import { buildZPK } from '@/lib/zpkBuilder';
import { FONT_STYLES } from '@/lib/fontLibrary';
import { uploadStudioArtifactsToFirebase, publishStudioWatchfaceToFirebase, fetchAdminCatalogFromFirebase, type StudioUploadResult } from '@/lib/studioFirebasePublishApi';
import { generateQRCode } from '@/lib/qrGenerator';
import { getIconByKey } from '@/lib/iconLibrary';
import { testApiKey, type AIProvider } from '@/lib/aiService';
import { runPipeline } from '@/pipeline';
import { extractElementsFromImage, type PipelineAIProvider } from '@/pipeline/pipelineAIService';
import { generatePipelineAssets, generateCurvedTextImage } from '@/pipeline/assetImageGenerator';
import { generateHandSet } from '@/lib/handStyles';
import type { HandStyleKey } from '@/lib/handStyles';
import { generateWeatherSet } from '@/lib/weatherIconSets';

import { buildSourceJson } from '@/lib/sourceJsonGenerator';
import { captureStorePreviews } from '@/lib/storePreviewCapture';
import { fetchPublicConfig } from '@/lib/studioFirebasePublishApi';
import { PublishForm } from '@/components/PublishForm';
import { AdminPanel } from '@/components/AdminPanel';
import type { CatalogEntry, SpecGroup } from '@/context/CatalogContext';
import type { BackgroundTransform, WatchFaceConfig, WatchFaceElement, ElementImage } from '@/types';
import { generateId } from '@/lib/utils';
import { parseDom } from '@/html/parseDom';
import { mapDomToElements } from '@/html/mapDomToElements';
import { BackgroundCropTool } from '@/components/BackgroundCropTool';
import { BackgroundPhotoEditor } from '@/components/BackgroundPhotoEditor';
import { DesignInput } from '@/components/DesignInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IconLab } from '@/components/IconLab';
import ImageSwitcherLab from '@/components/ImageSwitcherLab';
import { loadCustomIcons } from '@/lib/customIconStore';
import { loadCustomFonts, registerCustomFonts } from '@/lib/customFontStore';
import { registerCustomIconsInLibrary } from '@/lib/iconLibrary';
import { registerCustomFontsInLibrary } from '@/lib/fontLibrary';
import { getCustomHandSourceKind, loadCustomHandStyles, getCustomHandByKey, resolveCustomHandPack, type CustomHandRecord } from '@/lib/customHandStore';
import { loadCustomGaugePointers, type CustomGaugePointerRecord } from '@/lib/customGaugePointerStore';
import { loadSwitcherDefinitions, getSwitcherDefinition } from '@/lib/imageSwitcherStore';
import { pullSwitcherDefinitions } from '@/lib/imageSwitcherSync';
import type { ImageSwitcherDefinition } from '@/types/imageSwitcher';

import { pullLabAssetsFromFirestore, backfillIconsToFirestore, backfillGaugePointersToFirestore, backfillHandsToFirestore } from '@/lib/firestoreLabSync';
import { subscribeAuthState } from '@/lib/firebaseAuthClient';
import {
  POINTER_PARITY_TOLERANCE,
  createMissingStageParityResult,
  runPointerParityChecks,
} from '@/lib/pointerParity';
import { createParityCaptureSession, isInvestigationModeEnabled } from '@/lib/parityCapture';
import { normalizePointerEffects } from '@/lib/pointerEffects';
import { normalizeEngraveFrameForParity, renderEngraveFrameEffect } from '@/lib/engraveFrameRenderer';
import { bakeDeterministicColorAdjustments, bakeDeterministicIconEffects } from '@/lib/effectsBakeEngine';
import { dropShadowPaddingForBake, normalizeDropShadowForBake, pointerEffectPaddingFromIntensity, pointerShadowToDropShadow } from '@/lib/effectNormalization';
import {
  DEFAULT_GAUGE_POINTER_FILENAME,
  createDefaultGaugePointerDataUrl,
  gaugePointerAssetName,
  normalizeGaugePivot,
} from '@/lib/gaugePointerDefaults';
import { detectGauge } from '@/lib/gaugeDetector';
import { renderGaugeAssets } from '@/lib/gaugeRenderer';
import {
  getAllowedDataTypesForElement,
  getDataTypeLabel,
  getTextImgPrefixForDataType,
  resolveImageSwitcherFrameCount,
  normalizeDataTypeForElement,
} from '@/lib/elementDataRules';
import { drawOpticallyCenteredDigit, trimHorizontalTransparentPadding } from '@/lib/digitOpticalCentering'; // @deprecated by Spec 114
import { generateOptimizedDigitBitmaps } from '@/lib/digitBitmapGeometry';
import { computeDigitBitmapLayout, getDigitPreviewValue, type DigitBitmapMetrics } from '@/lib/digitLayoutEngine';
import { buildProjectFileConfig } from '@/lib/projectFileConfig';
import { createProjectFileArtifact, createProjectFileBlob, parseProjectFileArtifact } from '@/lib/projectFileArtifact';
import { createWorkshopBuild, createWorkshopProject, dataUrlToBlob, fetchWorkshopProjectFile } from '@/lib/workshopApi';
import { storeArchitectureFlags } from '@/lib/storeArchitecture';
import {
  canvasResolutionsMatch,
  isValidCanvasResolution,
  rearrangeProjectPositions,
  type CanvasResolution,
} from '@/lib/projectCanvasGeometry';
import { completeDayAssetNames, isCompleteDayImageMode } from '@/lib/dateImageMode';
// DigitBitmapMetrics import removed by Spec 114
import type { PointerParityResult, PointerParityStage } from '@/types';

interface PendingProjectLoad {
  config: WatchFaceConfig;
  backgroundImage: string | null;
  fileName: string;
  restoreBackground: boolean;
  targetResolution: CanvasResolution;
  targetWatchModel: string;
}

interface PendingWorkshopSave {
  projectId: string | null;
  workshopLabel: string;
  resolution: { width: number; height: number };
  specGroup?: string;
  parentBuildId?: string;
  fvwf: Blob;
  zpk: Blob;
  mainPreview?: Blob;
  aodPreview?: Blob;
}

/** Serialize the full watchface config to a .fvwf project file and trigger a browser download. */
function downloadProjectFile(config: WatchFaceConfig, backgroundImage: string | null): void {
  const blob = createProjectFileBlob(createProjectFileArtifact(config, backgroundImage));
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const safeName = (config.name || 'watchface').replace(/[^a-zA-Z0-9_-]/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_${date}.fvwf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function withNormalizedPointerEffects(config: WatchFaceConfig): WatchFaceConfig {
  const normalizeSet = (input: WatchFaceElement[]) => input.map((el) => {
    if (el.type !== 'TIME_POINTER' && el.type !== 'GAUGE_POINTER') return el;
    const effects = normalizePointerEffects(el);
    const gaugePivot = el.type === 'GAUGE_POINTER' ? normalizeGaugePivot(el) : null;
    return {
      ...el,
      pointerBrightness: effects.brightness,
      pointerContrast: effects.contrast,
      pointerSaturation: effects.saturation,
      pointerHue: effects.hue,
      pointerOpacity: effects.opacity,
      ...(gaugePivot
        ? {
            pivotX: gaugePivot.pivotX,
            pivotY: gaugePivot.pivotY,
          }
        : {}),
    };
  });

  return {
    ...config,
    elements: normalizeSet(config.elements),
    aodElements: config.aodElements ? normalizeSet(config.aodElements) : config.aodElements,
    backgroundTransform: normalizeBackgroundTransform(config.backgroundTransform),
    aodBackgroundTransform: normalizeBackgroundTransform(config.aodBackgroundTransform),
  };
}

const DEFAULT_BACKGROUND_TRANSFORM: BackgroundTransform = {
  angle: 0,
  flipH: false,
  flipV: false,
};

function normalizeBackgroundTransform(input?: BackgroundTransform | null): BackgroundTransform {
  const angleRaw = Number(input?.angle ?? 0);
  const clampedAngle = Number.isFinite(angleRaw) ? Math.max(-360, Math.min(360, angleRaw)) : 0;
  return {
    angle: clampedAngle,
    flipH: !!input?.flipH,
    flipV: !!input?.flipV,
  };
}

function weatherTempDigitFilenames(): string[] {
  return Array.from({ length: 10 }, (_, i) => `temp_digit_${i}.png`);
}

function isWeatherImgLevelDataType(dataType: string | undefined): boolean {
  return dataType === 'WEATHER_CURRENT' || dataType === 'WEATHER_STATUS';
}

function createImageSwitcherPlaceholderDataUrl(
  label: string,
  index: number,
  width: number,
  height: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(20, width);
  canvas.height = Math.max(20, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const seed = Array.from(label).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const hue = (seed + index * 37) % 360;
  const bgA = `hsl(${hue}deg 65% 35%)`;
  const bgB = `hsl(${(hue + 28) % 360}deg 70% 22%)`;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, bgA);
  gradient.addColorStop(1, bgB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(12, Math.floor(canvas.height * 0.42))}px Arial`;
  ctx.fillText(String(index + 1), canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL('image/png');
}

function stampGaugePairIds(elements: WatchFaceElement[]): WatchFaceElement[] {
  const next = elements.map((el) => ({ ...el }));
  const arcByType = new Map<string, WatchFaceElement>();
  const pointerByType = new Map<string, WatchFaceElement>();

  for (const el of next) {
    if (!el.dataType) continue;
    if (el.type === 'ARC_PROGRESS' && !arcByType.has(el.dataType)) arcByType.set(el.dataType, el);
    if (el.type === 'GAUGE_POINTER' && !pointerByType.has(el.dataType)) pointerByType.set(el.dataType, el);
  }

  for (const [dataType, arc] of arcByType.entries()) {
    const pointer = pointerByType.get(dataType);
    if (!pointer) continue;
    const pairId = arc.gaugePairId ?? pointer.gaugePairId ?? `gauge_pair_${dataType.toLowerCase()}_${arc.id.slice(0, 6)}`;
    arc.gaugePairId = pairId;
    pointer.gaugePairId = pairId;
  }

  return next;
}

// Mock Kimi analysis - simulates AI analysis
async function mockKimiAnalysis(
  _backgroundImage: string,
  _fullDesignImage: string,
  watchModel: string
): Promise<{ config: WatchFaceConfig; elementImages: ElementImage[] }> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Parse watch model for resolution
  const resolutions: Record<string, { width: number; height: number }> = {
    // Names exactly match models.json `name` field for correct specGroup + deviceSources lookup
    'Amazfit Balance 2': { width: 480, height: 480 },
    'Amazfit Balance': { width: 480, height: 480 },
    'Amazfit Active Max': { width: 480, height: 480 },
    'Amazfit Active 3 Premium': { width: 466, height: 466 },
    'Amazfit Active 2 (Round)': { width: 466, height: 466 },
    'Amazfit Active 2 (Square)': { width: 390, height: 450 },
    'Amazfit Active': { width: 390, height: 450 },
    'Pop 3S (PIB)': { width: 410, height: 502 },  // not in models.json yet
    'Amazfit GTR 4': { width: 466, height: 466 },
    'Amazfit GTS 4': { width: 390, height: 450 },
    'Amazfit Cheetah Pro': { width: 480, height: 480 },
    'Amazfit T-Rex 2': { width: 454, height: 454 },
    'Amazfit Falcon': { width: 416, height: 416 },
  };

  const resolution = resolutions[watchModel] || { width: 466, height: 466 };

  // Generate mock elements - ALL widget types for Balance 2 V2 format
  // Covers every generator code path + all proven data_types from Zepp OS v1.0
  const cx = Math.floor(resolution.width / 2);
  const cy = Math.floor(resolution.height / 2);
  const elements: WatchFaceElement[] = [
    // ===== BACKGROUND =====
    {
      id: generateId(),
      type: 'IMG',
      name: 'Background',
      bounds: { x: 0, y: 0, width: resolution.width, height: resolution.height },
      src: 'background_ed15585c.png',
      visible: true,
      zIndex: 0,
    },
    // ===== TIME (IMG_TIME - name-matched) =====
    {
      id: generateId(),
      type: 'IMG',
      name: 'Time Display',
      bounds: { x: 25, y: 220, width: 150, height: 60 },
      src: 'time_digit_0.png',
      visible: true,
      zIndex: 5,
    },
    // ===== DATE (IMG_DATE day - name-matched) =====
    {
      id: generateId(),
      type: 'IMG',
      name: 'Date',
      bounds: { x: 92, y: 198, width: 40, height: 30 },
      src: 'date_digit_0.png',
      visible: true,
      zIndex: 5,
    },
    // ===== MONTH (IMG_DATE month - name-matched) =====
    {
      id: generateId(),
      type: 'IMG',
      name: 'Month',
      bounds: { x: 130, y: 198, width: 40, height: 30 },
      src: 'month_0.png',
      visible: true,
      zIndex: 5,
    },
    // ===== WEEKDAY (IMG_WEEK - name-matched) =====
    {
      id: generateId(),
      type: 'IMG',
      name: 'Weekday',
      bounds: { x: 33, y: 198, width: 20, height: 30 },
      src: 'week_0.png',
      visible: true,
      zIndex: 5,
    },
    // ===== ANALOG CLOCK HANDS (TIME_POINTER) =====
    {
      id: generateId(),
      type: 'TIME_POINTER',
      name: 'Analog Clock Hands',
      bounds: { x: cx - 40, y: cy - 40, width: 80, height: 80 },
      center: { x: cx, y: cy },
      hourHandSrc: 'hour_hand.png',
      minuteHandSrc: 'minute_hand.png',
      secondHandSrc: 'second_hand.png',
      coverSrc: 'hand_cover.png',
      hourPos: { x: 11, y: 118 },
      minutePos: { x: 8, y: 172 },
      secondPos: { x: 4, y: 180 },
      handHubScale: 1,
      visible: true,
      zIndex: 15,
    },
    // ===== BATTERY ARC (ARC_PROGRESS) =====
    {
      id: generateId(),
      type: 'ARC_PROGRESS',
      name: 'Battery Arc',
      bounds: { x: cx - 80, y: 50, width: 160, height: 160 },
      center: { x: cx, y: 130 },
      radius: 70,
      startAngle: -90,
      endAngle: 270,
      lineWidth: 8,
      color: '0x00CC88',
      dataType: 'BATTERY',
      visible: true,
      zIndex: 5,
    },
    // ===== BATTERY VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'Battery Value',
      bounds: { x: cx - 25, y: 118, width: 50, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `batt_digit_${i}.png`),
      dataType: 'BATTERY',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== HEART RATE ARC (ARC_PROGRESS) =====
    {
      id: generateId(),
      type: 'ARC_PROGRESS',
      name: 'Heart Rate Arc',
      bounds: { x: 30, y: cy - 50, width: 100, height: 100 },
      center: { x: 80, y: cy },
      radius: 40,
      startAngle: -90,
      endAngle: 270,
      lineWidth: 6,
      color: '0xFF6B6B',
      dataType: 'HEART',
      visible: true,
      zIndex: 5,
    },
    // ===== HEART RATE VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'Heart Rate Value',
      bounds: { x: 55, y: cy - 12, width: 50, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `heart_digit_${i}.png`),
      dataType: 'HEART',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== STEPS ARC (ARC_PROGRESS) =====
    {
      id: generateId(),
      type: 'ARC_PROGRESS',
      name: 'Steps Arc',
      bounds: { x: resolution.width - 130, y: cy - 50, width: 100, height: 100 },
      center: { x: resolution.width - 80, y: cy },
      radius: 40,
      startAngle: -90,
      endAngle: 270,
      lineWidth: 6,
      color: '0xFFD93D',
      dataType: 'STEP',
      visible: true,
      zIndex: 5,
    },
    // ===== STEPS VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'Steps Value',
      bounds: { x: resolution.width - 105, y: cy - 12, width: 50, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `step_digit_${i}.png`),
      dataType: 'STEP',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== CALORIES VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'Calories Value',
      bounds: { x: 55, y: cy + 60, width: 60, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `cal_digit_${i}.png`),
      dataType: 'CAL',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== DISTANCE VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'Distance Value',
      bounds: { x: resolution.width - 115, y: cy + 60, width: 60, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `dist_digit_${i}.png`),
      dataType: 'DIST',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== PAI/BIO CHARGE VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'PAI Value',
      bounds: { x: cx - 30, y: resolution.height - 80, width: 60, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `pai_digit_${i}.png`),
      dataType: 'PAI_DAILY',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== SPO2 VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'SpO2 Value',
      bounds: { x: cx - 30, y: 50, width: 60, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `spo2_digit_${i}.png`),
      dataType: 'SPO2',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== HUMIDITY VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'Humidity Value',
      bounds: { x: 30, y: resolution.height - 55, width: 50, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `hum_digit_${i}.png`),
      dataType: 'HUMIDITY',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== UVI VALUE (TEXT_IMG) =====
    {
      id: generateId(),
      type: 'TEXT_IMG',
      name: 'UV Index Value',
      bounds: { x: resolution.width - 80, y: resolution.height - 55, width: 50, height: 25 },
      fontArray: Array.from({length: 10}, (_, i) => `uvi_digit_${i}.png`),
      dataType: 'UVI',
      hSpace: 1,
      alignH: 'CENTER_H',
      visible: true,
      zIndex: 6,
    },
    // ===== ACTIVITY ARC (ARC_PROGRESS) =====
    {
      id: generateId(),
      type: 'ARC_PROGRESS',
      name: 'Activity Arc',
      bounds: { x: cx - 55, y: resolution.height - 120, width: 110, height: 110 },
      center: { x: cx, y: resolution.height - 65 },
      radius: 50,
      startAngle: -120,
      endAngle: 120,
      lineWidth: 6,
      color: '0x6BCB77',
      dataType: 'STEP',
      visible: true,
      zIndex: 5,
    },
    // ===== WEATHER ICON (IMG_LEVEL) =====
    {
      id: generateId(),
      type: 'IMG_LEVEL',
      name: 'Weather Icon',
      bounds: { x: 60, y: resolution.height - 60, width: 40, height: 40 },
      images: generateWeatherSet('flat'),
      dataType: 'WEATHER_STATUS',
      weatherStyle: 'flat',
      visible: true,
      zIndex: 6,
    },
    // ===== BLUETOOTH STATUS (IMG_STATUS) =====
    {
      id: generateId(),
      type: 'IMG_STATUS',
      name: 'Bluetooth Status',
      bounds: { x: cx - 15, y: resolution.height - 60, width: 30, height: 30 },
      src: 'bluetooth_30x30.png',
      statusType: 'DISCONNECT',
      visible: true,
      zIndex: 6,
    },
    // ===== DND STATUS (IMG_STATUS) =====
    {
      id: generateId(),
      type: 'IMG_STATUS',
      name: 'DND Status',
      bounds: { x: cx + 20, y: resolution.height - 60, width: 30, height: 30 },
      src: 'dnd_30x30.png',
      statusType: 'DISTURB',
      visible: true,
      zIndex: 6,
    },
    // ===== ALARM STATUS (IMG_STATUS) =====
    {
      id: generateId(),
      type: 'IMG_STATUS',
      name: 'Alarm Status',
      bounds: { x: cx + 55, y: resolution.height - 60, width: 30, height: 30 },
      src: 'alarm_30x30.png',
      statusType: 'CLOCK',
      visible: true,
      zIndex: 6,
    },
    // ===== CITY NAME (TEXT) =====
    {
      id: generateId(),
      type: 'TEXT',
      name: 'City Name',
      bounds: { x: cx - 70, y: resolution.height - 35, width: 140, height: 25 },
      text: '',
      fontSize: 18,
      color: '0xCCCCCCFF',
      visible: true,
      zIndex: 6,
    },
    // ===== BATTERY DECORATION (CIRCLE) =====
    {
      id: generateId(),
      type: 'CIRCLE',
      name: 'Battery Ring Decor',
      bounds: { x: cx - 80, y: 48, width: 160, height: 160 },
      center: { x: cx, y: 130 },
      radius: 78,
      color: '0x333333',
      visible: true,
      zIndex: 4,
    },
    // ===== HEART DECORATION (CIRCLE) =====
    {
      id: generateId(),
      type: 'CIRCLE',
      name: 'Heart Ring Decor',
      bounds: { x: 28, y: cy - 52, width: 104, height: 104 },
      center: { x: 80, y: cy },
      radius: 48,
      color: '0x333333',
      visible: true,
      zIndex: 4,
    },
    // ===== STEPS DECORATION (CIRCLE) =====
    {
      id: generateId(),
      type: 'CIRCLE',
      name: 'Steps Ring Decor',
      bounds: { x: resolution.width - 132, y: cy - 52, width: 104, height: 104 },
      center: { x: resolution.width - 80, y: cy },
      radius: 48,
      color: '0x333333',
      visible: true,
      zIndex: 4,
    },
    // ===== HEART ICON (static IMG) =====
    {
      id: generateId(),
      type: 'IMG',
      name: 'Heart Icon',
      bounds: { x: 68, y: cy - 35, width: 24, height: 20 },
      src: 'icon_heart_24x20.png',
      visible: true,
      zIndex: 7,
    },
    // ===== STEPS ICON (static IMG) =====
    {
      id: generateId(),
      type: 'IMG',
      name: 'Steps Icon',
      bounds: { x: resolution.width - 92, y: cy - 35, width: 24, height: 24 },
      src: 'icon_steps_24x24.png',
      visible: true,
      zIndex: 7,
    },
    // ===== BATTERY ICON (static IMG) =====
    {
      id: generateId(),
      type: 'IMG',
      name: 'Battery Icon Label',
      bounds: { x: cx - 12, y: 96, width: 24, height: 14 },
      src: 'icon_batt_24x14.png',
      visible: true,
      zIndex: 7,
    },
    // NOTE: Default invisible BUTTON shortcuts removed — shortcuts are now bound per-widget
    // via PropertyPanel "App Shortcut" dropdown, which emits an IMG_CLICK overlay matching
    // the widget's own bounds (Spec 009 T014).
  ];

  // Generate mock element images - create proper watch hand/element graphics
  console.log('[Mock] Starting element image generation for', elements.length, 'elements');
  const elementImages: ElementImage[] = [];
  
  // Helper: create a canvas image and return as dataUrl
  function createCanvasImage(width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      drawFn(ctx, width, height);
    }
    return canvas.toDataURL('image/png');
  }
  
  // Helper: draw a digit on canvas
  function drawDigit(ctx: CanvasRenderingContext2D, w: number, h: number, digit: string, color: string) {
    drawOpticallyCenteredDigit(
      ctx,
      w,
      h,
      digit,
      color,
      `bold ${Math.floor(h * 0.7)}px Arial`,
    );
  }

  function makeTrimmedDigitImage(
    filename: string,
    digit: string,
    color: string,
    size: { w: number; h: number },
    type: 'IMG' | 'TEXT_IMG',
  ): ElementImage {
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, size.w, size.h);
      drawDigit(ctx, size.w, size.h, digit, color);
    }
    const trimmed = trimHorizontalTransparentPadding(canvas);
    return {
      name: filename,
      dataUrl: trimmed.canvas.toDataURL('image/png'),
      bounds: { x: 0, y: 0, width: trimmed.width, height: trimmed.height },
      type,
    };
  }
  
  // Generate TIME digit images (0-9) - used by IMG_TIME for hours and minutes
  const timeDigitSize = { w: 30, h: 50 };
  for (let i = 0; i < 10; i++) {
    const filename = `time_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#FFFFFF', timeDigitSize, 'IMG'));
  }
  
  // Generate DATE digit images (0-9) - used by IMG_DATE for day numbers
  const dateDigitSize = { w: 20, h: 30 };
  for (let i = 0; i < 10; i++) {
    const filename = `date_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#CCCCCC', dateDigitSize, 'IMG'));
  }
  
  // Generate WEEK images (7 days) - used by IMG_WEEK
  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const weekSize = { w: 40, h: 20 };
  for (let i = 0; i < 7; i++) {
    const filename = `week_${i}.png`;
    const dataUrl = createCanvasImage(weekSize.w, weekSize.h, (ctx, w, h) => {
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${Math.floor(h * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(weekDays[i], w / 2, h / 2);
    });
    elementImages.push({
      name: filename,
      dataUrl,
      bounds: { x: 0, y: 0, width: weekSize.w, height: weekSize.h },
      type: 'IMG',
    });
  }
  
  // Generate BATTERY digit images (0-9) - used by TEXT_IMG for battery %
  const battDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `batt_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#00CC88', battDigitSize, 'TEXT_IMG'));
  }

  // Generate HEART RATE digit images (0-9) - used by TEXT_IMG
  const heartDigitSize = { w: 18, h: 30 };
  for (let i = 0; i < 10; i++) {
    const filename = `heart_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#FF6B6B', heartDigitSize, 'TEXT_IMG'));
  }

  // Generate STEPS digit images (0-9) - used by TEXT_IMG
  const stepDigitSize = { w: 18, h: 30 };
  for (let i = 0; i < 10; i++) {
    const filename = `step_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#FFD93D', stepDigitSize, 'TEXT_IMG'));
  }

  // Generate CALORIES digit images (0-9) - used by TEXT_IMG CAL
  const calDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `cal_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#FF9F43', calDigitSize, 'TEXT_IMG'));
  }

  // Generate DISTANCE digit images (0-9) - used by TEXT_IMG DIST
  const distDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `dist_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#54A0FF', distDigitSize, 'TEXT_IMG'));
  }

  // Generate PAI digit images (0-9) - used by TEXT_IMG PAI_DAILY
  const paiDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `pai_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#5F27CD', paiDigitSize, 'TEXT_IMG'));
  }

  // Generate SPO2 digit images (0-9) - used by TEXT_IMG SPO2
  const spo2DigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `spo2_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#EE5A24', spo2DigitSize, 'TEXT_IMG'));
  }

  // Generate HUMIDITY digit images (0-9) - used by TEXT_IMG HUMIDITY
  const humDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `hum_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#0ABDE3', humDigitSize, 'TEXT_IMG'));
  }

  // Generate UVI digit images (0-9) - used by TEXT_IMG UVI
  const uviDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `uvi_digit_${i}.png`;
    elementImages.push(makeTrimmedDigitImage(filename, String(i), '#FFC312', uviDigitSize, 'TEXT_IMG'));
  }

  // Generate MONTH images (0-11) - used by IMG_DATE month (12-image array)
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthSize = { w: 40, h: 20 };
  for (let i = 0; i < 12; i++) {
    const filename = `month_${i}.png`;
    const dataUrl = createCanvasImage(monthSize.w, monthSize.h, (ctx, w, h) => {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = `bold ${Math.floor(h * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(monthNames[i], w / 2, h / 2);
    });
    elementImages.push({ name: filename, dataUrl, bounds: { x: 0, y: 0, width: monthSize.w, height: monthSize.h }, type: 'IMG' });
  }

  // Generate DND icon for IMG_STATUS (DISTURB)
  const dndSize = 30;
  const dndDataUrl = createCanvasImage(dndSize, dndSize, (ctx, w) => {
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.25, w / 2);
    ctx.lineTo(w * 0.75, w / 2);
    ctx.stroke();
  });
  elementImages.push({ name: 'dnd_30x30.png', dataUrl: dndDataUrl, bounds: { x: 0, y: 0, width: dndSize, height: dndSize }, type: 'IMG_STATUS' });

  // Generate Alarm icon for IMG_STATUS (CLOCK)
  const alarmSize = 30;
  const alarmDataUrl = createCanvasImage(alarmSize, alarmSize, (ctx, w) => {
    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, w * 0.55, w * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    // Bell top
    ctx.beginPath();
    ctx.moveTo(w * 0.35, w * 0.25);
    ctx.lineTo(w / 2, w * 0.1);
    ctx.lineTo(w * 0.65, w * 0.25);
    ctx.stroke();
  });
  elementImages.push({ name: 'alarm_30x30.png', dataUrl: alarmDataUrl, bounds: { x: 0, y: 0, width: alarmSize, height: alarmSize }, type: 'IMG_STATUS' });

  // Generate Lock icon for IMG_STATUS (LOCK)
  const lockSize = 30;
  const lockDataUrl = createCanvasImage(lockSize, lockSize, (ctx, w) => {
    ctx.strokeStyle = '#44CC66';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    // Shackle
    ctx.beginPath();
    ctx.arc(w / 2, w * 0.43, w * 0.18, Math.PI, 0);
    ctx.stroke();
    // Body
    ctx.beginPath();
    ctx.roundRect(w * 0.22, w * 0.52, w * 0.56, w * 0.34, 3);
    ctx.stroke();
    // Keyhole
    ctx.fillStyle = '#44CC66';
    ctx.beginPath();
    ctx.arc(w / 2, w * 0.67, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
  elementImages.push({ name: 'lock_30x30.png', dataUrl: lockDataUrl, bounds: { x: 0, y: 0, width: lockSize, height: lockSize }, type: 'IMG_STATUS' });
  // Heart icon (24x20)
  const heartIconDataUrl = createCanvasImage(24, 20, (ctx, w, h) => {
    ctx.fillStyle = '#FF6B6B';
    ctx.font = `${Math.floor(h * 0.9)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2665', w / 2, h / 2);
  });
  elementImages.push({ name: 'icon_heart_24x20.png', dataUrl: heartIconDataUrl, bounds: { x: 0, y: 0, width: 24, height: 20 }, type: 'IMG' });

  // Steps icon (24x24) - shoe/footprint
  const stepsIconDataUrl = createCanvasImage(24, 24, (ctx, w, h) => {
    ctx.fillStyle = '#FFD93D';
    ctx.font = `${Math.floor(h * 0.7)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F463}', w / 2, h / 2);
  });
  elementImages.push({ name: 'icon_steps_24x24.png', dataUrl: stepsIconDataUrl, bounds: { x: 0, y: 0, width: 24, height: 24 }, type: 'IMG' });

  // Battery icon (24x14) - simple battery shape
  const battIconDataUrl = createCanvasImage(24, 14, (ctx, w, h) => {
    ctx.strokeStyle = '#00CC88';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 2, w - 5, h - 4);
    ctx.fillStyle = '#00CC88';
    ctx.fillRect(w - 4, h * 0.3, 3, h * 0.4);
  });
  elementImages.push({ name: 'icon_batt_24x14.png', dataUrl: battIconDataUrl, bounds: { x: 0, y: 0, width: 24, height: 14 }, type: 'IMG' });

  // Generate bluetooth icon for IMG_STATUS
  const btSize = 30;
  const btDataUrl = createCanvasImage(btSize, btSize, (ctx, w) => {
    ctx.strokeStyle = '#4488FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, w * 0.2);
    ctx.lineTo(w * 0.65, w * 0.4);
    ctx.lineTo(w * 0.5, w * 0.5);
    ctx.lineTo(w * 0.65, w * 0.6);
    ctx.lineTo(w * 0.35, w * 0.8);
    ctx.moveTo(w * 0.5, w * 0.2);
    ctx.lineTo(w * 0.5, w * 0.8);
    ctx.stroke();
  });
  elementImages.push({
    name: 'bluetooth_30x30.png',
    dataUrl: btDataUrl,
    bounds: { x: 0, y: 0, width: btSize, height: btSize },
    type: 'IMG_STATUS',
  });

  // Generate clock hand images for TIME_POINTER — use handStyle from the TIME_POINTER element
  const timePointerEl = elements.find(el => el.type === 'TIME_POINTER');
  const handStyle = (timePointerEl?.handStyle ?? 'silver') as HandStyleKey;
  const handSet = generateHandSet(handStyle);
  elementImages.push(
    { name: 'hour_hand.png',  dataUrl: handSet.hourHand,   bounds: { x: 0, y: 0, width: 22, height: 140 }, type: 'TIME_POINTER' },
    { name: 'minute_hand.png',dataUrl: handSet.minuteHand, bounds: { x: 0, y: 0, width: 16, height: 200 }, type: 'TIME_POINTER' },
    { name: 'second_hand.png',dataUrl: handSet.secondHand, bounds: { x: 0, y: 0, width: 8,  height: 240 }, type: 'TIME_POINTER' },
    { name: 'hand_cover.png', dataUrl: handSet.cover,      bounds: { x: 0, y: 0, width: 30, height: 30  }, type: 'TIME_POINTER' },
  );

  // Generate 29 weather level icons for IMG_LEVEL (matches Brushed Steel reference count)
  const weatherSize = 40;
  const weatherSymbols = [
    '\u2600', '\u26C5', '\u2601', '\u{1F327}', '\u{1F329}', '\u2744', '\u{1F32B}', // sun, part-cloud, cloud, rain, thunder, snow, fog
    '\u2600', '\u26C5', '\u2601', '\u{1F327}', '\u{1F329}', '\u2744', '\u{1F32B}', // repeat
    '\u2600', '\u26C5', '\u2601', '\u{1F327}', '\u{1F329}', '\u2744', '\u{1F32B}', // repeat
    '\u2600', '\u26C5', '\u2601', '\u{1F327}', '\u{1F329}', '\u2744', '\u{1F32B}', // repeat
    '\u2600',  // one more to reach 29
  ];
  for (let i = 0; i < 29; i++) {
    const filename = `weather_${i}.png`;
    const symbol = weatherSymbols[i] || '\u2600';
    const dataUrl = createCanvasImage(weatherSize, weatherSize, (ctx, w, h) => {
      ctx.fillStyle = '#FFD700';
      ctx.font = `${Math.floor(h * 0.6)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, w / 2, h / 2);
    });
    elementImages.push({
      name: filename,
      dataUrl,
      bounds: { x: 0, y: 0, width: weatherSize, height: weatherSize },
      type: 'IMG_LEVEL',
    });
  }

  // Generate background image for Background element
  const bgDataUrl = createCanvasImage(480, 480, (ctx, w, h) => {
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, w, h);
  });
  elementImages.push({
    name: 'background_ed15585c.png',
    dataUrl: bgDataUrl,
    bounds: { x: 0, y: 0, width: 480, height: 480 },
    type: 'IMG',
  });
  // Update Background element src for preview rendering
  const bgElement = elements.find(el => el.name === 'Background');
  if (bgElement) bgElement.src = bgDataUrl;

  // Generate static images for any remaining IMG-type elements with src
  elements
    .filter((el) => el.type === 'IMG' && el.src && el.name !== 'Background' && !el.name.toLowerCase().includes('time') && !el.name.toLowerCase().includes('weekday') && !el.name.toLowerCase().includes('date') && !el.name.toLowerCase().includes('month') && !el.name.toLowerCase().includes('icon'))
    .forEach((el) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(el.bounds.width || 100, 200);
      canvas.height = Math.max(el.bounds.height || 100, 200);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = el.color || '#555555';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const dataUrl = canvas.toDataURL('image/png');
      elementImages.push({
        name: el.src!,
        dataUrl,
        bounds: el.bounds,
        type: el.type,
      });
      el.src = dataUrl;
    });
  
  console.log('[Mock] Element images generated, total:', elementImages.length, 'images');

  const config: WatchFaceConfig = {
    name: `AI_WatchFace_${Date.now()}`,
    resolution,
    background: {
      src: 'bg.png',
      format: 'TGA-P',
    },
    elements,
    backgroundTransform: { ...DEFAULT_BACKGROUND_TRANSFORM },
    aodBackgroundMode: 'USE_MAIN_BACKGROUND',
    aodBackgroundSrc: null,
    aodSolidColor: '#000000',
    aodBackgroundTransform: { ...DEFAULT_BACKGROUND_TRANSFORM },
    watchModel,
  };

  return { config, elementImages: elementImages };
}

// ─── ZPK Build Helpers ────────────────────────────────────────────────────────

/**
 * Apply icon visual effects (hue, saturation, colorize) to an icon data URL.
 * Mirrors the same logic in InteractiveCanvas.tsx so what you see = what ships in ZPK.
 */
async function applyIconEffectsForZPK(
  dataUrl: string,
  el: WatchFaceElement,
  w: number,
  h: number,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const canvas = bakeDeterministicIconEffects(img, w, h, {
    hueDeg: el.iconHue ?? 0,
    saturationPercent: el.iconSaturation ?? 100,
    colorize: el.iconColorize,
    colorizeOpacity: el.iconColorizeOpacity ?? 1,
    photoEdit: el.iconPhotoEdit,
  });
  return canvas.toDataURL('image/png');
}

/**
 * Resize a dataUrl image to targetW × targetH. Returns original if already the right size.
 */
async function resizeDataUrl(dataUrl: string, targetW: number, targetH: number): Promise<string> {
  if (!targetW || !targetH) return dataUrl;
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  if (nw === targetW && nh === targetH) return dataUrl;
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/png');
}

/**
 * Apply pointer image effects to a rendered hand image before packaging into ZPK.
 */
async function applyPointerEffectsForZPK(
  dataUrl: string,
  el: WatchFaceElement,
  _layer: 'hour' | 'minute' | 'second' | 'cover' | 'gauge',
): Promise<string> {
  const effects = normalizePointerEffects(el);
  const shadowIntensity = Math.max(0, Math.min(1, el.handShadow ?? 0));
  const pointerShadow = pointerShadowToDropShadow(shadowIntensity);
  const glowIntensity = Math.max(0, Math.min(1, el.handGlow ?? 0));
  const trailIntensity = Math.max(0, Math.min(1, el.handTrail ?? 0));
  const tintColor = el.handTint?.trim();
  const hasBasePointerEffects = effects.brightness === 0
    && effects.contrast === 0
    && effects.saturation === 0
    && effects.hue === 0
    && effects.opacity === 1;
  const hasHandVisualEffects = shadowIntensity > 0 || glowIntensity > 0 || trailIntensity > 0 || !!tintColor;
  const isSvgDataUrl = /^data:image\/svg\+xml/i.test(dataUrl);
  // HTML/custom pointers may provide SVG data URLs. Zepp TIME_POINTER expects raster assets.
  // Always rasterize SVG to PNG even when no effects are enabled.
  if (hasBasePointerEffects && !hasHandVisualEffects && !isSvgDataUrl) return dataUrl;

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const width = Math.max(1, img.naturalWidth || img.width || 1);
  const height = Math.max(1, img.naturalHeight || img.height || 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  const adjustedBase = bakeDeterministicColorAdjustments(img, width, height, {
    brightness: effects.brightness,
    contrast: effects.contrast,
    saturation: effects.saturation,
    hueDeg: effects.hue,
    saturationMode: 'delta',
    opacity: effects.opacity,
  });

  if (trailIntensity > 0) {
    for (let t = 1; t <= 3; t += 1) {
      const trailAlpha = trailIntensity * (0.18 - t * 0.04);
      if (trailAlpha <= 0) break;
      ctx.save();
      ctx.globalAlpha = trailAlpha;
      ctx.drawImage(adjustedBase, 0, -t * 2, width, height);
      ctx.restore();
    }
  }

  ctx.save();
  if (pointerShadow) {
    const { r, g, b } = hexToRgb(pointerShadow.color);
    ctx.shadowColor = `rgba(${r},${g},${b},${pointerShadow.opacity})`;
    ctx.shadowBlur = pointerShadow.blur;
    ctx.shadowOffsetX = pointerShadow.offsetX;
    ctx.shadowOffsetY = pointerShadow.offsetY;
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(adjustedBase, 0, 0, width, height);
  ctx.restore();

  if (glowIntensity > 0) {
    const glowColor = tintColor || '#00EEFF';
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = glowIntensity * 0.55;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12 + glowIntensity * 20;
    ctx.drawImage(adjustedBase, 0, 0, width, height);
    ctx.restore();
  }

  if (tintColor) {
    const tintCanvas = document.createElement('canvas');
    tintCanvas.width = width;
    tintCanvas.height = height;
    const tintCtx = tintCanvas.getContext('2d');
    if (tintCtx) {
      tintCtx.drawImage(adjustedBase, 0, 0, width, height);
      tintCtx.globalCompositeOperation = 'source-in';
      tintCtx.globalAlpha = 0.35;
      tintCtx.fillStyle = tintColor;
      tintCtx.fillRect(0, 0, width, height);
      ctx.drawImage(tintCanvas, 0, 0, width, height);
    }
  }

  return canvas.toDataURL('image/png');
}

type PointerLayer = 'hour' | 'minute' | 'second' | 'cover';

const POINTER_BASE_METRICS: Record<PointerLayer, { width: number; height: number; pivotX: number; pivotY: number }> = {
  hour: { width: 22, height: 140, pivotX: 11, pivotY: 118 },
  minute: { width: 16, height: 200, pivotX: 8, pivotY: 172 },
  second: { width: 8, height: 240, pivotX: 4, pivotY: 180 },
  cover: { width: 30, height: 30, pivotX: 15, pivotY: 15 },
};

function clampPointerValue(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function parsePivotRatioFromSource(code?: string): { x: number; y: number } | null {
  if (!code) return null;
  const svg = code.match(/<svg[\s\S]*<\/svg>/i)?.[0] ?? null;
  if (!svg) return null;
  const tag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const vb = tag.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
  const parts = vb.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some(Number.isNaN) || parts[2] <= 0 || parts[3] <= 0) return null;
  const [minX, minY, w, h] = parts;
  const pxRaw = Number(tag.match(/\bdata-pivot-x\s*=\s*["']([^"']+)["']/i)?.[1]);
  const pyRaw = Number(tag.match(/\bdata-pivot-y\s*=\s*["']([^"']+)["']/i)?.[1]);
  if (Number.isNaN(pxRaw) || Number.isNaN(pyRaw)) return null;
  return {
    x: clampPointerValue((pxRaw - minX) / w, 0, 1),
    y: clampPointerValue((pyRaw - minY) / h, 0, 1),
  };
}

async function preparePointerGeometryForExport(
  dataUrl: string,
  layer: PointerLayer,
  el: WatchFaceElement,
  customHand?: CustomHandRecord,
  sourcePivotRatio?: { x: number; y: number } | null,
): Promise<{ dataUrl: string; pivot?: { x: number; y: number } }> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const width = Math.max(1, img.naturalWidth || img.width || 1);
  const height = Math.max(1, img.naturalHeight || img.height || 1);
  const sourceMode = !!sourcePivotRatio;
  const base = POINTER_BASE_METRICS[layer];

  const globalLen = el.handLengthScale ?? 1;
  const hubScale = (el.handHubScale ?? 1) * globalLen;
  const len = layer === 'hour'
    ? globalLen * (el.handHourLength ?? 1)
    : layer === 'minute'
      ? globalLen * (el.handMinuteLength ?? 1)
      : layer === 'second'
        ? globalLen * (el.handSecondLength ?? 1)
        : hubScale;
  const wid = layer === 'hour'
    ? (el.handHourWidth ?? 1)
    : layer === 'minute'
      ? (el.handMinuteWidth ?? 1)
      : layer === 'second'
        ? (el.handSecondWidth ?? 1)
        : hubScale;

  const baseW = sourceMode ? width : base.width;
  const baseH = sourceMode ? height : base.height;

  let pivotX = base.pivotX;
  let pivotY = base.pivotY;
  if (sourceMode) {
    pivotX = baseW * (sourcePivotRatio?.x ?? 0.5);
    pivotY = baseH * (sourcePivotRatio?.y ?? 0.5);
  } else if (layer === 'hour') {
    // Use IDB custom pivot or POINTER_BASE_METRICS default.
    // el.hourPos is NOT used — it may contain stale initial values (was y:70 at creation).
    pivotX = customHand?.hourPosX ?? base.pivotX;
    pivotY = customHand?.hourPosY ?? base.pivotY;
  } else if (layer === 'minute') {
    pivotX = customHand?.minutePosX ?? base.pivotX;
    pivotY = customHand?.minutePosY ?? base.pivotY;
  } else if (layer === 'second') {
    pivotX = customHand?.secondPosX ?? base.pivotX;
    pivotY = customHand?.secondPosY ?? base.pivotY;
  }

  const targetW = Math.max(1, Math.round(baseW * wid));
  const targetH = Math.max(1, Math.round(baseH * len));
  const drawPivotX = pivotX * wid;
  const drawPivotY = layer === 'cover' ? pivotY : (pivotY / baseH) * targetH;

  // Hub must keep a stable runtime contract for overlay placement.
  // Cover exports at element-provided dimensions when present (custom hands
  // derive these from the SVG natural size); otherwise falls back to 30×30.
  const coverW = (el.coverWidth && el.coverWidth > 0) ? el.coverWidth : POINTER_BASE_METRICS.cover.width;
  const coverH = (el.coverHeight && el.coverHeight > 0) ? el.coverHeight : POINTER_BASE_METRICS.cover.height;
  const finalTargetW = layer === 'cover' ? Math.max(1, Math.round(coverW * hubScale)) : targetW;
  const finalTargetH = layer === 'cover' ? Math.max(1, Math.round(coverH * hubScale)) : targetH;
  const finalPivotX = layer === 'cover' ? finalTargetW / 2 : drawPivotX;
  const finalPivotY = layer === 'cover' ? finalTargetH / 2 : drawPivotY;

  // Reserve safe margins so baked pointer shadows/glow are not clipped at export time.
  const effectPadRaw = pointerEffectPaddingFromIntensity(el.handShadow ?? 0, el.handGlow ?? 0, el.handTrail ?? 0);
  // Keep hub (cover) placement contract stable at centerX-15/centerY-15 in generators.
  const effectPad = layer === 'cover' ? 0 : effectPadRaw;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl };
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let sx = 0;
  let sy = 0;
  let sw = width;
  let sh = height;
  // Export parity fix: keep full source canvas for pointer layers.
  // Cropping to alpha bounds changes aspect and can clip fine tip pixels,
  // which makes on-device hands look longer/wider than preview.

  const out = document.createElement('canvas');
  out.width = finalTargetW + effectPad * 2;
  out.height = finalTargetH + effectPad * 2;
  const outCtx = out.getContext('2d');
  if (!outCtx) return { dataUrl };
  outCtx.clearRect(0, 0, out.width, out.height);
  outCtx.drawImage(canvas, sx, sy, sw, sh, effectPad, effectPad, finalTargetW, finalTargetH);

  const pivot = {
    x: Math.round(clampPointerValue(finalPivotX + effectPad, 0, out.width)),
    y: Math.round(clampPointerValue(finalPivotY + effectPad, 0, out.height)),
  };

  return { dataUrl: out.toDataURL('image/png'), pivot };
}

/**
 * Regenerate digit/label PNG images from current element colors + font styles.
 * Called at ZPK build time so that UI color/font choices actually reach the device.
 */
function regenerateDigitFilesFromElements(
  elements: WatchFaceElement[],
  scope: 'main' | 'aod',
): {
  files: { filename: string; dataUrl: string }[];
  elementUpdates: Map<string, Partial<WatchFaceElement>>;
} {
  const results: { filename: string; dataUrl: string }[] = [];
  const elementUpdates = new Map<string, Partial<WatchFaceElement>>();

  /**
   * Spec 114 — Geometry engine: generate all 10 digit bitmaps for one font+size.
   * Phase 1: measure all digits → Phase 2: compute optimal size → Phase 3: render.
   * No optical compensation. No pair corrections. Simple centered draw in optimal bitmap.
   */
  // Skipped wrapper — callers pass w and h directly
  function makeDigitFamily(
    color: string, fontFamily: string, fontWeight: string, targetH: number, tabular = false,
  ) {
    // Each digit PNG is rendered at fontSize = targetH × 0.8 (matching the canvas
    // text-fallback) with width = natural font advance per digit. No fill ratio.
    // No shared fixed width. Device advances by naturalWidth → matches canvas exactly.
    const h = Math.max(targetH, 8);
    return generateOptimizedDigitBitmaps(fontFamily, fontWeight, h, color, { tabular });
  }

  function makeLabelCanvas(label: string, color: string, fontFamily: string, fontWeight: string, w: number, h: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    // Auto-fit: start at 80% of height, reduce until text fits width (prevents clipping on device)
    let fontSize = Math.floor(h * 0.8);
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    while (fontSize > 6 && ctx.measureText(label).width > w * 0.95) {
      fontSize--;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2);
    return canvas.toDataURL('image/png');
  }

  function makeCompleteDayCanvas(
    label: string,
    color: string,
    fontFamily: string,
    fontWeight: string,
    width: number,
    height: number,
    targetFontHeight: number,
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    let fontSize = Math.max(6, Math.floor(targetFontHeight * 0.8));
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    while (fontSize > 6 && ctx.measureText(label).width > canvas.width * 0.95) {
      fontSize--;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  }

  for (const el of elements) {
    const rawColor = el.color ?? '#FFFFFF';
    // Normalise color: strip 0xRRGGBBAA → #RRGGBB
    const color = rawColor.startsWith('0x') || rawColor.startsWith('0X')
      ? '#' + rawColor.slice(2, 8)
      : rawColor.substring(0, 7);
    const fontEntry = el.fontStyle ? FONT_STYLES.find(f => f.key === el.fontStyle) : undefined;
    const fontFamily = fontEntry?.fontFamily ?? 'Arial';
    const fontWeight = fontEntry?.fontWeight ?? 'bold';
    const safeId = el.id.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (el.type === 'IMG_TIME') {
      const h = Math.max((el.fontSize && el.fontSize > 0 ? el.fontSize : el.bounds.height) || 50, 16);
      const scopedDigits: string[] = [];
      const family = makeDigitFamily(color, fontFamily, fontWeight, h, true);
      for (let i = 0; i < 10; i++) {
        const filename = `time_digit_${scope}_${safeId}_${i}.png`;
        scopedDigits.push(filename);
        results.push({
          filename,
          dataUrl: family[i].dataUrl,
          glyphMetrics: family[i].measurement as unknown as import('@/lib/digitGlyphMetrics').GlyphMetrics,
        } as Parameters<typeof results.push>[0]);
      }
      elementUpdates.set(el.id, {
        fontArray: scopedDigits,
        alignH: 'CENTER_H',
        timeDigitCellWidth: family[0].width,
      });
    } else if (el.type === 'IMG_DATE' && el.subtype !== 'month') {
      const h = Math.max((el.fontSize && el.fontSize > 0 ? el.fontSize : el.bounds.height) || 30, 12);
      if (isCompleteDayImageMode(el)) {
        const completeDays = completeDayAssetNames(scope, el.id);
        const canvasW = Math.max(1, Math.round(el.bounds.width || 40));
        const canvasH = Math.max(1, Math.round(el.bounds.height || h));
        for (let i = 0; i < 31; i++) {
          const label = String(i + 1).padStart(2, '0');
          results.push({
            filename: completeDays[i],
            dataUrl: makeCompleteDayCanvas(label, color, fontFamily, fontWeight, canvasW, canvasH, h),
          });
        }
        elementUpdates.set(el.id, { fontArray: completeDays, dayDigitCellWidth: undefined });
      } else {
        const scopedDigits: string[] = [];
        const family = makeDigitFamily(color, fontFamily, fontWeight, h, true);
        for (let i = 0; i < 10; i++) {
          const filename = `date_digit_${scope}_${safeId}_${i}.png`;
          scopedDigits.push(filename);
          results.push({
            filename,
            dataUrl: family[i].dataUrl,
            glyphMetrics: family[i].measurement as unknown as import('@/lib/digitGlyphMetrics').GlyphMetrics,
          } as Parameters<typeof results.push>[0]);
        }
        elementUpdates.set(el.id, { fontArray: scopedDigits, dayDigitCellWidth: family[0].width });
      }
    } else if (el.type === 'IMG_WEEK') {
      const WEEK_FULL    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const WEEK_SHORT   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const WEEK_INITIAL = ['Mo.', 'Tu.', 'We.', 'Th.', 'Fr.', 'Sa.', 'Su.'];
      const fmt = el.weekFormat ?? 'full';
      const days = fmt === 'full' ? WEEK_FULL : fmt === 'initial' ? WEEK_INITIAL : WEEK_SHORT;
      const w = Math.max(el.bounds.width || 40, 20);
      const h = Math.max((el.fontSize && el.fontSize > 0 ? el.fontSize : el.bounds.height) || 20, 12);
      const prefix = `week_${scope}_${safeId}`;
      const scopedWeekImages: string[] = [];
      for (let i = 0; i < 7; i++) {
        const filename = `${prefix}_${i}.png`;
        scopedWeekImages.push(filename);
        results.push({ filename, dataUrl: makeLabelCanvas(days[i], color, fontFamily, fontWeight, w, h) });
      }
      elementUpdates.set(el.id, { images: scopedWeekImages });
    } else if (el.type === 'IMG_DATE' && el.subtype === 'month') {
      const MONTH_FULL    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const MONTH_SHORT   = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      const MONTH_INITIAL = ['Jan.','Feb.','Mar.','Apr.','May.','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
      const mfmt = (el as { monthFormat?: string }).monthFormat ?? 'short';
      const monthNames = mfmt === 'full' ? MONTH_FULL : mfmt === 'initial' ? MONTH_INITIAL : MONTH_SHORT;
      const w = Math.max(el.bounds.width || 40, 20);
      const h = Math.max((el.fontSize && el.fontSize > 0 ? el.fontSize : el.bounds.height) || 20, 12);
      const prefix = `month_${scope}_${safeId}`;
      const scopedMonthImages: string[] = [];
      for (let i = 0; i < 12; i++) {
        const filename = `${prefix}_${i}.png`;
        scopedMonthImages.push(filename);
        results.push({ filename, dataUrl: makeLabelCanvas(monthNames[i], color, fontFamily, fontWeight, w, h) });
      }
      elementUpdates.set(el.id, { images: scopedMonthImages });
    } else if (el.type === 'TEXT_IMG' && el.dataType) {
      const prefix = getTextImgPrefixForDataType(el.dataType);
      if (prefix) {
        const h = Math.max((el.fontSize && el.fontSize > 0 ? el.fontSize : el.bounds.height) || 25, 12);
        const scopedDigits: string[] = [];
        const family = makeDigitFamily(color, fontFamily, fontWeight, h);
        for (let i = 0; i < 10; i++) {
          const filename = `${prefix}_${scope}_${safeId}_${i}.png`;
          scopedDigits.push(filename);
          results.push({ filename, dataUrl: family[i].dataUrl });
        }
        const textImgBitmaps: DigitBitmapMetrics[] = family.map(rd => ({ char: rd.char, width: rd.width, height: rd.height }));
        const textImgLayout = computeDigitBitmapLayout({
          widgetType: 'TEXT_IMG',
          bounds: { x: el.bounds.x, y: el.bounds.y, width: el.bounds.width, height: h },
          value: getDigitPreviewValue(el),
          alignH: el.alignH,
          hSpace: Number(el.hSpace) || 0,
          bitmaps: textImgBitmaps,
        });
        elementUpdates.set(el.id, { fontArray: scopedDigits, layoutStartX: textImgLayout.startX });
      }
    }
  }

  return { files: results, elementUpdates };
}

// ─── Drop-shadow PNG baking helpers ─────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}

/** Compute extra canvas padding required to contain a drop shadow. */
function shadowPadding(ds: NonNullable<WatchFaceElement['dropShadow']>): number {
  return dropShadowPaddingForBake(ds);
}

function applyShadowToCtx(ctx: CanvasRenderingContext2D, ds: NonNullable<WatchFaceElement['dropShadow']>) {
  const n = normalizeDropShadowForBake(ds);
  const { r, g, b } = hexToRgb(n.color);
  ctx.shadowColor = `rgba(${r},${g},${b},${n.opacity})`;
  ctx.shadowBlur = n.blur;
  ctx.shadowOffsetX = n.offsetX;
  ctx.shadowOffsetY = n.offsetY;
}

/**
 * Bake an IMG element (icon) with its drop shadow into a padded PNG.
 * Returns { dataUrl, pad } where pad is the extra pixels on each side.
 */
function renderImgWithShadowToPng(
  el: WatchFaceElement,
  imgElement: HTMLImageElement,
): { dataUrl: string; pad: number } {
  const ds = el.dropShadow!;
  const pad = shadowPadding(ds);
  const w = el.bounds.width || 50;
  const h = el.bounds.height || 50;
  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d')!;
  applyShadowToCtx(ctx, ds);
  ctx.drawImage(imgElement, pad, pad, w, h);
  return { dataUrl: canvas.toDataURL('image/png'), pad };
}

/** Bake a FILL_RECT (non-engrave) with its drop shadow. */
function renderFillRectWithShadowToPng(el: WatchFaceElement): { dataUrl: string; pad: number } {
  const ds = el.dropShadow!;
  const pad = shadowPadding(ds);
  const w = el.bounds.width || 50;
  const h = el.bounds.height || 50;
  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d')!;
  applyShadowToCtx(ctx, ds);
  ctx.fillStyle = el.color ? el.color.replace(/^0x/, '#') : 'rgba(80,80,80,0.5)';
  ctx.fillRect(pad, pad, w, h);
  return { dataUrl: canvas.toDataURL('image/png'), pad };
}

/** Bake a STROKE_RECT with its drop shadow. */
function renderStrokeRectWithShadowToPng(el: WatchFaceElement): { dataUrl: string; pad: number } {
  const ds = el.dropShadow!;
  const pad = shadowPadding(ds);
  const w = el.bounds.width || 50;
  const h = el.bounds.height || 50;
  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d')!;
  applyShadowToCtx(ctx, ds);
  ctx.strokeStyle = el.color ? el.color.replace(/^0x/, '#') : '#FFFFFF';
  ctx.lineWidth = el.lineWidth ?? 2;
  ctx.strokeRect(pad, pad, w, h);
  return { dataUrl: canvas.toDataURL('image/png'), pad };
}

/** Bake a CIRCLE (or shape variant) with its drop shadow, honouring el.shapeType. */
function renderCircleWithShadowToPng(el: WatchFaceElement): { dataUrl: string; pad: number } {
  const ds = el.dropShadow!;
  const pad = shadowPadding(ds);
  const { width: w, height: h } = el.bounds;
  const stype = el.shapeType ?? 'circle';
  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d')!;
  applyShadowToCtx(ctx, ds);
  ctx.fillStyle = el.color ? el.color.replace(/^0x/, '#') : '#FFFFFF';
  if (stype === 'fill_rect') {
    ctx.fillRect(pad, pad, w, h);
  } else if (stype === 'stroke_rect') {
    ctx.strokeStyle = el.color ? el.color.replace(/^0x/, '#') : '#FFFFFF';
    ctx.lineWidth = el.lineWidth ?? 2;
    ctx.strokeRect(pad, pad, w, h);
  } else if (stype === 'rounded_rect') {
    const cr = el.shapeCornerRadius ?? 12;
    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, cr);
    ctx.fill();
  } else {
    // Default: circle (original behaviour)
    const r = el.radius ?? Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(pad + w / 2, pad + h / 2, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return { dataUrl: canvas.toDataURL('image/png'), pad };
}

async function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement | null> {
  if (!dataUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function imageFromElementFile(
  src: string,
  elementFiles: Array<{ src: string; file: File }>,
): Promise<HTMLImageElement | null> {
  if (!src) return null;
  if (src.startsWith('data:')) return imageFromDataUrl(src);

  const existingFile = elementFiles.find((f) => f.src === src);
  if (!existingFile) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(existingFile.file);
  });
}

async function dataUrlFromElementFile(
  src: string,
  elementFiles: Array<{ src: string; file: File }>,
): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  const existingFile = elementFiles.find((f) => f.src === src);
  if (!existingFile) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(existingFile.file);
  });
}

/** Renders a FILL_RECT element with engraveFrame effect to a PNG data URL (for ZPK export). */
function renderEngraveFrameToPng(el: WatchFaceElement): string {
  const w = el.bounds?.width ?? 100;
  const h = el.bounds?.height ?? 100;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  const cfg = el.engraveFrame!;
  const compensatedCfg = normalizeEngraveFrameForParity(cfg);
  renderEngraveFrameEffect(ctx, { x: 0, y: 0, width: w, height: h }, compensatedCfg);

  return canvas.toDataURL('image/png');
}

type EditorMode = 'MAIN' | 'AOD';
type AodBackgroundMode = 'USE_MAIN_BACKGROUND' | 'UPLOAD_AOD_BACKGROUND' | 'SOLID_COLOR' | 'NONE_BLACK';
type BackgroundSourceType = 'image' | 'html';
type CropTarget = 'MAIN' | 'AOD';
type PhotoEditorTarget = 'MAIN' | 'AOD';
type HtmlLibraryTarget = 'background' | 'icon' | 'time_pointer' | 'gauge_pointer' | 'weather_status' | 'all';
type HtmlLibrarySlot =
  | 'auto'
  | 'icon_general'
  | 'icon_status'
  | 'time_analog'
  | 'time_digital'
  | 'gauge_arc'
  | 'gauge_pointer'
  | 'weather_text'
  | 'weather_icon';

interface HtmlLibrarySlotOption {
  value: HtmlLibrarySlot;
  label: string;
}

const HTML_CREATOR_SLOT_OPTIONS: Record<HtmlLibraryTarget, HtmlLibrarySlotOption[]> = {
  background: [{ value: 'auto', label: 'Auto' }],
  icon: [
    { value: 'auto', label: 'Auto' },
    { value: 'icon_general', label: 'General Icons (IMG)' },
    { value: 'icon_status', label: 'Status Icons (IMG_STATUS)' },
  ],
  time_pointer: [
    { value: 'auto', label: 'Auto' },
    { value: 'time_analog', label: 'Analog Hands (TIME_POINTER)' },
    { value: 'time_digital', label: 'Digital Time (IMG_TIME)' },
  ],
  gauge_pointer: [
    { value: 'auto', label: 'Auto' },
    { value: 'gauge_arc', label: 'Arc Progress (ARC_PROGRESS)' },
    { value: 'gauge_pointer', label: 'Gauge Pointer (GAUGE_POINTER)' },
  ],
  weather_status: [
    { value: 'auto', label: 'Auto' },
    { value: 'weather_text', label: 'Weather Text (TEXT_IMG)' },
    { value: 'weather_icon', label: 'Weather Icon (IMG_LEVEL)' },
  ],
  all: [{ value: 'auto', label: 'Auto (All)' }],
};

function buildSolidBackgroundDataUrl(width: number, height: number, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL('image/png');
}

function expandSvgUseElements(svgSource: string): string {
  try {
    const doc = new DOMParser().parseFromString(svgSource, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') return svgSource;

    const parseLength = (value: string | null): number | null => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(px)?$/i);
      if (!match) return null;
      const parsed = Number.parseFloat(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const parseViewBox = (value: string | null): { x: number; y: number; w: number; h: number } | null => {
      if (!value) return null;
      const parts = value
        .trim()
        .split(/[\s,]+/)
        .map((part) => Number.parseFloat(part))
        .filter((part) => Number.isFinite(part));
      if (parts.length !== 4) return null;
      if (parts[2] <= 0 || parts[3] <= 0) return null;
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    };

    const uniquifySubtreeIds = (node: Element, prefix: string): void => {
      const nodes = [node, ...Array.from(node.querySelectorAll('*'))];
      const idMap = new Map<string, string>();

      for (const el of nodes) {
        const id = el.getAttribute('id');
        if (!id) continue;
        idMap.set(id, `${prefix}${id}`);
      }

      if (idMap.size === 0) return;

      for (const el of nodes) {
        const id = el.getAttribute('id');
        if (id && idMap.has(id)) {
          el.setAttribute('id', idMap.get(id)!);
        }

        for (const attr of Array.from(el.attributes)) {
          const name = attr.name;
          const value = attr.value;
          let next = value;

          for (const [oldId, newId] of idMap.entries()) {
            next = next.replace(new RegExp(`url\\(#${oldId}\\)`, 'g'), `url(#${newId})`);
            if (next === `#${oldId}`) next = `#${newId}`;
          }

          if (next !== value) {
            el.setAttribute(name, next);
          }
        }
      }
    };

    // Ensure namespaces are present for broad SVG href compatibility.
    if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!root.getAttribute('xmlns:xlink')) root.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Expand recursively because many SVGs chain <use> refs through multiple templates.
    for (let pass = 0; pass < 8; pass += 1) {
      const uses = Array.from(doc.querySelectorAll('use'));
      if (uses.length === 0) break;
      let replacedInPass = 0;

      for (const useEl of uses) {
        const hrefRaw = useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '';
        const hashIndex = hrefRaw.lastIndexOf('#');
        const refId = hashIndex >= 0 ? hrefRaw.slice(hashIndex + 1) : '';
        if (!refId) continue;

        // CSS.escape is not guaranteed in all engines; use id lookup first.
        const target = doc.getElementById(refId);
        if (!target) continue;

        let handledPositioning = false;
        const replacement = (() => {
          const tag = target.tagName.toLowerCase();
          // <symbol> is not directly renderable like graphics elements; materialize children.
          if (tag === 'symbol') {
            const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
            for (const child of Array.from(target.childNodes)) {
              g.appendChild(child.cloneNode(true));
            }

            const viewBox = parseViewBox(target.getAttribute('viewBox'));
            const x = parseLength(useEl.getAttribute('x')) ?? 0;
            const y = parseLength(useEl.getAttribute('y')) ?? 0;
            const widthAttr = parseLength(useEl.getAttribute('width'));
            const heightAttr = parseLength(useEl.getAttribute('height'));

            if (viewBox && widthAttr !== null && heightAttr !== null) {
              const sx = widthAttr / viewBox.w;
              const sy = heightAttr / viewBox.h;
              const tx = x - viewBox.x * sx;
              const ty = y - viewBox.y * sy;
              g.setAttribute('transform', `translate(${tx} ${ty}) scale(${sx} ${sy})`);
              handledPositioning = true;
            }

            return g;
          }
          return target.cloneNode(true) as Element;
        })();

        // Avoid duplicate IDs when cloning template nodes many times.
        const clonePrefix = `use_${pass}_${replacedInPass}_`;
        uniquifySubtreeIds(replacement, clonePrefix);
        replacement.removeAttribute('id');

        // Preserve per-instance placement/transform from <use>.
        const tx = Number.parseFloat(useEl.getAttribute('x') || '0');
        const ty = Number.parseFloat(useEl.getAttribute('y') || '0');
        const tAttr = useEl.getAttribute('transform') || '';
        const translate = handledPositioning || (!tx && !ty) ? '' : ` translate(${tx} ${ty})`;
        const mergedTransform = `${tAttr}${translate}`.trim();
        if (mergedTransform) {
          const existing = replacement.getAttribute('transform') || '';
          replacement.setAttribute('transform', `${existing} ${mergedTransform}`.trim());
        }

        // Copy presentation attributes from <use> to replacement instance.
        for (const attr of Array.from(useEl.attributes)) {
          const name = attr.name;
          if (name === 'href' || name === 'xlink:href' || name === 'x' || name === 'y' || name === 'transform' || name === 'width' || name === 'height') {
            continue;
          }
          replacement.setAttribute(name, attr.value);
        }

        useEl.replaceWith(replacement);
        replacedInPass += 1;
      }

      if (replacedInPass === 0) break;
    }

    // Normalize href usage for engines preferring one form.
    for (const el of Array.from(doc.querySelectorAll('[xlink\\:href]'))) {
      const xlinkHref = el.getAttribute('xlink:href');
      if (xlinkHref && !el.getAttribute('href')) {
        el.setAttribute('href', xlinkHref);
      }
    }
    for (const el of Array.from(doc.querySelectorAll('[href]'))) {
      const href = el.getAttribute('href');
      if (href && !el.getAttribute('xlink:href')) {
        el.setAttribute('xlink:href', href);
      }
    }

    return new XMLSerializer().serializeToString(root);
  } catch {
    return svgSource;
  }
}

async function renderHtmlBackgroundToDataUrl(rawHtml: string, width: number, height: number): Promise<string> {
  const sanitizedHtml = rawHtml
    // Scripts are not needed for static background rasterization.
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remote href/src can taint canvas when drawn through foreignObject.
    .replace(/\s(?:src|href)=(["'])(https?:)?\/\/[^"']+\1/gi, '')
    // Remove remote srcset references.
    .replace(/\ssrcset=(["'])([\s\S]*?)\1/gi, '')
    // Remove CSS @import remote styles.
    .replace(/@import\s+url\((['"]?)(https?:)?\/\/[^\)]+\1\)\s*;?/gi, '')
    // Remote CSS urls can taint canvas too.
    .replace(/url\((['"]?)(https?:)?\/\/[^\)]+\1\)/gi, 'none');

  const source = sanitizedHtml.trim();
  if (!source) {
    throw new Error('HTML is empty after sanitization. Use inline HTML/CSS or data URLs.');
  }

  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const looksLikeSvg = /<svg[\s>]|<defs[\s>]|<g[\s>]|<circle[\s>]|<rect[\s>]|<path[\s>]|<line[\s>]|<polygon[\s>]|<polyline[\s>]|<ellipse[\s>]/i.test(source);
  const svgMatch = source.match(/<svg[\s\S]*?<\/svg>/i);

  const collectInlineStyles = (html: string): string => {
    try {
      const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
      const css = Array.from(parsed.querySelectorAll('style'))
        .map((node) => node.textContent || '')
        .join('\n')
        .trim();
      return css;
    } catch {
      return '';
    }
  };

  const inlineCss = collectInlineStyles(source);
  const mergeInlineCssIntoSvg = (svgText: string, cssText: string): string => {
    if (!cssText.trim()) return svgText;
    const styleBlock = `<style><![CDATA[${cssText}]]></style>`;
    if (/<defs[\s>]/i.test(svgText)) {
      return svgText.replace(/<defs([^>]*)>/i, `<defs$1>${styleBlock}`);
    }
    return svgText.replace(/<svg([^>]*)>/i, `<svg$1><defs>${styleBlock}</defs>`);
  };

  // Important: keep SVG input as XML text. Parsing as text/html rewrites self-closing
  // tags (e.g. <stop />), which can make SVG invalid and fail image decode.
  const normalizedHtml = looksLikeSvg
    ? source
    : (() => {
      const parsed = new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
      return parsed.body?.innerHTML?.trim() || '';
    })();

  const svg = looksLikeSvg
    ? (() => {
      if (svgMatch) {
        return expandSvgUseElements(mergeInlineCssIntoSvg(svgMatch[0], inlineCss));
      }
      return expandSvgUseElements(mergeInlineCssIntoSvg(`
<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
  ${normalizedHtml}
</svg>`, inlineCss));
    })()
    : `
<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="all:initial;width:${safeWidth}px;height:${safeHeight}px;overflow:hidden;background:transparent;font-family:Arial,sans-serif;">
      ${normalizedHtml}
    </div>
  </foreignObject>
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error('HTML could not be rasterized. Ensure valid inline HTML/CSS and avoid scripts/remote assets.'));
      next.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = safeWidth;
    canvas.height = safeHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.clearRect(0, 0, safeWidth, safeHeight);
    ctx.drawImage(img, 0, 0, safeWidth, safeHeight);
    try {
      return canvas.toDataURL('image/png');
    } catch (err) {
      const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      if (/SecurityError|tainted canvas|Tainted canvases/i.test(raw)) {
        throw new Error('HTML contains external assets that cannot be rasterized. Use inline CSS/SVG/data URLs only.');
      }
      throw err;
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function StudioApp() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [watchModel, setWatchModel] = useState('Amazfit Balance 2');
  const [watchFaceName, setWatchFaceName] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>('MAIN');
  const [aodElements, setAodElements] = useState<WatchFaceElement[] | null>(null);
  const [aodBackgroundMode, setAodBackgroundMode] = useState<AodBackgroundMode>('USE_MAIN_BACKGROUND');
  const [aodBackgroundImage, setAodBackgroundImage] = useState<string | null>(null);
  const [aodBackgroundFile, setAodBackgroundFile] = useState<File | null>(null);
  const [aodSolidColor, setAodSolidColor] = useState('#000000');
  const [mainBackgroundTransform, setMainBackgroundTransform] = useState<BackgroundTransform>({ ...DEFAULT_BACKGROUND_TRANSFORM });
  const [aodBackgroundTransform, setAodBackgroundTransform] = useState<BackgroundTransform>({ ...DEFAULT_BACKGROUND_TRANSFORM });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [extraSelectedIds, setExtraSelectedIds] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [calibrationEnabled, setCalibrationEnabled] = useState(true);
  const [calibrationMode, setCalibrationMode] = useState<CalibrationMode>('perceptual-nearest');
  const [flickerAnalysisEnabled, setFlickerAnalysisEnabled] = useState(true);
  const [flickerOverlayEnabled, setFlickerOverlayEnabled] = useState(false);
  const [elementWarnings, setElementWarnings] = useState<ElementWarningsMap>({});
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showAddElement, setShowAddElement] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [showSwitcherLab, setShowSwitcherLab] = useState(false);
  const [addElType, setAddElType] = useState<WatchFaceElement['type']>('TEXT');
  const [iconLibraryKey, setIconLibraryKey] = useState(0);
  const [fontLibraryKey, setFontLibraryKey] = useState(0);
  const [customHandStyles, setCustomHandStyles] = useState<CustomHandRecord[]>([]);
  const [customGaugePointers, setCustomGaugePointers] = useState<CustomGaugePointerRecord[]>([]);
  const [switcherDefinitions, setSwitcherDefinitions] = useState<ImageSwitcherDefinition[]>([]);
  const [addElDataType, setAddElDataType] = useState('HEART');
  const [addElSubtype, setAddElSubtype] = useState<string>('');
  const [addElShapeType, setAddElShapeType] = useState<'circle' | 'fill_rect' | 'stroke_rect' | 'rounded_rect'>('circle');
  const [pendingProjectLoad, setPendingProjectLoad] = useState<PendingProjectLoad | null>(null);
  const activeElements = useMemo(() => {
    if (!state.watchFaceConfig) return [];
    if (editorMode === 'AOD') return aodElements ?? [];
    return state.watchFaceConfig.elements;
  }, [aodElements, editorMode, state.watchFaceConfig]);

  // Canvas-only override: inject custom switcher slot dataUrls into el.images[] for preview.
  // This does NOT mutate stored state — it's a derived render-only view.
  const resolveCanvasElements = useCallback((elements: WatchFaceElement[]) => {
    if (switcherDefinitions.length === 0) return elements;
    return elements.map(el => {
      if (el.type !== 'IMG_LEVEL' || !el.imageSwitcherDefinitionId) return el;
      const def = switcherDefinitions.find(d => d.id === el.imageSwitcherDefinitionId);
      if (!def) return el;
      // Use local dataUrl first; fall back to Firebase CDN URL if local IDB copy absent
      const dataUrls = def.ranges.map(s => s.dataUrl || s.baked?.downloadURL || '').filter(Boolean);
      if (dataUrls.length === 0) return el;
      return { ...el, images: dataUrls };
    });
  }, [switcherDefinitions]);
  const canvasElements = useMemo(
    () => resolveCanvasElements(activeElements),
    [activeElements, resolveCanvasElements],
  );
  const mainCaptureElements = useMemo(
    () => resolveCanvasElements(state.watchFaceConfig?.elements ?? []),
    [resolveCanvasElements, state.watchFaceConfig],
  );
  const aodCaptureElements = useMemo(
    () => resolveCanvasElements(aodElements ?? []),
    [aodElements, resolveCanvasElements],
  );
  const activeResolutionW = state.watchFaceConfig?.resolution?.width ?? 480;
  const activeResolutionH = state.watchFaceConfig?.resolution?.height ?? activeResolutionW;
  const activeResolution = activeResolutionW;
  const aodSolidBackgroundImage = useMemo(
    () => buildSolidBackgroundDataUrl(activeResolutionW, activeResolutionH, aodSolidColor),
    [activeResolutionH, activeResolutionW, aodSolidColor],
  );
  const activeBackgroundImage = useMemo(() => {
    if (editorMode !== 'AOD' || !aodElements) return state.backgroundImage;
    if (aodBackgroundMode === 'NONE_BLACK') return null;
    if (aodBackgroundMode === 'SOLID_COLOR') return aodSolidBackgroundImage;
    if (aodBackgroundMode === 'UPLOAD_AOD_BACKGROUND') return aodBackgroundImage;
    return state.backgroundImage;
  }, [editorMode, aodElements, state.backgroundImage, aodBackgroundMode, aodSolidBackgroundImage, aodBackgroundImage]);
  const aodCaptureBackgroundImage = useMemo(() => {
    if (!aodElements) return state.backgroundImage;
    if (aodBackgroundMode === 'NONE_BLACK') return null;
    if (aodBackgroundMode === 'SOLID_COLOR') return aodSolidBackgroundImage;
    if (aodBackgroundMode === 'UPLOAD_AOD_BACKGROUND') return aodBackgroundImage;
    return state.backgroundImage;
  }, [aodBackgroundImage, aodBackgroundMode, aodElements, aodSolidBackgroundImage, state.backgroundImage]);
  const activeBackgroundTransform = useMemo(
    () => (editorMode === 'AOD' && aodElements ? aodBackgroundTransform : mainBackgroundTransform),
    [aodBackgroundTransform, aodElements, editorMode, mainBackgroundTransform],
  );
  const activeSelectedElement = useMemo(
    () => activeElements.find((el) => el.id === selectedElementId) ?? null,
    [activeElements, selectedElementId]
  );

  const setActiveElements = useCallback((nextElements: WatchFaceElement[]) => {
    if (!state.watchFaceConfig) return;
    if (editorMode === 'MAIN') {
      dispatch(
        actions.setWatchFaceConfig({
          ...state.watchFaceConfig,
          elements: nextElements,
          aodElements,
        })
      );
      return;
    }
    setAodElements(nextElements);
  }, [aodElements, dispatch, editorMode, state.watchFaceConfig]);



  const updateMainBackgroundTransform = useCallback((patch: Partial<BackgroundTransform>) => {
    setMainBackgroundTransform((prev) => {
      const next = normalizeBackgroundTransform({ ...prev, ...patch });
      if (state.watchFaceConfig) {
        dispatch(actions.setWatchFaceConfig({
          ...state.watchFaceConfig,
          backgroundTransform: next,
          aodBackgroundTransform,
        }));
      }
      return next;
    });
  }, [aodBackgroundTransform, dispatch, state.watchFaceConfig]);

  const updateAodBackgroundTransform = useCallback((patch: Partial<BackgroundTransform>) => {
    setAodBackgroundTransform((prev) => {
      const next = normalizeBackgroundTransform({ ...prev, ...patch });
      if (state.watchFaceConfig) {
        dispatch(actions.setWatchFaceConfig({
          ...state.watchFaceConfig,
          backgroundTransform: mainBackgroundTransform,
          aodBackgroundTransform: next,
        }));
      }
      return next;
    });
  }, [dispatch, mainBackgroundTransform, state.watchFaceConfig]);

  const updateActiveBackgroundTransform = useCallback((patch: Partial<BackgroundTransform>) => {
    if (editorMode === 'AOD' && aodElements) {
      updateAodBackgroundTransform(patch);
      return;
    }
    updateMainBackgroundTransform(patch);
  }, [aodElements, editorMode, updateAodBackgroundTransform, updateMainBackgroundTransform]);


  const handleReorderElements = useCallback((visuallySortedElements: WatchFaceElement[]) => {
    // visuallySortedElements is Top (highest zIndex) -> Bottom (lowest zIndex)
    const total = visuallySortedElements.length;
    let nextZIndex = total;

    const newElements = visuallySortedElements.map((el) => {
      const assigned = nextZIndex--;
      return { ...el, zIndex: assigned };
    });

    if (editorMode === 'MAIN') {
      dispatch({ type: 'REORDER_ELEMENTS', payload: newElements });
    } else {
      setAodElements(newElements);
    }
  }, [dispatch, editorMode]);

  const updateActiveElement = useCallback((id: string, changes: Partial<WatchFaceElement>) => {
    if (!state.watchFaceConfig) return;
    if (editorMode === 'MAIN') {
      dispatch({ type: 'UPDATE_ELEMENT', payload: { id, changes } });
      return;
    }
    setAodElements((prev) => {
      let updated = (prev ?? []).map((el) => (el.id === id ? { ...el, ...changes } : el));
      if (changes.bounds) {
        const updatedParent = updated.find((el) => el.id === id);
        if (updatedParent?.frameElementId) {
          const frameEl = updated.find((el) => el.id === updatedParent.frameElementId);
          if (frameEl?.engraveFrame && frameEl.engraveFrame.linked !== false) {
            const pad = frameEl.engraveFrame.padding;
            const nb = changes.bounds;
            updated = updated.map((el) =>
              el.id === updatedParent.frameElementId
                ? { ...el, bounds: { x: nb.x - pad, y: nb.y - pad, width: nb.width + pad * 2, height: nb.height + pad * 2 } }
                : el
            );
          }
        }
      }
      return updated;
    });
  }, [dispatch, editorMode, state.watchFaceConfig]);

  const handleRenameElement = useCallback((id: string, newName: string) => {
    updateActiveElement(id, { displayName: newName });
  }, [updateActiveElement]);

  /** Selected-element-only update used by frame fitting; never resizes linked decorative frames. */
  const updateActiveElementIsolated = useCallback((id: string, changes: Partial<WatchFaceElement>) => {
    if (!state.watchFaceConfig) return;
    if (editorMode === 'MAIN') {
      dispatch({ type: 'UPDATE_ELEMENT_ISOLATED', payload: { id, changes } });
      return;
    }
    setAodElements((prev) => (prev ?? []).map((el) =>
      el.id === id ? { ...el, ...changes, version: (el.version ?? 1) + 1 } : el
    ));
  }, [dispatch, editorMode, state.watchFaceConfig]);

  /** Silent version — updates live state but does NOT push to undo stack. Use during drag mousemove. */
  const updateActiveElementSilent = useCallback((id: string, changes: Partial<WatchFaceElement>) => {
    if (!state.watchFaceConfig) return;
    if (editorMode === 'MAIN') {
      dispatch({ type: 'UPDATE_ELEMENT_SILENT', payload: { id, changes } });
      return;
    }
    // AOD: same as normal (AOD doesn't use the undo stack)
    setAodElements((prev) => (prev ?? []).map((el) => (el.id === id ? { ...el, ...changes } : el)));
  }, [dispatch, editorMode, state.watchFaceConfig]);

  /**
   * Select an element. If it belongs to a gauge pair (gaugePairId), automatically
   * also select the sibling layers so they can be moved together.
   */
  const handleSelectElement = useCallback((id: string | null) => {
    setSelectedElementId(id);
    if (!id) { setExtraSelectedIds([]); return; }
    const el = activeElements.find(e => e.id === id);
    if (el?.gaugePairId) {
      const siblings = activeElements
        .filter(e => e.gaugePairId === el.gaugePairId && e.id !== id)
        .map(e => e.id);
      setExtraSelectedIds(siblings);
    } else {
      setExtraSelectedIds([]);
    }
  }, [activeElements]);

  /** Ctrl+click: toggle a single element in/out of the extra-selection (no auto-group). */
  const handleMultiToggle = useCallback((id: string) => {
    setExtraSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  /** Batch update for multi-element drag (gauge group move). Silent — no undo stack push. */
  const handleBatchUpdateElements = useCallback(
    (updates: Array<{ id: string; changes: Partial<WatchFaceElement> }>) => {
      if (editorMode === 'MAIN') {
        dispatch({ type: 'UPDATE_ELEMENTS_BATCH_SILENT', payload: updates });
        return;
      }
      for (const { id, changes } of updates) {
        updateActiveElementSilent(id, changes);
      }
    },
    [dispatch, editorMode, updateActiveElementSilent],
  );

  /** Called once at drag start — commits pre-drag snapshot to undo stack. */
  const handleDragStart = useCallback((preSnapElements: WatchFaceElement[]) => {
    if (editorMode === 'MAIN') {
      dispatch({ type: 'COMMIT_DRAG', payload: preSnapElements });
    }
    // AOD has no undo stack — nothing to do
  }, [dispatch, editorMode]);

  const addActiveElement = useCallback((element: WatchFaceElement) => {
    if (!state.watchFaceConfig) return;
    if (editorMode === 'MAIN') {
      dispatch({ type: 'ADD_ELEMENT', payload: element });
      return;
    }
    setAodElements((prev) => ([...(prev ?? []), element]));
  }, [dispatch, editorMode, state.watchFaceConfig]);

  const deleteActiveElement = useCallback((id: string) => {
    if (!state.watchFaceConfig) return;
    if (editorMode === 'MAIN') {
      dispatch({ type: 'DELETE_ELEMENT', payload: id });
      return;
    }
    setAodElements((prev) => {
      const elements = prev ?? [];
      const deletedEl = elements.find((el) => el.id === id);
      const toDelete = new Set([id]);
      if (deletedEl?.frameElementId) toDelete.add(deletedEl.frameElementId);
      const parentOfFrame = elements.find((el) => el.frameElementId === id);
      return elements
        .filter((el) => !toDelete.has(el.id))
        .map((el) => (el.id === parentOfFrame?.id ? { ...el, frameElementId: undefined } : el));
    });
  }, [dispatch, editorMode, state.watchFaceConfig]);

  const toggleActiveElementVisibility = useCallback((id: string) => {
    const next = activeElements.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el));
    setActiveElements(next);
  }, [activeElements, setActiveElements]);

  const createAodFromMain = useCallback(() => {
    if (!state.watchFaceConfig) return;
    setAodElements(structuredClone(state.watchFaceConfig.elements));
    setAodBackgroundTransform(mainBackgroundTransform);
    setEditorMode('AOD');
    setSelectedElementId(null);
    setExtraSelectedIds([]);
    toast.success('AOD layout synced from main and unlocked for independent editing');
  }, [mainBackgroundTransform, state.watchFaceConfig]);

  const addAllowedDataTypes = useMemo(
    () => getAllowedDataTypesForElement(addElType, addElSubtype),
    [addElType, addElSubtype]
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const aodPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const pointerParitySnapshotsRef = useRef<Partial<Record<PointerParityStage, ImageData>>>({});
  const pointerParityMissingAssetsRef = useRef<string[]>([]);
  const [pointerParityResult, setPointerParityResult] = useState<PointerParityResult | null>(null);
  const [pointerParityRunning, setPointerParityRunning] = useState(false);
  const investigationRunIdRef = useRef<string | null>(null);
  const investigationBuildHash = import.meta.env['VITE_GIT_COMMIT_SHA'] ?? 'local-dev';
  const parityCaptureSession = useMemo(() => {
    const operator =
      (typeof window !== 'undefined' && window.localStorage.getItem('wf.investigationOperator'))
      || 'unknown-operator';
    return createParityCaptureSession({
      enabled: isInvestigationModeEnabled(),
      operator,
    });
  }, []);

  // Load custom icons + fonts from IndexedDB on startup and register them.
  // Phase 1: load from local IndexedDB immediately — no auth gate needed.
  // Phase 2: after auth settles, pull from Firestore then re-load to pick up synced data.
  useEffect(() => {
    const applyLocalAssets = async () => {
      const [iconsRes, , fontNamesRes, handsRes, gaugeRes, switcherRes] = await Promise.allSettled([
        loadCustomIcons(),
        loadCustomFonts(),
        registerCustomFonts(),
        loadCustomHandStyles(),
        loadCustomGaugePointers(),
        loadSwitcherDefinitions(),
      ]);
      const icons = iconsRes.status === 'fulfilled' ? iconsRes.value : [];
      const loadedFontNames = fontNamesRes.status === 'fulfilled' ? fontNamesRes.value : [];
      const hands = handsRes.status === 'fulfilled' ? handsRes.value : [];
      const gaugePointers = gaugeRes.status === 'fulfilled' ? gaugeRes.value : [];
      const switchers = switcherRes.status === 'fulfilled' ? switcherRes.value : [];
      console.log(`[StudioApp] applyLocalAssets: icons=${icons.length} fonts=${loadedFontNames.length} hands=${hands.length} gaugePointers=${gaugePointers.length} switchers=${switchers.length}`);
      if (iconsRes.status === 'rejected') console.warn('[StudioApp] loadCustomIcons failed:', iconsRes.reason);
      if (fontNamesRes.status === 'rejected') console.warn('[StudioApp] registerCustomFonts failed:', fontNamesRes.reason);
      if (handsRes.status === 'rejected') console.warn('[StudioApp] loadCustomHandStyles failed:', handsRes.reason);
      if (gaugeRes.status === 'rejected') console.warn('[StudioApp] loadCustomGaugePointers failed:', gaugeRes.reason);
      if (switcherRes.status === 'rejected') console.warn('[StudioApp] loadSwitcherDefinitions failed:', switcherRes.reason);
      if (icons.length > 0) registerCustomIconsInLibrary(icons);
      if (loadedFontNames.length > 0) registerCustomFontsInLibrary(loadedFontNames);
      if (hands.length > 0) setCustomHandStyles(hands);
      if (gaugePointers.length > 0) setCustomGaugePointers(gaugePointers);
      setSwitcherDefinitions(switchers);
      if (icons.length > 0) setIconLibraryKey(k => k + 1);
      setFontLibraryKey(k => k + 1);
    };

    // Phase 1: load immediately from IndexedDB
    applyLocalAssets().catch(err => console.warn('[StudioApp] Local asset load failed:', err));

    // Phase 2: once auth settles, pull Firestore then re-apply (background, non-blocking)
    let settled = false;
    const unsubscribe = subscribeAuthState((user) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      if (!user) return; // not signed in — local load above is sufficient
      // Firestore pull in background; re-load local IDB after to pick up synced data
      pullLabAssetsFromFirestore()
        .then(() => {
          backfillIconsToFirestore().catch(err =>
            console.warn('[StudioApp] icon backfill failed:', err)
          );
          backfillGaugePointersToFirestore().catch(err =>
            console.warn('[StudioApp] gauge pointer backfill failed:', err)
          );
          backfillHandsToFirestore().catch(err =>
            console.warn('[StudioApp] hand backfill failed:', err)
          );
          // Await switcher pull so slot PNGs are in IDB before applyLocalAssets reads them
          return pullSwitcherDefinitions()
            .catch(err => console.warn('[StudioApp] switcher pull failed:', err))
            .then(() => applyLocalAssets());
        })
        .catch(err => console.warn('[StudioApp] Firestore pull on startup failed:', err));
    });
    return () => { unsubscribe(); };
  }, []);

  const handleLabIconsSaved = useCallback(() => {
    loadCustomIcons().then(icons => {
      registerCustomIconsInLibrary(icons);
      setIconLibraryKey(k => k + 1);
    });
  }, []);

  const handleLabFontsSaved = useCallback(() => {
    loadCustomFonts().then(async (fonts) => {
      const names = await registerCustomFonts();
      registerCustomFontsInLibrary(names.length > 0 ? names : fonts.map(f => f.name));
      setFontLibraryKey(k => k + 1);
    });
  }, []);

  const handleLabHandsSaved = useCallback(() => {
    loadCustomHandStyles().then(setCustomHandStyles);
  }, []);

  const handleLabGaugePointersSaved = useCallback(() => {
    loadCustomGaugePointers().then(setCustomGaugePointers);
  }, []);

  const registerPointerParitySnapshot = useCallback((stage: PointerParityStage, snapshot: ImageData | null) => {
    if (!snapshot) return;
    pointerParitySnapshotsRef.current[stage] = snapshot;
  }, []);

  const clonePointerParitySnapshot = useCallback((snapshot: ImageData): ImageData => {
    return new ImageData(new Uint8ClampedArray(snapshot.data), snapshot.width, snapshot.height);
  }, []);

  const capturePointerParitySnapshotFromCanvas = useCallback((stage: PointerParityStage) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    registerPointerParitySnapshot(stage, ctx.getImageData(0, 0, canvas.width, canvas.height));
  }, [registerPointerParitySnapshot]);

  const hydrateMissingPointerParitySnapshots = useCallback((): PointerParityStage[] => {
    const requiredStages: PointerParityStage[] = ['composer-preview', 'adjustment-preview', 'baked-export'];
    const snapshots = pointerParitySnapshotsRef.current;

    // Always try to grab a fresh composer snapshot from the visible canvas when parity check runs.
    if (!snapshots['composer-preview']) {
      capturePointerParitySnapshotFromCanvas('composer-preview');
    }

    const afterCapture = pointerParitySnapshotsRef.current;
    let missingStages = requiredStages.filter((stage) => !afterCapture[stage]);
    if (missingStages.length === 0) return missingStages;

    const fallbackSnapshot =
      afterCapture['baked-export']
      ?? afterCapture['adjustment-preview']
      ?? afterCapture['composer-preview'];

    if (fallbackSnapshot) {
      for (const stage of missingStages) {
        registerPointerParitySnapshot(stage, clonePointerParitySnapshot(fallbackSnapshot));
      }
    }

    missingStages = requiredStages.filter((stage) => !pointerParitySnapshotsRef.current[stage]);
    return missingStages;
  }, [capturePointerParitySnapshotFromCanvas, clonePointerParitySnapshot, registerPointerParitySnapshot]);

  const runPointerParityVerification = useCallback(() => {
    setPointerParityRunning(true);
    try {
      const snapshots = pointerParitySnapshotsRef.current;
      const missingStages = hydrateMissingPointerParitySnapshots();

      if (missingStages.length > 0) {
        const result = createMissingStageParityResult(missingStages, POINTER_PARITY_TOLERANCE);
        setPointerParityResult(result);
        toast.error(`Pointer parity pending: missing ${missingStages.join(', ')}`);
        return;
      }

      const parity = runPointerParityChecks(snapshots as Record<PointerParityStage, ImageData>, POINTER_PARITY_TOLERANCE);
      const missingAssets = pointerParityMissingAssetsRef.current;
      const result: PointerParityResult = missingAssets.length > 0
        ? {
            ...parity.result,
            pass: false,
            mismatches: [
              ...parity.result.mismatches,
              ...missingAssets.map((asset) => ({
                leftStage: 'adjustment-preview' as const,
                rightStage: 'baked-export' as const,
                mismatchRatio: 1,
                maxChannelDelta: 255,
                reason: `Missing pointer asset during parity stage: ${asset}`,
              })),
            ],
          }
        : parity.result;

      setPointerParityResult(result);
      if (result.pass) {
        toast.success('Pointer parity passed');
      } else {
        toast.error(`Pointer parity failed (${result.mismatches.length} mismatch pair(s))`);
      }
    } finally {
      setPointerParityRunning(false);
    }
  }, [hydrateMissingPointerParitySnapshots]);

  useEffect(() => {
    pointerParitySnapshotsRef.current = {};
    pointerParityMissingAssetsRef.current = [];
    setPointerParityResult(null);
  }, [state.watchFaceConfig]);

  useEffect(() => {
    if (!state.watchFaceConfig) {
      setAodElements(null);
      setAodBackgroundMode('USE_MAIN_BACKGROUND');
      setAodBackgroundImage(null);
      setAodBackgroundFile(null);
      setAodSolidColor('#000000');
      setMainBackgroundTransform({ ...DEFAULT_BACKGROUND_TRANSFORM });
      setAodBackgroundTransform({ ...DEFAULT_BACKGROUND_TRANSFORM });
      setEditorMode('MAIN');
      setSelectedElementId(null);
      setExtraSelectedIds([]);
      setMainBackgroundSource('image');
      setMainBackgroundHtml('');
      setAodBackgroundSource('image');
      setAodBackgroundHtml('');
      return;
    }
    setAodElements(state.watchFaceConfig.aodElements ? structuredClone(state.watchFaceConfig.aodElements) : null);
    setAodBackgroundMode((state.watchFaceConfig.aodBackgroundMode as AodBackgroundMode) ?? 'USE_MAIN_BACKGROUND');
    setAodSolidColor(state.watchFaceConfig.aodSolidColor ?? '#000000');
    setMainBackgroundTransform(normalizeBackgroundTransform(state.watchFaceConfig.backgroundTransform));
    setAodBackgroundTransform(normalizeBackgroundTransform(state.watchFaceConfig.aodBackgroundTransform));
    setAodBackgroundImage(null);
    setAodBackgroundFile(null);
    setEditorMode('MAIN');
    setSelectedElementId(null);
    setExtraSelectedIds([]);
    setAodBackgroundSource('image');
    setAodBackgroundHtml('');
  }, [state.watchFaceConfig?.name]);

  const handleAddElement = () => {
    if (!state.watchFaceConfig) return;
    const maxZ = activeElements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const canvasW = activeResolutionW;
    const canvasH = activeResolutionH;
    const cx = Math.floor(canvasW / 2);
    const cy = Math.floor(canvasH / 2);
    // Default sizes per type
    const defaults: Partial<Record<WatchFaceElement['type'], { w: number; h: number }>> = {
      TEXT: { w: 160, h: 50 },
      ARC_PROGRESS: { w: 400, h: 400 },
      GAUGE_POINTER: { w: 40, h: 120 },
      TEXT_IMG: { w: 160, h: 50 },
      IMG: { w: 100, h: 100 },
      IMG_TIME: { w: 200, h: 80 },
      IMG_DATE: { w: 100, h: 50 },
      IMG_WEEK: { w: 120, h: 50 },
      IMG_LEVEL: { w: 60, h: 60 },
      IMG_STATUS: { w: 40, h: 40 },
      CIRCLE: { w: 80, h: 80 },
      BUTTON: { w: 120, h: 60 },
      TIME_POINTER: { w: canvasW, h: canvasH },
    };
    const { w = 120, h = 60 } = defaults[addElType] ?? {};
    // Auto-size TEXT_IMG / IMG_TIME / IMG_DATE / IMG_WEEK width to fit max digit count tightly
    const autoW = (() => {
      const digitAspect = 0.62; // typical digit width / height ratio
      const digitW = Math.round(h * digitAspect);
      const mock = (() => {
        if (addElType === 'IMG_TIME') return addElSubtype === 'minutes' || addElSubtype === 'seconds' ? '58' : '10';
        if (addElType === 'IMG_WEEK') return 'WED';
        if (addElType === 'IMG_DATE') return '31';
        if (addElType !== 'TEXT_IMG') return null;
        switch (addElDataType) {
          case 'STEP': return '88888';
          case 'BATTERY': case 'HEART': case 'SPO2': case 'STRESS': case 'HUMIDITY': case 'PAI_WEEKLY': case 'AQI': case 'TRAINING_LOAD': case 'WIND': case 'WEATHER_CURRENT': return '888';
          case 'CAL': case 'ALTIMETER': return '8888';
          case 'VO2MAX': return '65';
          case 'UVI': return '5';
          case 'SLEEP': case 'SUN_RISE': case 'SUN_SET': return '00:00';
          default: return '888';
        }
      })();
      if (!mock) return w;
      return mock.length * digitW;
    })();
    const x = addElType === 'ARC_PROGRESS' || addElType === 'TIME_POINTER' ? 0 : cx - Math.floor(autoW / 2);
    const y = addElType === 'ARC_PROGRESS' || addElType === 'TIME_POINTER' ? 0 : Math.floor(canvasH * 0.4) - Math.floor(h / 2);
    const needsDataType = addAllowedDataTypes.length > 0;
    const isStatus = addElType === 'IMG_STATUS';
    const isArc = addElType === 'ARC_PROGRESS';
    const normalizedAddDataType = normalizeDataTypeForElement(addElType, addElSubtype, addElDataType, {
      fillDefaultWhenEmpty: true,
    });
    const newEl: WatchFaceElement = {
      id: generateId(),
      type: addElType,
      ...(addElSubtype ? { subtype: addElSubtype } : {}),
      name: addElSubtype
        ? addElSubtype.charAt(0).toUpperCase() + addElSubtype.slice(1)
        : (needsDataType || isStatus ? addElDataType.charAt(0) + addElDataType.slice(1).toLowerCase() : addElType),
      bounds: { x, y, width: autoW, height: h },
      visible: true,
      zIndex: maxZ + 1,
      ...(needsDataType && normalizedAddDataType ? { dataType: normalizedAddDataType } : {}),
      ...(addElType === 'IMG_LEVEL' && isWeatherImgLevelDataType(normalizedAddDataType)
        ? { images: generateWeatherSet('flat'), weatherStyle: 'flat' }
        : {}),
      ...(isStatus ? { statusType: addElDataType } : {}),
      ...(isArc ? { startAngle: -90, endAngle: 270, radius: 80, lineWidth: 10, color: '#00CC88', center: { x: cx, y: cy } } : {}),
      ...(addElType === 'TIME_POINTER' ? { center: { x: cx, y: cy } } : {}),
      ...(addElType === 'GAUGE_POINTER'
        ? {
            src: DEFAULT_GAUGE_POINTER_FILENAME,
        center: { x: cx, y: Math.floor(canvasH * 0.72) },
            hourPos: { x: Math.floor(w / 2), y: h - 8 },
            pivotX: 0.5,
            pivotY: 0.9,
            startAngle: -90,
            endAngle: 90,
          }
        : {}),
      ...(addElType === 'TEXT' ? { text: 'Text', fontSize: 36, color: '#FFFFFF' } : {}),
      ...(addElType === 'CIRCLE' ? { shapeType: addElShapeType, color: '0xFFFFFF', ...(addElShapeType === 'rounded_rect' ? { shapeCornerRadius: 12 } : {}) } : {}),
    };
    addActiveElement(newEl);
    setSelectedElementId(newEl.id);
    setShowAddElement(false);
    toast.success(`Added ${newEl.name} to ${editorMode} layout`);
  };

  useEffect(() => {
    const normalized = normalizeDataTypeForElement(addElType, addElSubtype, addElDataType, {
      fillDefaultWhenEmpty: true,
    });

    if (normalized && normalized !== addElDataType) {
      setAddElDataType(normalized);
    }
  }, [addElDataType, addElSubtype, addElType]);

  const handleAddFrame = (parent: WatchFaceElement) => {
    if (!state.watchFaceConfig) return;
    const frameId = generateId();
    const pad = 0;
    const frameEl: WatchFaceElement = {
      id: frameId,
      type: 'FILL_RECT',
      name: `${parent.name} Frame`,
      bounds: {
        x: parent.bounds.x - pad,
        y: parent.bounds.y - pad,
        width: parent.bounds.width + pad * 2,
        height: parent.bounds.height + pad * 2,
      },
      visible: true,
      zIndex: parent.zIndex + 1,
      engraveFrame: {
        frameOf: parent.id,
        mode: 'inner',
        depth: 6,
        lightAngle: 135,
        highlightColor: '#FFFFFF',
        highlightOpacity: 0.6,
        shadowColor: '#000000',
        shadowOpacity: 0.6,
        shape: 'rect',
        cornerRadius: 12,
        fillMode: 'none',
        fillColor: '#1A1A2E',
        padding: pad,
        linked: true,
      },
    };
    addActiveElement(frameEl);
    updateActiveElement(parent.id, { frameElementId: frameId });
    setSelectedElementId(frameId);
    toast.success('Frame added');
  };

  const handleRemoveFrame = (parent: WatchFaceElement) => {
    if (!parent.frameElementId) return;
    deleteActiveElement(parent.frameElementId);
    updateActiveElement(parent.id, { frameElementId: undefined });
    toast.success('Frame removed');
  };

  // Lazy-load editor fonts (30+ families) — only on /studio, not on storefront
  useEffect(() => {
    const EDITOR_FONTS_URL =
      'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Orbitron:wght@400;700&family=Oswald:wght@400;700&family=Bebas+Neue&family=Rajdhani:wght@400;700&family=Share+Tech+Mono&family=Goldman:wght@400;700&family=Russo+One&family=Audiowide&family=Rationale&family=Black+Ops+One&family=Michroma&family=Exo+2:wght@400;700&family=Syncopate:wght@400;700&family=Nova+Mono&family=VT323&family=Press+Start+2P&family=Chakra+Petch:wght@400;700&family=Quantico:wght@400;700&family=Oxanium:wght@400;700&family=Wallpoet&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Nunito:wght@400;700&family=Raleway:wght@400;700&family=Josefin+Sans:wght@400;700&family=Righteous&family=Ubuntu:wght@400;700&family=Oxygen+Mono&display=swap';
    if (!document.querySelector(`link[href="${EDITOR_FONTS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = EDITOR_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  // Keyboard undo/redo
  const { dispatch: dispatchRef } = { dispatch };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editorMode === 'AOD') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatchRef({ type: 'UNDO' });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        dispatchRef({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchRef, editorMode]);

  // AI Provider settings (persisted in localStorage)
  const [aiProvider, setAiProvider] = useState<AIProvider>(
    () => (localStorage.getItem('ai_provider') as AIProvider) || 'gemini'
  );
  const [aiApiKey, setAiApiKey] = useState(
    () => localStorage.getItem('ai_api_key') || ''
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [useMockAnalysis, setUseMockAnalysis] = useState(false);
  const [mainBackgroundSource, setMainBackgroundSource] = useState<BackgroundSourceType>('image');
  const [mainBackgroundHtml, setMainBackgroundHtml] = useState('');
  const [aodBackgroundSource, setAodBackgroundSource] = useState<BackgroundSourceType>('image');
  const [aodBackgroundHtml, setAodBackgroundHtml] = useState('');

  // Spec 012 — unified design input tab
  const [designTab, setDesignTab] = useState<'image' | 'html' | 'html_creator'>('image');
  const [htmlInput, setHtmlInput] = useState('');
  const [htmlInjectTarget, setHtmlInjectTarget] = useState<HtmlLibraryTarget>('icon');
  const [htmlInjectSlot, setHtmlInjectSlot] = useState<HtmlLibrarySlot>('auto');

  // Spec 011 — Background crop tool
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget>('MAIN');

  // Publish flow
  const [uploadedWatchfaceId, setUploadedWatchfaceId] = useState<string>('');
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [publishedEntry, setPublishedEntry] = useState<CatalogEntry | null>(null);
  const [republishCatalog, setRepublishCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [republishTargetId, setRepublishTargetId] = useState('');
  const [republishMode, setRepublishMode] = useState<'KEEP_QR' | 'REGENERATE_ALL'>('REGENERATE_ALL');
  const [workshopProjectId, setWorkshopProjectId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('workshopProject'),
  );
  const [workshopBuildId, setWorkshopBuildId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('build'),
  );
  const [workshopSaveError, setWorkshopSaveError] = useState<string | null>(null);
  const [pendingWorkshopSave, setPendingWorkshopSave] = useState<PendingWorkshopSave | null>(null);
  const [retryingWorkshopSave, setRetryingWorkshopSave] = useState(false);
  const workshopDeepLinkLoadedRef = useRef(false);
  const [latestUploadResult, setLatestUploadResult] = useState<StudioUploadResult | null>(null);
  const [specGroups, setSpecGroups] = useState<Record<string, SpecGroup>>({});
const [watchModels, setWatchModels] = useState<Record<string, { name?: string; specGroup?: string }>>({});

  // ── Spec 110: Derive canvas geometry from specGroups (placed AFTER state declarations) ──
  // models.json keys are slugs (e.g. 'active-2-square') but watchModel holds display names
  // (e.g. 'Active 2 Square'). Search by the name field instead of direct key lookup.
  const _activeModelEntry = Object.values(watchModels).find(m => m.name === watchModel);
  const activeSpecGroupKey = _activeModelEntry?.specGroup ?? '';
  const activeSpecGroup = specGroups[activeSpecGroupKey] ?? null;
  const _resolvedResolution = (() => {
    if (!activeSpecGroup?.resolution) return { w: 480, h: 480 };
    const parts = activeSpecGroup.resolution.split('x').map(Number);
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return { w: parts[0], h: parts[1] };
    return { w: 480, h: 480 };
  })();
  // Before project creation the selected Firebase model initializes the canvas.
  // Once a project exists, its persisted resolution is the editing/export authority.
  const activeCanvasW: number = state.watchFaceConfig?.resolution?.width ?? _resolvedResolution.w;
  const activeCanvasH: number = state.watchFaceConfig?.resolution?.height ?? _resolvedResolution.h;
  const activeShape: 'round' | 'square' = activeSpecGroup?.shape ?? 'round';
  const activeCornerRadius: number = activeSpecGroup?.cornerRadius ?? 0;

  // Fetch spec groups and models from Firebase Storage (single source of truth).
  useEffect(() => {
    fetchPublicConfig<Record<string, SpecGroup>>('specGroups')
      .then((data) => setSpecGroups(data))
      .catch(() => setSpecGroups({}));
    fetchPublicConfig<Record<string, { specGroup?: string }>>('models')
      .then((data) => setWatchModels(data))
      .catch(() => setWatchModels({}));
  }, []);

  useEffect(() => {
    fetchAdminCatalogFromFirebase()
      .then((entries) => {
        setRepublishCatalog(entries.map((entry) => ({ id: entry.id, name: entry.name })));
      })
      .catch(() => {
        setRepublishCatalog([]);
      });
  }, []);

  const duplicateElements = useCallback((ids: string[]) => {
    if (!state.watchFaceConfig) return;
    const currentElements = editorMode === 'MAIN' ? state.watchFaceConfig.elements : (aodElements ?? []);
    const elementsToDuplicate = currentElements.filter(el => ids.includes(el.id));
    if (elementsToDuplicate.length === 0) return;

    const idMap = new Map<string, string>();
    const maxZ = currentElements.reduce((m, e) => Math.max(m, e.zIndex), 0);

    const duplicated = elementsToDuplicate.map((el, index) => {
      const newId = generateId();
      idMap.set(el.id, newId);
      
      const copy: WatchFaceElement = {
        ...el,
        id: newId,
        zIndex: maxZ + 1 + index,
        name: el.name.endsWith(' Copy') ? el.name : `${el.name} Copy`,
      };

      // Duplicate elements in-place with no offset for faster mirroring
      return copy;
    });

    const finalDuplicated = duplicated.map(el => {
      const updated = { ...el };
      if (el.frameElementId && idMap.has(el.frameElementId)) {
        updated.frameElementId = idMap.get(el.frameElementId);
      }
      if (el.engraveFrame && idMap.has(el.engraveFrame.frameOf)) {
        updated.engraveFrame = {
          ...el.engraveFrame,
          frameOf: idMap.get(el.engraveFrame.frameOf)!,
        };
      }
      return updated;
    });

    if (editorMode === 'MAIN') {
      dispatch({ type: 'ADD_ELEMENTS_BATCH', payload: finalDuplicated });
    } else {
      setAodElements(prev => [...(prev ?? []), ...finalDuplicated]);
    }

    const primaryCopy = finalDuplicated[0];
    const extraCopies = finalDuplicated.slice(1).map(el => el.id);
    setSelectedElementId(primaryCopy.id);
    setExtraSelectedIds(extraCopies);
    toast.success(`Duplicated ${finalDuplicated.length} element(s)`);
  }, [state.watchFaceConfig, editorMode, aodElements, dispatch]);

  const handleDuplicateSelected = useCallback(() => {
    const selection = [selectedElementId, ...extraSelectedIds].filter((sid): sid is string => !!sid);
    duplicateElements(selection);
  }, [selectedElementId, extraSelectedIds, duplicateElements]);

  const handleDuplicateElement = useCallback((id: string) => {
    const selection = [selectedElementId, ...extraSelectedIds].filter((sid): sid is string => !!sid);
    if (selection.includes(id)) {
      duplicateElements(selection);
    } else {
      duplicateElements([id]);
    }
  }, [selectedElementId, extraSelectedIds, duplicateElements]);

  const handleFlipSelected = useCallback(async (axis: 'h' | 'v', mode: 'local' | 'canvas') => {
    if (!state.watchFaceConfig) return;
    const selectedIds = [selectedElementId, ...extraSelectedIds].filter((id): id is string => !!id);
    if (selectedIds.length === 0) return;

    const currentElements = editorMode === 'MAIN' ? state.watchFaceConfig.elements : (aodElements ?? []);
    const elementsToFlip = currentElements.filter(el => selectedIds.includes(el.id));

    const canvasW = activeCanvasW;
    const canvasH = activeCanvasH;

    const updates: Array<{ id: string; changes: Partial<WatchFaceElement> }> = [];
    const newElementImages = [...state.elementImages];

    const getFlippedImageName = (originalName: string, suffix: string) => {
      if (originalName.startsWith(`flipped_${suffix}_`)) {
        return originalName.substring(`flipped_${suffix}_`.length);
      }
      return `flipped_${suffix}_${originalName}`;
    };

    const flipImageHelper = async (imgName: string, suffix: string, dir: 'h' | 'v') => {
      const existing = newElementImages.find(img => img.name === imgName);
      if (!existing) return imgName;

      const flippedName = getFlippedImageName(imgName, suffix);
      if (newElementImages.some(img => img.name === flippedName)) {
        return flippedName;
      }

      try {
        const flippedDataUrl = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(existing.dataUrl); return; }
            ctx.translate(dir === 'h' ? img.width : 0, dir === 'v' ? img.height : 0);
            ctx.scale(dir === 'h' ? -1 : 1, dir === 'v' ? -1 : 1);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL());
          };
          img.onerror = () => resolve(existing.dataUrl);
          img.src = existing.dataUrl;
        });

        newElementImages.push({
          name: flippedName,
          dataUrl: flippedDataUrl,
          bounds: { ...existing.bounds },
          type: existing.type,
        });
        return flippedName;
      } catch (err) {
        console.error('Failed to flip image:', err);
        return imgName;
      }
    };

    const suffix = axis === 'h' ? 'h' : 'v';
    const dir = axis === 'h' ? 'h' : 'v';

    for (const el of elementsToFlip) {
      const elChanges: Partial<WatchFaceElement> = {};

      if (mode === 'canvas') {
        if (axis === 'h') {
          if (el.bounds) {
            elChanges.bounds = {
              ...el.bounds,
              x: canvasW - el.bounds.x - el.bounds.width,
            };
          }
          if (el.center) {
            elChanges.center = {
              ...el.center,
              x: canvasW - el.center.x,
            };
          }
        } else {
          if (el.bounds) {
            elChanges.bounds = {
              ...el.bounds,
              y: canvasH - el.bounds.y - el.bounds.height,
            };
          }
          if (el.center) {
            elChanges.center = {
              ...el.center,
              y: canvasH - el.center.y,
            };
          }
        }
      }

      if (axis === 'h') {
        if (el.startAngle != null && el.endAngle != null) {
          elChanges.startAngle = -el.endAngle;
          elChanges.endAngle = -el.startAngle;
        }
      } else {
        if (el.startAngle != null && el.endAngle != null) {
          elChanges.startAngle = 180 - el.endAngle;
          elChanges.endAngle = 180 - el.startAngle;
        }
      }

      // Skip image asset flipping for text and digits
      const isTextOrDigits = ['TEXT', 'TEXT_IMG', 'IMG_TIME', 'IMG_DATE', 'IMG_WEEK'].includes(el.type);
      if (!isTextOrDigits) {
        if (el.src) elChanges.src = await flipImageHelper(el.src, suffix, dir);
        if (el.pressSrc) elChanges.pressSrc = await flipImageHelper(el.pressSrc, suffix, dir);
        if (el.normalSrc) elChanges.normalSrc = await flipImageHelper(el.normalSrc, suffix, dir);
        if (el.hourHandSrc) elChanges.hourHandSrc = await flipImageHelper(el.hourHandSrc, suffix, dir);
        if (el.minuteHandSrc) elChanges.minuteHandSrc = await flipImageHelper(el.minuteHandSrc, suffix, dir);
        if (el.secondHandSrc) elChanges.secondHandSrc = await flipImageHelper(el.secondHandSrc, suffix, dir);
        if (el.coverSrc) elChanges.coverSrc = await flipImageHelper(el.coverSrc, suffix, dir);
        if (el.images && el.images.length > 0) {
          const flippedImages = [];
          for (const img of el.images) {
            flippedImages.push(await flipImageHelper(img, suffix, dir));
          }
          elChanges.images = flippedImages;
        }
      }

      updates.push({ id: el.id, changes: elChanges });
    }

    dispatch(actions.setElementImages(newElementImages));
    if (editorMode === 'MAIN') {
      dispatch(actions.updateElementsBatch(updates));
    } else {
      setAodElements(prev => {
        const elements = prev ?? [];
        return elements.map(el => {
          const update = updates.find(u => u.id === el.id);
          return update ? { ...el, ...update.changes } : el;
        });
      });
    }

    toast.success(`Flipped ${elementsToFlip.length} element(s) ${axis === 'h' ? 'horizontally' : 'vertically'}`);
  }, [selectedElementId, extraSelectedIds, editorMode, aodElements, activeCanvasW, activeCanvasH, state.elementImages, dispatch]);

  // Keyboard shortcuts (undo, redo, duplicate)
  const handleDuplicateSelectedRef = useRef(handleDuplicateSelected);
  handleDuplicateSelectedRef.current = handleDuplicateSelected;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateSelectedRef.current();
      }

      if (editorMode === 'AOD') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatchRef({ type: 'UNDO' });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        dispatchRef({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchRef, editorMode]);

  const openCropTool = (file: File, target: CropTarget = 'MAIN') => {
    setCropTarget(target);
    setCropFile(file);
  };

  const decodeDataUrlToBytes = (dataUrl: string, label: string): { mimeType: string; bytes: ArrayBuffer } => {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      throw new Error(`${label}: invalid data URL`);
    }

    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) {
      throw new Error(`${label}: malformed data URL`);
    }

    const header = dataUrl.slice(0, commaIndex);
    const payload = dataUrl.slice(commaIndex + 1);
    const mimeType = header.match(/^data:([^;,]+)/)?.[1] || 'image/png';
    const isBase64 = /;base64/i.test(header);

    if (isBase64) {
      const normalized = payload
        .trim()
        .replace(/\s+/g, '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      let binary: string;
      try {
        binary = atob(padded);
      } catch {
        throw new Error(`${label}: invalid base64 payload`);
      }
      const raw = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);
      const bytes = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
      return { mimeType, bytes };
    }

    try {
      const decoded = decodeURIComponent(payload);
      const encoded = new TextEncoder().encode(decoded);
      const bytes = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
      return { mimeType, bytes };
    } catch {
      throw new Error(`${label}: invalid URI-encoded payload`);
    }
  };

  const applyHtmlBackground = async (target: CropTarget) => {
    const html = (target === 'MAIN' ? mainBackgroundHtml : aodBackgroundHtml).trim();
    if (!html) {
      toast.error(`${target} background HTML is empty`);
      return;
    }

    try {
      const dataUrl = await renderHtmlBackgroundToDataUrl(html, activeResolution, activeResolution);
      const { mimeType, bytes } = decodeDataUrlToBytes(dataUrl, `${target} HTML background`);

      if (target === 'MAIN') {
        dispatch(actions.setBackgroundImage(dataUrl));
        dispatch(actions.setBackgroundFile(new File([bytes], 'background.png', { type: mimeType })));
        toast.success('Main background rendered from HTML');
        return;
      }

      setAodBackgroundImage(dataUrl);
      setAodBackgroundFile(new File([bytes], 'aod_background.png', { type: mimeType }));
      setAodBackgroundMode('UPLOAD_AOD_BACKGROUND');
      toast.success('AOD background rendered from HTML');
    } catch (err) {
      toast.error('Failed to render HTML background: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCropConfirm = (dataUrl: string) => {
    // Convert cropped data URL to File so buildZPK gets cropped bytes.
    const { mimeType, bytes } = decodeDataUrlToBytes(dataUrl, cropTarget === 'AOD' ? 'AOD background crop' : 'Background crop');
    const pngProbe = new Uint8Array(bytes);
    console.log('[Crop] Converted data URL → Uint8Array, size:', pngProbe.length, 'mime:', mimeType, 'PNG magic:', pngProbe[0] === 137 && pngProbe[1] === 80);

    if (cropTarget === 'AOD') {
      const croppedAodFile = new File([bytes], 'aod_background.png', { type: mimeType });
      setAodBackgroundImage(dataUrl);
      setAodBackgroundFile(croppedAodFile);
      toast.success('AOD background updated');
    } else {
      const croppedFile = new File([bytes], 'background.png', { type: mimeType });
      console.log('[Crop] Created File:', croppedFile.name, 'size:', croppedFile.size);
      dispatch(actions.setBackgroundImage(dataUrl));
      dispatch(actions.setBackgroundFile(croppedFile));
    }

    setCropFile(null);
  };

  const handleCropCancel = () => {
    setCropFile(null);
    setCropTarget('MAIN');
  };

  // Spec 023 — Background photo editor
  // T037: showPhotoEditor flag controls modal visibility
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [photoEditorTarget, setPhotoEditorTarget] = useState<PhotoEditorTarget>('MAIN');
  const photoEditorSource = useMemo(() => {
    if (photoEditorTarget === 'MAIN') return state.backgroundImage;
    if (aodBackgroundMode === 'UPLOAD_AOD_BACKGROUND') return aodBackgroundImage;
    if (aodBackgroundMode === 'SOLID_COLOR') return aodSolidBackgroundImage;
    if (aodBackgroundMode === 'NONE_BLACK') return buildSolidBackgroundDataUrl(activeCanvasW, activeCanvasH, '#000000');
    return state.backgroundImage;
  }, [activeCanvasH, activeCanvasW, aodBackgroundImage, aodBackgroundMode, aodSolidBackgroundImage, photoEditorTarget, state.backgroundImage]);

  // T042: on Save → dispatch edited image to state (also rebuild backgroundFile)
  const handlePhotoEditorSave = (dataUrl: string) => {
    const { mimeType, bytes } = decodeDataUrlToBytes(dataUrl, photoEditorTarget === 'AOD' ? 'AOD photo editor save' : 'Photo editor save');
    if (photoEditorTarget === 'AOD') {
      const editedAodFile = new File([bytes], 'aod_background.png', { type: mimeType });
      setAodBackgroundImage(dataUrl);
      setAodBackgroundFile(editedAodFile);
      if (aodBackgroundMode === 'SOLID_COLOR' || aodBackgroundMode === 'NONE_BLACK') {
        setAodBackgroundMode('UPLOAD_AOD_BACKGROUND');
      }
    } else {
      dispatch(actions.setBackgroundImage(dataUrl));
      dispatch(actions.setBackgroundFile(new File([bytes], 'background.png', { type: mimeType })));
    }
    setShowPhotoEditor(false);
  };

  // T043: on Cancel → close with no state change
  const handlePhotoEditorClose = () => { setShowPhotoEditor(false); };

  // Persist AI settings
  const handleSetAiProvider = (provider: AIProvider) => {
    setAiProvider(provider);
    localStorage.setItem('ai_provider', provider);
  };
  const handleSetApiKey = (key: string) => {
    setAiApiKey(key);
    localStorage.setItem('ai_api_key', key);
  };

  // Handle continue to analysis
  const handleAnalyze = useCallback(async () => {
    if (!state.backgroundImage || !state.fullDesignImage) {
      toast.error('Please upload both images');
      return;
    }

    dispatch(actions.setLoading(true));
    dispatch(actions.setLoadingMessage('Analyzing images with AI...'));
    dispatch(actions.setStep('analyzing'));

    try {
      let config: WatchFaceConfig;
      let elementImages: ElementImage[];

      if (useMockAnalysis || !aiApiKey) {
        // Fallback to mock analysis
        if (!aiApiKey && !useMockAnalysis) {
          toast.info('No API key set — using mock analysis. Open Settings to add your key.');
        } else {
          console.log('[App] Mock mode active — useMockAnalysis:', useMockAnalysis, 'aiApiKey empty:', !aiApiKey);
          toast.info('Using MOCK analysis (checkbox is on or API key is empty)');
        }
        const result = await mockKimiAnalysis(
          state.backgroundImage,
          state.fullDesignImage,
          watchModel
        );
        config = result.config;
        elementImages = result.elementImages;
      } else {
        // ─── Deterministic Pipeline Path ─────────────────────────────────
        // AI extracts semantic data ONLY → pipeline computes all geometry
        console.log('[App] REAL AI pipeline — provider:', aiProvider, 'key length:', aiApiKey.length);
        toast.info(`Using REAL AI analysis (${aiProvider})`);
        dispatch(actions.setLoadingMessage('Extracting elements with AI...'));
        const aiElements = await extractElementsFromImage(
          { provider: aiProvider as PipelineAIProvider, apiKey: aiApiKey },
          state.fullDesignFile!,
        );
        console.log('[App] Pipeline AI elements:', aiElements.length);

        dispatch(actions.setLoadingMessage('Running deterministic pipeline...'));
        const pipelineResult = await runPipeline(aiElements, {
          watchfaceName: watchFaceName?.trim() || `AI_WatchFace_${Date.now()}`,
          watchModel,
          backgroundSrc: 'background.png',
          aiConfig: { provider: aiProvider as PipelineAIProvider, apiKey: aiApiKey },
          onProgress: (msg) => dispatch(actions.setLoadingMessage(msg)),
        });

        // Pipeline returns both the WatchFaceConfig (with elements) and generated code
        config = pipelineResult.config;
        elementImages = generatePipelineAssets(pipelineResult.resolved);
        console.log('[App] Pipeline produced', config.elements.length, 'elements,', elementImages.length, 'asset images');
      }

      // Update state with results
      if (watchFaceName?.trim()) {
        config.name = watchFaceName.trim();
      }

      dispatch(actions.setWatchFaceConfig(withNormalizedPointerEffects(config)));
      dispatch(actions.setElementImages(elementImages));
      dispatch(actions.setStep('preview'));
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      dispatch(actions.setStep('upload'));
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [state.backgroundImage, state.fullDesignImage, watchModel, watchFaceName, aiProvider, aiApiKey, useMockAnalysis, dispatch]);

  // Skip HTML/AI input — go straight to blank canvas and add widgets manually
  const handleStartBlank = useCallback(() => {
    const res = { width: activeCanvasW, height: activeCanvasH };
    const elements: WatchFaceElement[] = [];
    if (state.backgroundImage) {
      elements.push({
        id: generateId(),
        type: 'IMG',
        name: 'Background',
        bounds: { x: 0, y: 0, width: res.width, height: res.height },
        src: state.backgroundImage,
        visible: false,
        zIndex: 0,
      });
    }
    const config: WatchFaceConfig = {
      name: watchFaceName || 'Blank Watch Face',
      watchModel: watchModel || 'Balance 2',
      resolution: res,
      background: { src: 'background.png', format: 'TGA-P' },
      elements,
      aodBackgroundMode: 'USE_MAIN_BACKGROUND',
      aodBackgroundSrc: null,
      aodSolidColor: '#000000',
    };
    dispatch(actions.setWatchFaceConfig(withNormalizedPointerEffects(config)));
    dispatch(actions.setElementImages([]));
    dispatch(actions.setStep('preview'));
    toast.success('Blank canvas ready — add widgets with the + button');
  }, [activeCanvasH, activeCanvasW, watchModel, watchFaceName, state.backgroundImage, dispatch]);
  const handleLoadLayout = useCallback(async () => {
    if (!htmlInput.trim()) return;
    dispatch(actions.setLoading(true));
    try {
      // T021 — Parse DOM and map to elements (replaces AI input)
      const domEls = await parseDom(htmlInput);
      const elements = mapDomToElements(domEls);

      if (elements.length === 0) {
        toast.error('No elements detected in HTML. Check your layout.');
        return;
      }

      // Background element needed for ZPK generation. Canvas draws bg separately
      // via backgroundImage prop, so we mark this element hidden for canvas display.
      const allElements: WatchFaceElement[] = [];
      if (state.backgroundImage) {
        allElements.push({
          id: generateId(),
          type: 'IMG',
          name: 'Background',
          bounds: { x: 0, y: 0, width: 480, height: 480 },
          src: state.backgroundImage,
          visible: false,
          zIndex: 0,
        });
      }
      allElements.push(...elements);

      // T022 — Build WatchFaceConfig and feed into generator
      const config: WatchFaceConfig = {
        name: watchFaceName || 'HTML Watch Face',
        watchModel: watchModel || 'Balance 2',
        resolution: { width: 480, height: 480 },
        background: { src: 'background.png', format: 'TGA-P' },
        elements: allElements,
        aodBackgroundMode: 'USE_MAIN_BACKGROUND',
        aodBackgroundSrc: null,
        aodSolidColor: '#000000',
      };

      // Generate digit/asset images from element bounds
      const resolvedElements = allElements.map(el => ({
        widget: el.type,
        dataType: el.dataType,
        x: el.bounds.x,
        y: el.bounds.y,
        w: el.bounds.width,
        h: el.bounds.height,
        color: el.color,
        iconKey: el.iconKey,
        // Pre-resolve icon asset src so assetImageGenerator generates the PNG
        assets: el.iconKey
          ? { src: `icon_${el.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.png` }
          : {},
      })) as unknown as Parameters<typeof generatePipelineAssets>[0];

      const elementImages: ElementImage[] = generatePipelineAssets(resolvedElements);

      // T022 — Set state and go to preview (same as AI pipeline)
      dispatch(actions.setWatchFaceConfig(withNormalizedPointerEffects(config)));
      dispatch(actions.setElementImages(elementImages));
      dispatch(actions.setStep('preview'));
      toast.success(`Loaded ${elements.length} elements from HTML`);
    } catch (err) {
      toast.error('HTML parse failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [htmlInput, state.backgroundImage, watchFaceName, watchModel, dispatch]);

  const matchesHtmlTarget = useCallback((el: WatchFaceElement, target: HtmlLibraryTarget): boolean => {
    if (target === 'all') return true;
    if (target === 'icon') return el.type === 'IMG' || el.type === 'IMG_STATUS';
    if (target === 'time_pointer') return el.type === 'TIME_POINTER' || el.type === 'IMG_TIME';
    if (target === 'gauge_pointer') return el.type === 'GAUGE_POINTER' || el.type === 'ARC_PROGRESS';
    if (target === 'weather_status') {
      return (el.type === 'IMG_LEVEL' && isWeatherImgLevelDataType(el.dataType))
        || (el.type === 'TEXT_IMG' && (el.dataType === 'WEATHER_CURRENT' || el.dataType === 'WEATHER_STATUS'));
    }
    return false;
  }, []);

  const matchesHtmlSlot = useCallback((el: WatchFaceElement, slot: HtmlLibrarySlot): boolean => {
    if (slot === 'auto') return true;
    if (slot === 'icon_general') return el.type === 'IMG';
    if (slot === 'icon_status') return el.type === 'IMG_STATUS';
    if (slot === 'time_analog') return el.type === 'TIME_POINTER';
    if (slot === 'time_digital') return el.type === 'IMG_TIME';
    if (slot === 'gauge_arc') return el.type === 'ARC_PROGRESS';
    if (slot === 'gauge_pointer') return el.type === 'GAUGE_POINTER';
    if (slot === 'weather_text') {
      return el.type === 'TEXT_IMG' && (el.dataType === 'WEATHER_CURRENT' || el.dataType === 'WEATHER_STATUS');
    }
    if (slot === 'weather_icon') {
      return el.type === 'IMG_LEVEL' && isWeatherImgLevelDataType(el.dataType);
    }
    return false;
  }, []);

  const htmlCreatorSlotOptions = useMemo(
    () => HTML_CREATOR_SLOT_OPTIONS[htmlInjectTarget] ?? HTML_CREATOR_SLOT_OPTIONS.all,
    [htmlInjectTarget],
  );

  const handleInjectHtmlToLibrary = useCallback(async () => {
    if (!htmlInput.trim()) {
      toast.error('HTML Creator input is empty');
      return;
    }

    dispatch(actions.setLoading(true));
    dispatch(actions.setLoadingMessage('Injecting HTML into selected library...'));
    try {
      if (htmlInjectTarget === 'background') {
        const dataUrl = await renderHtmlBackgroundToDataUrl(htmlInput, activeResolution, activeResolution);
        const { mimeType, bytes } = decodeDataUrlToBytes(dataUrl, 'HTML Creator background');
        dispatch(actions.setBackgroundImage(dataUrl));
        dispatch(actions.setBackgroundFile(new File([bytes], 'background.png', { type: mimeType })));
        toast.success('Background library updated from HTML Creator');
        return;
      }

      const domEls = await parseDom(htmlInput);
      const mappedElements = mapDomToElements(domEls);
      const selectedElements = mappedElements.filter(
        (el) => matchesHtmlTarget(el, htmlInjectTarget) && matchesHtmlSlot(el, htmlInjectSlot),
      );
      if (selectedElements.length === 0) {
        toast.error('No matching elements found for selected target library');
        return;
      }

      const baseConfig: WatchFaceConfig = state.watchFaceConfig
        ? { ...state.watchFaceConfig, elements: [...state.watchFaceConfig.elements] }
        : {
            name: watchFaceName || 'HTML Creator Watch Face',
            watchModel: watchModel || 'Balance 2',
            resolution: { width: 480, height: 480 },
            background: { src: 'background.png', format: 'TGA-P' },
            elements: [],
            aodBackgroundMode: 'USE_MAIN_BACKGROUND',
            aodBackgroundSrc: null,
            aodSolidColor: '#000000',
          };

      const retained = baseConfig.elements.filter(
        (el) => !(matchesHtmlTarget(el, htmlInjectTarget) && matchesHtmlSlot(el, htmlInjectSlot)),
      );
      let nextZ = retained.reduce((maxZ, el) => Math.max(maxZ, el.zIndex), 0) + 1;
      const injected = selectedElements.map((el) => ({ ...el, zIndex: nextZ++ }));
      const nextElements = [...retained, ...injected];

      const resolvedElements = nextElements.map((el) => ({
        widget: el.type,
        dataType: el.dataType,
        x: el.bounds.x,
        y: el.bounds.y,
        w: el.bounds.width,
        h: el.bounds.height,
        color: el.color,
        iconKey: el.iconKey,
        assets: el.iconKey
          ? { src: `icon_${el.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.png` }
          : {},
      })) as unknown as Parameters<typeof generatePipelineAssets>[0];

      const elementImages: ElementImage[] = generatePipelineAssets(resolvedElements);
      const nextConfig: WatchFaceConfig = {
        ...baseConfig,
        elements: nextElements,
      };

      dispatch(actions.setWatchFaceConfig(withNormalizedPointerEffects(nextConfig)));
      dispatch(actions.setElementImages(elementImages));
      dispatch(actions.setStep('preview'));
      const slotLabel = htmlInjectSlot === 'auto' ? 'auto-slot' : htmlInjectSlot;
      toast.success(`Injected ${injected.length} element(s) into ${htmlInjectTarget}/${slotLabel}`);
    } catch (err) {
      toast.error('HTML Creator inject failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [
    htmlInput,
    htmlInjectTarget,
    htmlInjectSlot,
    activeResolution,
    dispatch,
    state.watchFaceConfig,
    watchFaceName,
    watchModel,
    matchesHtmlTarget,
    matchesHtmlSlot,
  ]);

  const commitProjectLoad = useCallback(async (
    pending: PendingProjectLoad,
    choice: 'keep' | 'rearrange',
  ) => {
    let chosenConfig = choice === 'rearrange'
      ? rearrangeProjectPositions(pending.config, pending.targetResolution, pending.targetWatchModel)
      : structuredClone(pending.config);

    // Sanitize and strictly sequentialize zIndex order on load to guarantee parity
    if (chosenConfig.elements) {
      chosenConfig.elements = chosenConfig.elements
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el, i) => ({ ...el, zIndex: i }));
    }
    if (chosenConfig.aodElements) {
      chosenConfig.aodElements = chosenConfig.aodElements
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el, i) => ({ ...el, zIndex: i }));
    }
    let chosenBackgroundImage = pending.backgroundImage;

    if (choice === 'rearrange' && pending.restoreBackground && pending.backgroundImage) {
      chosenBackgroundImage = await resizeDataUrl(
        pending.backgroundImage,
        pending.targetResolution.width,
        pending.targetResolution.height,
      );
      const updateBackgroundElement = (element: WatchFaceElement): WatchFaceElement => element.name === 'Background'
        ? {
            ...element,
            bounds: { x: 0, y: 0, width: pending.targetResolution.width, height: pending.targetResolution.height },
            src: chosenBackgroundImage ?? element.src,
          }
        : element;
      chosenConfig = {
        ...chosenConfig,
        elements: chosenConfig.elements.map(updateBackgroundElement),
        aodElements: chosenConfig.aodElements?.map(updateBackgroundElement) ?? chosenConfig.aodElements,
      };
    }
    setPendingProjectLoad(null);
    dispatch(actions.setWatchFaceConfig(chosenConfig));
    setAodElements(chosenConfig.aodElements && chosenConfig.aodElements.length > 0 ? chosenConfig.aodElements : null);

    if (pending.restoreBackground && chosenBackgroundImage) {
      dispatch(actions.setBackgroundImage(chosenBackgroundImage));
      try {
        const response = await fetch(chosenBackgroundImage);
        const blob = await response.blob();
        dispatch(actions.setBackgroundFile(new File([blob], 'background.png', { type: blob.type || 'image/png' })));
      } catch { /* non-critical: the project can still be edited */ }
    }

    dispatch(actions.setStep('preview'));
    toast.success(`${pending.restoreBackground ? 'Project' : 'Widgets'} loaded: ${pending.fileName}`);
  }, [dispatch]);

  const requestProjectLoad = useCallback(async (pending: Omit<PendingProjectLoad, 'targetResolution' | 'targetWatchModel'>) => {
    const targetResolution = activeSpecGroup
      ? { width: _resolvedResolution.w, height: _resolvedResolution.h }
      : null;
    if (
      targetResolution
      && isValidCanvasResolution(pending.config.resolution)
      && !canvasResolutionsMatch(pending.config.resolution, targetResolution)
    ) {
      setPendingProjectLoad({ ...pending, targetResolution, targetWatchModel: watchModel });
      return;
    }

    await commitProjectLoad({
      ...pending,
      targetResolution: isValidCanvasResolution(pending.config.resolution)
        ? pending.config.resolution
        : { width: activeCanvasW, height: activeCanvasH },
      targetWatchModel: pending.config.watchModel,
    }, 'keep');
  }, [activeCanvasH, activeCanvasW, activeSpecGroup, _resolvedResolution.h, _resolvedResolution.w, commitProjectLoad, watchModel]);

  // Load a .fvwf project file from disk and restore watchface onto canvas
  const handleLoadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fvwf,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseProjectFileArtifact(text);
        const config = parsed.watchFaceConfig;
        const bgImage = parsed.backgroundImage;
        const requestedName = watchFaceName?.trim();
        const effectiveName = requestedName || config.name || file.name;
        const normalizedConfig = withNormalizedPointerEffects({
          ...config,
          name: effectiveName,
        });
        await requestProjectLoad({
          config: normalizedConfig,
          backgroundImage: bgImage,
          fileName: effectiveName,
          restoreBackground: true,
        });
        setWorkshopProjectId(null);
        setWorkshopBuildId(null);
      } catch (e) {
        toast.error('Failed to load project file. Make sure it is a valid .fvwf file.');
      }
    };
    input.click();
  }, [requestProjectLoad, watchFaceName]);

  useEffect(() => {
    if (!storeArchitectureFlags.workshop || workshopDeepLinkLoadedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('workshopProject');
    const buildId = params.get('build');
    if (!projectId || !buildId) return;
    workshopDeepLinkLoadedRef.current = true;

    void (async () => {
      try {
        const text = await fetchWorkshopProjectFile(projectId, buildId);
        const artifact = parseProjectFileArtifact(text);
        if (!window.confirm(`Open ${artifact.watchFaceConfig.name || buildId}? This replaces the current Studio canvas.`)) return;
        await requestProjectLoad({
          config: withNormalizedPointerEffects(artifact.watchFaceConfig),
          backgroundImage: artifact.backgroundImage,
          fileName: artifact.watchFaceConfig.name || buildId,
          restoreBackground: true,
        });
        setWorkshopProjectId(projectId);
        setWorkshopBuildId(buildId);
        toast.success(`Workshop ${buildId} opened.`);
      } catch (error) {
        workshopDeepLinkLoadedRef.current = false;
        toast.error(error instanceof Error ? error.message : 'Failed to open Workshop build');
      }
    })();
  }, [requestProjectLoad]);

  // Load widgets-only from a .fvwf file — keeps current background image intact
  const handleLoadWidgetsOnly = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fvwf,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const config = parseProjectFileArtifact(text).watchFaceConfig;
        // Patch Background element src to match current state.backgroundImage so canvas stays consistent
        const currentBg = state.backgroundImage;
        const patchedElements = config.elements.map((el: WatchFaceElement) =>
          el.name === 'Background' && currentBg ? { ...el, src: currentBg } : el
        );
        const requestedName = watchFaceName?.trim();
        const effectiveName = requestedName || config.name || file.name;
        const normalizedConfig = withNormalizedPointerEffects({
          ...config,
          name: effectiveName,
          elements: patchedElements,
        });
        await requestProjectLoad({
          config: normalizedConfig,
          backgroundImage: null,
          fileName: file.name,
          restoreBackground: false,
        });
      } catch {
        toast.error('Failed to load project file. Make sure it is a valid .fvwf file.');
      }
    };
    input.click();
  }, [requestProjectLoad, state.backgroundImage, watchFaceName]);

  // Handle regenerate ZPK (local download, no GitHub upload)
  // Handle generate ZPK
  const handleGenerate = useCallback(async () => {
    console.log('[App] handleGenerate called');
    setLatestUploadResult(null);
    setWorkshopSaveError(null);

    // Deselect any selected element so the selection rectangle doesn't appear in the preview
    setSelectedElementId(null);
    setExtraSelectedIds([]);
    // Temporarily hide grid so it doesn't appear in the preview screenshot
    const gridWasOn = showGrid;
    if (gridWasOn) setShowGrid(false);
    // Temporarily hide flicker overlay so it doesn't bake into the preview
    const flickerWasOn = flickerOverlayEnabled;
    if (flickerWasOn) setFlickerOverlayEnabled(false);
    // Wait two animation frames for InteractiveCanvas to redraw without selection + grid + overlays
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    // Capture canvas screenshot FIRST before step change unmounts the canvas
    let previewDataUrl: string | null = null;
    let aodPreviewDataUrl: string | null = null;
    try {
      const mainCanvas = mainPreviewCanvasRef.current;
      if (!mainCanvas) throw new Error('Main preview canvas unavailable');
      const captures = await captureStorePreviews({
        mainCanvas,
        aodCanvas: aodPreviewCanvasRef.current,
        hasExplicitAod: !!aodElements,
      });
      previewDataUrl = captures.main;
      aodPreviewDataUrl = captures.aod;
      setPreviewImageUrl(previewDataUrl);
      console.log('[App] Isolated Main/AOD previews captured');
      capturePointerParitySnapshotFromCanvas('composer-preview');
    } catch (e) {
      console.warn('[App] Canvas capture failed (tainted?), falling back to backgroundImage', e);
      previewDataUrl = state.backgroundImage;
      aodPreviewDataUrl = previewDataUrl;
      if (previewDataUrl) setPreviewImageUrl(previewDataUrl);
    }

    // Restore grid and flicker overlay after capture
    if (gridWasOn) setShowGrid(true);
    if (flickerWasOn) setFlickerOverlayEnabled(true);

    if (!state.watchFaceConfig) {
      console.log('[App] ERROR: Missing watchFaceConfig');
      toast.error('Missing configuration');
      return;
    }
    
    if (!state.backgroundFile) {
      console.log('[App] ERROR: Missing backgroundFile');
      toast.error('Missing background file');
      return;
    }

    console.log('[App] All checks passed, starting generation...');
    console.log('[App] Background file:', state.backgroundFile.name, 'size:', state.backgroundFile.size);

    let workshopProjectBlob: Blob | null = null;
    // Save project file NOW — before any mutations to element src/assetFilename fields.
    // After export pipeline runs, el.src is mutated to filenames (not data: URLs) and the
    // saved JSON would be unloadable. Saving here captures the pristine config.
    try {
      const projectFileConfig = buildProjectFileConfig(state.watchFaceConfig, {
        aodElements,
        backgroundTransform: mainBackgroundTransform,
        aodBackgroundMode,
        aodSolidColor,
        aodBackgroundTransform,
      });
      const normalizedProjectConfig = withNormalizedPointerEffects(projectFileConfig);
      workshopProjectBlob = createProjectFileBlob(createProjectFileArtifact(normalizedProjectConfig, state.backgroundImage));
      downloadProjectFile(normalizedProjectConfig, state.backgroundImage);
    } catch (e) {
      console.warn('[App] Project file download failed:', e);
    }

    dispatch(actions.setLoading(true));
    dispatch(actions.setLoadingMessage('Generating ZPK file...'));
    dispatch(actions.setStep('generating'));

    try {
      pointerParityMissingAssetsRef.current = [];
      const mainEditorElements = state.watchFaceConfig.elements;
      const aodEditorElements = aodElements ?? state.watchFaceConfig.aodElements ?? null;
      const effectiveAodBackgroundMode: AodBackgroundMode = aodEditorElements ? aodBackgroundMode : 'USE_MAIN_BACKGROUND';
      let preparedAodBackgroundFile: File | null = null;

      if (aodEditorElements && effectiveAodBackgroundMode === 'UPLOAD_AOD_BACKGROUND') {
        if (!aodBackgroundFile) {
          throw new Error('AOD background image is required when AOD Background mode is set to Upload AOD Background.');
        }
        preparedAodBackgroundFile = aodBackgroundFile;
      }

      if (aodEditorElements && effectiveAodBackgroundMode === 'SOLID_COLOR') {
        const solidDataUrl = buildSolidBackgroundDataUrl(state.watchFaceConfig.resolution.width, state.watchFaceConfig.resolution.height, aodSolidColor);
        const { mimeType, bytes } = decodeDataUrlToBytes(solidDataUrl, 'AOD solid background');
        preparedAodBackgroundFile = new File([bytes], 'aod_background.png', { type: mimeType });
      }

      const allEditorElements = aodEditorElements ? [...mainEditorElements, ...aodEditorElements] : mainEditorElements;
      const hasEngrave = allEditorElements.some((el) => el.type === 'FILL_RECT' && !!el.engraveFrame);
      const hasPointer = allEditorElements.some((el) => el.type === 'TIME_POINTER');
      const issueFocus = hasEngrave && hasPointer ? 'both' : hasEngrave ? 'engrave' : 'pointer';
      const runRecord = parityCaptureSession.startRun({
        fixtureId: state.watchFaceConfig.name,
        issueFocus,
        buildHash: investigationBuildHash,
      });
      investigationRunIdRef.current = runRecord?.run.runId ?? null;

      if (investigationRunIdRef.current) {
        parityCaptureSession.captureStage({
          runId: investigationRunIdRef.current,
          fixtureId: state.watchFaceConfig.name,
          buildHash: investigationBuildHash,
          stage: 'fixture_setup',
          eventType: 'fixture.snapshot',
          capturePoint: 'fixture_snapshot',
          data: {
            elementCount: allEditorElements.length,
            backgroundFileName: state.backgroundFile.name,
            previewCaptured: !!previewDataUrl,
          },
        });
      }

      // Build ZPK using File objects
      console.log('[App] Calling buildZPK...');

      // Resolve imageSwitcherDefinitionId slots → extra ElementImages before building elementFiles
      const switcherSlotImages: ElementImage[] = [];
      const allExportElements = [
        ...mainEditorElements,
        ...(aodEditorElements ?? []),
      ];
      for (const el of allExportElements) {
        if (el.type === 'IMG_LEVEL' && el.imageSwitcherDefinitionId) {
          const def = await getSwitcherDefinition(el.imageSwitcherDefinitionId);
          if (def) {
            def.ranges.forEach((slot, i) => {
              if (slot.dataUrl) {
                const slotName = `switcher_${el.id}_slot_${String(i).padStart(2, '0')}.png`;
                if (!state.elementImages.some(img => img.name === slotName)) {
                  switcherSlotImages.push({
                    name: slotName,
                    dataUrl: slot.dataUrl!,
                    bounds: { x: 0, y: 0, width: el.bounds.width, height: el.bounds.height },
                    type: 'IMG_LEVEL',
                  });
                }
              }
            });
          }
        }
      }
      const allElementImages = [...state.elementImages, ...switcherSlotImages];

      // 1. Generate transparent ticks PNGs for ARC_PROGRESS widgets
      const tickFiles: Array<{ src: string; file: File }> = [];
      for (const el of allExportElements) {
        if (el.type === 'ARC_PROGRESS' && el.tickCount && el.tickCount > 0) {
          const ticksDataUrl = generateArcTicksPng(el, activeCanvasW, activeCanvasH);
          if (ticksDataUrl) {
            const ticksName = `ticks_${el.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
            const { mimeType, bytes } = decodeDataUrlToBytes(ticksDataUrl, `Ticks image ${ticksName}`);
            const blob = new Blob([bytes], { type: mimeType });
            tickFiles.push({
              src: ticksName,
              file: new File([blob], ticksName, { type: mimeType }),
            });
          }
        }
      }

      // Convert elementImages from dataUrl to File objects
      const elementFiles = [
        ...allElementImages.map((img) => {
          console.log('[App] Converting element image to file:', img.name);
          const { mimeType, bytes } = decodeDataUrlToBytes(img.dataUrl, `Element image ${img.name}`);
          const blob = new Blob([bytes], { type: mimeType });
          return {
            src: img.name,
            file: new File([blob], img.name, { type: mimeType }),
          };
        }),
        ...tickFiles
      ];
      
      console.log('[App] Element files prepared:', { count: elementFiles.length, files: elementFiles.map(f => f.src) });
      
      if (elementFiles.length === 0) {
        console.warn('[App] WARNING: No element files were prepared!');
      }

      if (investigationRunIdRef.current) {
        parityCaptureSession.captureStage({
          runId: investigationRunIdRef.current,
          fixtureId: state.watchFaceConfig.name,
          buildHash: investigationBuildHash,
          stage: 'preview',
          eventType: 'preview.snapshot',
          capturePoint: 'preview_metrics',
          data: {
            pointerParitySnapshotCount: Object.keys(pointerParitySnapshotsRef.current).length,
            previewDataUrlCaptured: !!previewDataUrl,
          },
        });
      }

      // Regenerate digit images with current element colors + font styles.
      // This replaces any stale images from initial generation so UI choices reach the device.
      // CSS scale: maps design-space pixels to what user actually sees, so bitmap matches preview.
      const canvasEl = canvasRef.current;
      // CSS scale: ratio of displayed size to design-space size. Cap at 1 — never upscale.
      const rawScale = canvasEl ? canvasEl.clientWidth / canvasEl.width : 1;
      const cssScaleFactor = Math.min(1, rawScale);
      console.log('[DigitGen] canvas clientWidth=', canvasEl?.clientWidth, 'canvas.width=', canvasEl?.width, 'scale=', rawScale, 'capped=', cssScaleFactor, '(cssScale no longer applied — fill ratio drives glyph scale)');
      const mainDigitAssets = regenerateDigitFilesFromElements(mainEditorElements, 'main');
      const aodDigitAssets = aodEditorElements
        ? regenerateDigitFilesFromElements(aodEditorElements, 'aod')
        : { files: [], elementUpdates: new Map<string, Partial<WatchFaceElement>>() };
      const freshDigits = [...mainDigitAssets.files, ...aodDigitAssets.files];
      for (const { filename, dataUrl } of freshDigits) {
        const { bytes } = decodeDataUrlToBytes(dataUrl, `Digit image ${filename}`);
        const existing = elementFiles.findIndex(f => f.src === filename);
        const newFile = { src: filename, file: new File([bytes], filename, { type: 'image/png' }) };
        if (existing >= 0) elementFiles[existing] = newFile;
        else elementFiles.push(newFile);
      }
      console.log('[App] Digit images regenerated with current colors/fonts:', freshDigits.length, 'files updated');

      // Resolve all IMG_LEVEL assets (weather and non-weather use the same loop).
      // Weather elements carry data: URLs in el.images (set at creation / style change).
      const aodEditorElementSet = new Set(aodEditorElements ?? []);
      const scopedElementKey = (scope: 'main' | 'aod', id: string) => `${scope}:${id}`;
      const resolvedImgLevelFrames = new Map<string, string[]>();
      for (const el of allEditorElements) {
        if (el.type !== 'IMG_LEVEL') continue;

        // If a custom switcher definition is linked, use its slot dataUrls as the frames.
        // This overrides el.images[] so the ZPK gets the custom images.
        const switcherOverrideUrls = el.imageSwitcherDefinitionId
          ? switcherSlotImages
              .filter(img => img.name.startsWith(`switcher_${el.id}_`))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(img => img.dataUrl)
          : [];

        const configuredFrames = switcherOverrideUrls.length > 0
          ? switcherOverrideUrls
          : Array.isArray(el.images)
            ? el.images.map((name) => (typeof name === 'string' ? name.trim() : '')).filter((name) => name.length > 0)
            : [];
        const explicitCount = el.imageSwitcherFrameCount
          ?? (configuredFrames.length > 0 ? configuredFrames.length : undefined);
        const policy = resolveImageSwitcherFrameCount(el.dataType, { explicitCount });
        const elementScope: 'main' | 'aod' = aodEditorElementSet.has(el) ? 'aod' : 'main';

        if (policy.expectedCount === null) {
          resolvedImgLevelFrames.set(scopedElementKey(elementScope, el.id), configuredFrames);
          continue;
        }

        const targetCount = policy.expectedCount;
        const strictMode = el.imageSwitcherStrict === true;

        if (strictMode && configuredFrames.length !== targetCount) {
          throw new Error(
            `${el.name}: expected ${targetCount} IMG_LEVEL frames for ${getDataTypeLabel(el.dataType ?? 'value')} but got ${configuredFrames.length}.`
          );
        }

        const sanitizedBase = (el.name || el.id).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'img_level';
        const normalizedFrames: string[] = [];
        for (let i = 0; i < targetCount; i += 1) {
          const configuredFrame = configuredFrames[i];
          const generatedName = `imglvl_${sanitizedBase}_${i}.png`;

          if (configuredFrame && configuredFrame.startsWith('data:')) {
            // Resize frame to canvas bounds so manual resizes transfer to device.
            const frameW = Math.max(1, el.bounds.width || 1);
            const frameH = Math.max(1, el.bounds.height || 1);
            const resizedFrame = await resizeDataUrl(configuredFrame, frameW, frameH);
            const { bytes } = decodeDataUrlToBytes(resizedFrame, `IMG_LEVEL inline frame ${el.name}#${i}`);
            const existingInline = elementFiles.find((f) => f.src === generatedName);
            if (!existingInline) {
              elementFiles.push({ src: generatedName, file: new File([bytes], generatedName, { type: 'image/png' }) });
            } else {
              existingInline.file = new File([bytes], generatedName, { type: 'image/png' });
            }
            normalizedFrames.push(generatedName);
            continue;
          }

          if (configuredFrame) {
            normalizedFrames.push(configuredFrame);
            continue;
          }

          normalizedFrames.push(generatedName);
        }

        for (let i = 0; i < normalizedFrames.length; i += 1) {
          const frameName = normalizedFrames[i];
          const existingFile = elementFiles.find((f) => f.src === frameName);
          if (existingFile) continue;

          if (strictMode) {
            throw new Error(`${el.name}: missing IMG_LEVEL frame asset '${frameName}' in strict mode.`);
          }

          const placeholderDataUrl = createImageSwitcherPlaceholderDataUrl(
            el.name || el.id,
            i,
            el.bounds.width || 60,
            el.bounds.height || 60,
          );
          const { bytes } = decodeDataUrlToBytes(placeholderDataUrl, `IMG_LEVEL placeholder ${frameName}`);
          elementFiles.push({ src: frameName, file: new File([bytes], frameName, { type: 'image/png' }) });
        }

        resolvedImgLevelFrames.set(scopedElementKey(elementScope, el.id), normalizedFrames);
      }

      // Pre-warm Tabler icon cache so getIconByKey works synchronously for tabler:* keys
      if (allEditorElements.some(el => el.iconKey?.startsWith('tabler:'))) {
        dispatch(actions.setLoadingMessage('Warming icon cache...'));
        const { buildTablerLibrary } = await import('@/lib/tablerIconRenderer');
        await buildTablerLibrary();
      }

      // Inject icon assets for image-like widgets and apply visual effects (hue/saturation/colorize)
      // so what you see = what ships in ZPK.
      for (const el of allEditorElements) {
        const supportsIconEffects = el.type === 'IMG' || el.type === 'IMG_STATUS';
        if (!supportsIconEffects) continue;
        const hasEffects = (el.iconHue ?? 0) !== 0 || (el.iconSaturation ?? 100) !== 100 || !!el.iconColorize || !!el.iconPhotoEdit;

        if (el.iconKey) {
          const iconEntry = getIconByKey(el.iconKey);
          if (iconEntry) {
            const safeKey = el.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `icon_${safeKey}.png`;
            // Always resize to element bounds — Zepp OS IMG renders at native PNG size (w/h ignored).
            const finalDataUrl = await applyIconEffectsForZPK(iconEntry.dataUrl, el, el.bounds.width || 48, el.bounds.height || 48);
            const { bytes } = decodeDataUrlToBytes(finalDataUrl, `Icon image ${filename}`);
            elementFiles.push({ src: filename, file: new File([bytes], filename, { type: 'image/png' }) });
            if (el.type === 'IMG_STATUS') {
              el.src = filename;
              el.assetFilename = filename;
              el.iconKey = undefined;
            }
          }
          continue;
        }

        if (hasEffects && el.src) {
          const sourceDataUrl = await dataUrlFromElementFile(el.src, elementFiles);
          if (!sourceDataUrl) continue;
          const filename = `iconfx_${el.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${el.id}.png`;
          const finalDataUrl = await applyIconEffectsForZPK(sourceDataUrl, el, el.bounds.width || 48, el.bounds.height || 48);
          const { bytes } = decodeDataUrlToBytes(finalDataUrl, `Icon image ${filename}`);
          const newFile = { src: filename, file: new File([bytes], filename, { type: 'image/png' }) };
          const existingIndex = elementFiles.findIndex((f) => f.src === filename);
          if (existingIndex >= 0) elementFiles[existingIndex] = newFile;
          else elementFiles.push(newFile);
          el.src = filename;
          el.assetFilename = filename;
        }
      }

      // Inject GAUGE_POINTER assets with deterministic fallback + pointer effects.
      for (const el of allEditorElements) {
        if (el.type !== 'GAUGE_POINTER') continue;
        const filename = gaugePointerAssetName(el);
        let sourceDataUrl: string | null = null;
        if (el.src?.startsWith('data:')) {
          sourceDataUrl = el.src;
        } else {
          const existing = state.elementImages.find((img) => img.name === filename);
          sourceDataUrl = existing?.dataUrl ?? null;
        }
        if (!sourceDataUrl && filename === DEFAULT_GAUGE_POINTER_FILENAME) {
          sourceDataUrl = createDefaultGaugePointerDataUrl(el.bounds.width || 40, el.bounds.height || 120);
        }
        if (!sourceDataUrl) continue;
        const effectedDataUrl = await applyPointerEffectsForZPK(sourceDataUrl, el, 'gauge');
        // Resize to bounds so device renders at same size as canvas preview.
        // Without resize, device uses natural image size while canvas scales to bounds.
        const targetW = Math.max(1, el.bounds.width || 40);
        const targetH = Math.max(1, el.bounds.height || 120);
        const resizedDataUrl = await resizeDataUrl(effectedDataUrl, targetW, targetH);
        const { bytes } = decodeDataUrlToBytes(resizedDataUrl, `Gauge pointer image ${filename}`);
        const existingIdx = elementFiles.findIndex((f) => f.src === filename);
        const nextFile = { src: filename, file: new File([bytes], filename, { type: 'image/png' }) };
        if (existingIdx >= 0) elementFiles[existingIdx] = nextFile;
        else elementFiles.push(nextFile);
      }

      // Inject inline IMG assets — any IMG element with a data URL src (e.g. gauge background PNG).
      // These are not handled by the icon-effects loop above (no iconKey, no effects).
      //
      // Recovery step: if el.src has been mutated to a filename (e.g. from a previous export
      // or an old saved .fvwf), attempt to regenerate the background data URL from the original
      // SVG stored in the custom gauge pointer library. This makes export work on old files too.
      for (const el of allEditorElements) {
        if (
          el.type === 'IMG' && !el.iconKey && el.gaugePairId &&
          el.src && !el.src.startsWith('data:')
        ) {
          const siblingPointer = allEditorElements.find(
            s => s.type === 'GAUGE_POINTER' && s.gaugePairId === el.gaugePairId
          );
          if (siblingPointer?.handStyle?.startsWith('custom_gauge:')) {
            const gaugeKey = siblingPointer.handStyle.replace('custom_gauge:', '');
            const record = customGaugePointers.find(r => r.key === gaugeKey);
            if (record?.sourceHtml) {
              try {
                const parsed = detectGauge(record.sourceHtml);
                if (parsed) {
                  const rendered = await renderGaugeAssets(parsed, 400);
                  if (rendered.backgroundPng) {
                    el.src = rendered.backgroundPng; // restore data URL for pipeline
                  }
                }
              } catch (e) {
                console.warn('[Export] Failed to recover gauge BG data URL for', el.name, e);
              }
            }
          }
        }
      }

      for (const el of allEditorElements) {
        if (el.type !== 'IMG' || el.iconKey || !el.src?.startsWith('data:')) continue;
        const filename = el.assetFilename || `img_inline_${el.id}.png`;
        // Resize to canvas bounds so manual resizes are respected on device (same as GAUGE_POINTER needle).
        const targetW = Math.max(1, el.bounds.width || 1);
        const targetH = Math.max(1, el.bounds.height || 1);
        const resizedSrc = await resizeDataUrl(el.src, targetW, targetH);
        const { bytes } = decodeDataUrlToBytes(resizedSrc, `Inline IMG ${filename}`);
        const existingIdx = elementFiles.findIndex((f) => f.src === filename);
        const nextFile = { src: filename, file: new File([bytes], filename, { type: 'image/png' }) };
        if (existingIdx >= 0) elementFiles[existingIdx] = nextFile;
        else elementFiles.push(nextFile);
        // Replace data URL with filename so JS code generator emits a proper path
        el.src = filename;
        el.assetFilename = filename;
      }

      // Inject curved text PNGs for TEXT elements with curvedText
      for (const el of allEditorElements) {
        if (el.type === 'TEXT' && el.curvedText) {
          const filename = `curved_text_${el.id}.png`;
          // Parse Zepp color format 0xRRGGBBAA → #RRGGBB
          let rawColor = '#FFFFFF';
          if (el.color) {
            if (el.color.startsWith('0x') || el.color.startsWith('0X')) {
              rawColor = '#' + el.color.slice(2, 8);
            } else {
              rawColor = el.color.substring(0, 7);
            }
          }
          const dataUrl = generateCurvedTextImage(
            el.text || el.name,
            el.curvedText.radius,
            el.curvedText.startAngle,
            el.curvedText.endAngle,
            el.fontSize ?? 16,
            rawColor
          );
          const { bytes } = decodeDataUrlToBytes(dataUrl, `Curved text image ${filename}`);
          elementFiles.push({ src: filename, file: new File([bytes], filename, { type: 'image/png' }) });
        }
      }

      // Build a stable export config snapshot so all bakes/generation use the same element state.
      // This prevents preview/export drift (especially for custom-hand pivots and cover fallback).
      const prepareExportElements = (inputElements: WatchFaceElement[]) => stampGaugePairIds(inputElements).map(el => ({
        ...el,
        bounds: { ...el.bounds },
        ...(el.type === 'GAUGE_POINTER'
          ? {
              src: gaugePointerAssetName(el),
              assetFilename: gaugePointerAssetName(el),
              ...normalizeGaugePivot(el),
            }
          : {}),
        ...(el.center ? { center: { ...el.center } } : {}),
        ...(el.pointerCenter ? { pointerCenter: { ...el.pointerCenter } } : {}),
        ...(el.hourPos ? { hourPos: { ...el.hourPos } } : {}),
        ...(el.minutePos ? { minutePos: { ...el.minutePos } } : {}),
        ...(el.secondPos ? { secondPos: { ...el.secondPos } } : {}),
      }));

      const applyElementUpdates = (
        inputElements: WatchFaceElement[],
        updates: Map<string, Partial<WatchFaceElement>>,
      ): WatchFaceElement[] => inputElements.map((el) => {
        const patch = updates.get(el.id);
        return patch ? { ...el, ...patch } : el;
      });

      const exportElements = applyElementUpdates(
        prepareExportElements(mainEditorElements),
        mainDigitAssets.elementUpdates,
      );
      const exportAodElements = aodEditorElements
        ? applyElementUpdates(prepareExportElements(aodEditorElements), aodDigitAssets.elementUpdates)
        : null;
      const exportCombinedElements = exportAodElements ? [...exportElements, ...exportAodElements] : exportElements;
      for (const el of exportElements) {
        if (el.type === 'IMG_LEVEL') {
          const resolvedFrames = resolvedImgLevelFrames.get(scopedElementKey('main', el.id));
          if (resolvedFrames) {
            el.images = [...resolvedFrames];
          }
        }
        if (el.type === 'TEXT_IMG' && el.dataType === 'WEATHER_CURRENT' && (!el.fontArray || el.fontArray.length === 0)) {
          el.fontArray = weatherTempDigitFilenames();
        }
      }
      if (exportAodElements) {
        for (const el of exportAodElements) {
          if (el.type === 'IMG_LEVEL') {
            const resolvedFrames = resolvedImgLevelFrames.get(scopedElementKey('aod', el.id));
            if (resolvedFrames) {
              el.images = [...resolvedFrames];
            }
          }
          if (el.type === 'TEXT_IMG' && el.dataType === 'WEATHER_CURRENT' && (!el.fontArray || el.fontArray.length === 0)) {
            el.fontArray = weatherTempDigitFilenames();
          }
        }
      }
        const configForBuild: WatchFaceConfig = {
          ...state.watchFaceConfig,
          elements: exportElements,
          backgroundTransform: mainBackgroundTransform,
          aodElements: exportAodElements,
          aodBackgroundMode: effectiveAodBackgroundMode,
          aodBackgroundSrc: effectiveAodBackgroundMode === 'UPLOAD_AOD_BACKGROUND' || effectiveAodBackgroundMode === 'SOLID_COLOR'
            ? 'aod_background.png'
            : null,
          aodSolidColor: effectiveAodBackgroundMode === 'SOLID_COLOR' ? aodSolidColor : null,
          aodBackgroundTransform,
        };

      // Inject engrave/emboss frame PNGs for FILL_RECT elements with engraveFrame
      for (const el of exportCombinedElements) {
        if (el.type === 'FILL_RECT' && el.engraveFrame) {
          const safeName = el.name.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `frame_${safeName}.png`;
          const dataUrl = renderEngraveFrameToPng(el);
          const { bytes } = decodeDataUrlToBytes(dataUrl, `Engrave frame image ${filename}`);
          elementFiles.push({ src: filename, file: new File([bytes], filename, { type: 'image/png' }) });
        }
      }

      // ── Drop-shadow baking for IMG / FILL_RECT / STROKE_RECT / CIRCLE ──
      for (const el of exportCombinedElements) {
        if (!el.dropShadow) continue;
        const safeName = el.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        let bakeResult: { dataUrl: string; pad: number } | null = null;

        if (el.type === 'IMG' && el.iconKey) {
          // Load the icon image (use effects-applied version if present in elementFiles)
          const safeKey = el.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_');
          const existingFile = elementFiles.find(f => f.src === `icon_${safeKey}.png`);
          if (existingFile) {
            const imgEl = await imageFromElementFile(existingFile.src, elementFiles);
            if (imgEl) bakeResult = renderImgWithShadowToPng(el, imgEl);
          }
        } else if (el.type === 'IMG' && !el.iconKey && el.src) {
          // Plain IMG (e.g. gauge BG, inline image) — load from elementFiles or data URL directly
          const imgEl = await imageFromElementFile(el.src, elementFiles);
          if (imgEl) bakeResult = renderImgWithShadowToPng(el, imgEl);
        } else if (el.type === 'IMG_STATUS' && el.src) {
          const imgEl = await imageFromElementFile(el.src, elementFiles);
          if (imgEl) bakeResult = renderImgWithShadowToPng(el, imgEl);
        } else if (el.type === 'GAUGE_POINTER') {
          const filename = gaugePointerAssetName(el);
          const imgEl = await imageFromElementFile(filename, elementFiles);
          if (imgEl) bakeResult = renderImgWithShadowToPng(el, imgEl);
        } else if ((el.type === 'IMG_LEVEL' || el.type === 'IMG_PROGRESS') && Array.isArray(el.images) && el.images.length > 0) {
          const bakedFrames: string[] = [];
          for (let i = 0; i < el.images.length; i += 1) {
            const src = el.images[i];
            if (typeof src !== 'string' || src.trim().length === 0) continue;

            const imgEl = await imageFromElementFile(src, elementFiles);
            if (!imgEl) {
              bakedFrames.push(src);
              continue;
            }

            const frameBake = renderImgWithShadowToPng(el, imgEl);
            const bakedName = `shadow_${safeName}_${i}.png`;
            const { bytes } = decodeDataUrlToBytes(frameBake.dataUrl, `Drop shadow image ${bakedName}`);
            const newFile = { src: bakedName, file: new File([bytes], bakedName, { type: 'image/png' }) };
            const existingIndex = elementFiles.findIndex((f) => f.src === bakedName);
            if (existingIndex >= 0) elementFiles[existingIndex] = newFile;
            else elementFiles.push(newFile);
            bakedFrames.push(bakedName);
          }
          if (bakedFrames.length > 0) {
            el.images = bakedFrames;
          }
        } else if (el.type === 'FILL_RECT' && !el.engraveFrame) {
          bakeResult = renderFillRectWithShadowToPng(el);
        } else if (el.type === 'STROKE_RECT') {
          bakeResult = renderStrokeRectWithShadowToPng(el);
        } else if (el.type === 'CIRCLE') {
          bakeResult = renderCircleWithShadowToPng(el);
        }

        if (bakeResult) {
          const filename = `shadow_${safeName}.png`;
          const { bytes } = decodeDataUrlToBytes(bakeResult.dataUrl, `Drop shadow image ${filename}`);
          elementFiles.push({ src: filename, file: new File([bytes], filename, { type: 'image/png' }) });
          if (el.type === 'IMG_STATUS') {
            el.src = filename;
            el.assetFilename = filename;
          }
          if (el.type === 'IMG' && !el.iconKey) {
            // Plain IMG (e.g. gauge background) — update src to shadow filename,
            // matching the same pattern used for IMG_STATUS and GAUGE_POINTER.
            el.src = filename;
            el.assetFilename = filename;
          }
          if (el.type === 'GAUGE_POINTER') {
            const pivot = normalizeGaugePivot(el);
            const oldW = Math.max(1, el.bounds.width || 1);
            const oldH = Math.max(1, el.bounds.height || 1);
            const newW = oldW + bakeResult.pad * 2;
            const newH = oldH + bakeResult.pad * 2;
            const oldPivotX = oldW * pivot.pivotX;
            const oldPivotY = oldH * pivot.pivotY;
            const shiftedPivotX = oldPivotX + bakeResult.pad;
            const shiftedPivotY = oldPivotY + bakeResult.pad;
            el.bounds = {
              x: el.bounds.x - bakeResult.pad,
              y: el.bounds.y - bakeResult.pad,
              width: newW,
              height: newH,
            };
            el.pivotX = shiftedPivotX / newW;
            el.pivotY = shiftedPivotY / newH;
            el.src = filename;
            el.assetFilename = filename;
          }
        }
      }

      // Inject clock hand images for TIME_POINTER elements.
      // Each MAIN/AOD pointer gets its own scoped asset filenames.
      const missingPointerAssets: string[] = [];
      const aodExportElementSet = new Set(exportAodElements ?? []);
      const timePointerElements = exportCombinedElements.filter((el) => el.type === 'TIME_POINTER');

      for (const timePointerEl of timePointerElements) {
        const pointerScope: 'main' | 'aod' = aodExportElementSet.has(timePointerEl) ? 'aod' : 'main';
        const safePointerId = timePointerEl.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const scopedNames = {
          hour: `hour_hand_${pointerScope}_${safePointerId}.png`,
          minute: `minute_hand_${pointerScope}_${safePointerId}.png`,
          second: `second_hand_${pointerScope}_${safePointerId}.png`,
          cover: `hand_cover_${pointerScope}_${safePointerId}.png`,
        };

        if (timePointerEl.handStyle?.startsWith('custom_hand:')) {
          const customHand = await getCustomHandByKey(timePointerEl.handStyle);
          if (customHand) {
            if (typeof customHand.hourPosX === 'number' && typeof customHand.hourPosY === 'number') {
              timePointerEl.hourPos = { x: customHand.hourPosX, y: customHand.hourPosY };
            }
            if (typeof customHand.minutePosX === 'number' && typeof customHand.minutePosY === 'number') {
              timePointerEl.minutePos = { x: customHand.minutePosX, y: customHand.minutePosY };
            }
            if (typeof customHand.secondPosX === 'number' && typeof customHand.secondPosY === 'number') {
              timePointerEl.secondPos = { x: customHand.secondPosX, y: customHand.secondPosY };
            }
            if (typeof customHand.coverWidth === 'number' && customHand.coverWidth > 0) {
              timePointerEl.coverWidth = customHand.coverWidth;
            }
            if (typeof customHand.coverHeight === 'number' && customHand.coverHeight > 0) {
              timePointerEl.coverHeight = customHand.coverHeight;
            }
            const resolvedPack = resolveCustomHandPack(customHand);
            // HTML/SVG keeps the source-native geometry path. PNG masters are authoring
            // sources only; Studio preview/export must consume the normalized baked PNGs.
            const sourceMode = resolvedPack?.mode === 'source-based-custom'
              && getCustomHandSourceKind(customHand) === 'html';
            // Cover always uses the pre-baked PNG (trimmed + fitted at save time, dimensions
            // match coverWidth/coverHeight). Raw SVG path used for hands does not apply here
            // because the hub widget specifies explicit w/h — image and dimensions must agree.
            const coverDataUrl = customHand.coverDataUrl ?? resolvedPack?.sources.cover ?? null;
            const sourcePivotRatios = sourceMode
              ? {
                hour: parsePivotRatioFromSource(customHand.sourceHourHtml)
                  ?? { x: customHand.hourPivotXRatio ?? 0.5, y: customHand.hourSvgPivotNorm ?? customHand.hourPivotYRatio ?? customHand.hourPivotNorm ?? (customHand.hourPosY ?? 118) / 140 },
                minute: parsePivotRatioFromSource(customHand.sourceMinuteHtml)
                  ?? { x: customHand.minutePivotXRatio ?? 0.5, y: customHand.minuteSvgPivotNorm ?? customHand.minutePivotYRatio ?? customHand.minutePivotNorm ?? (customHand.minutePosY ?? 172) / 200 },
                second: parsePivotRatioFromSource(customHand.sourceSecondHtml)
                  ?? { x: customHand.secondPivotXRatio ?? 0.5, y: customHand.secondSvgPivotNorm ?? customHand.secondPivotYRatio ?? customHand.secondPivotNorm ?? (customHand.secondPosY ?? 180) / 240 },
                cover: { x: 0.5, y: 0.5 },
              }
              : null;
            timePointerEl.coverSrc = coverDataUrl ? scopedNames.cover : undefined;
            timePointerEl.hourHandSrc = scopedNames.hour;
            timePointerEl.minuteHandSrc = scopedNames.minute;
            timePointerEl.secondHandSrc = scopedNames.second;

            const handFiles = [
              { name: scopedNames.hour, dataUrl: sourceMode ? (resolvedPack?.sources.hour ?? customHand.hourDataUrl) : customHand.hourDataUrl },
              { name: scopedNames.minute, dataUrl: sourceMode ? (resolvedPack?.sources.minute ?? customHand.minuteDataUrl) : customHand.minuteDataUrl },
              { name: scopedNames.second, dataUrl: sourceMode ? (resolvedPack?.sources.second ?? customHand.secondDataUrl) : customHand.secondDataUrl },
            ];
            if (coverDataUrl) handFiles.push({ name: scopedNames.cover, dataUrl: coverDataUrl });

            for (const { name, dataUrl } of handFiles) {
              if (!dataUrl) {
                console.warn('[App] Missing custom hand layer for export:', name, 'style:', timePointerEl.handStyle);
                missingPointerAssets.push(`baked-export:${timePointerEl.id}:${name} (${timePointerEl.handStyle})`);
                continue;
              }
              const layer: PointerLayer = name.startsWith('hour_')
                ? 'hour'
                : name.startsWith('minute_')
                  ? 'minute'
                  : name.startsWith('second_')
                    ? 'second'
                    : 'cover';
              const ratio = sourceMode
                ? (layer === 'hour'
                  ? sourcePivotRatios?.hour
                  : layer === 'minute'
                    ? sourcePivotRatios?.minute
                    : layer === 'second'
                      ? sourcePivotRatios?.second
                      : sourcePivotRatios?.cover)
                : null;
              const prepared = await preparePointerGeometryForExport(dataUrl, layer, timePointerEl, customHand, ratio);
              if (layer === 'hour' && prepared.pivot) timePointerEl.hourPos = prepared.pivot;
              if (layer === 'minute' && prepared.pivot) timePointerEl.minutePos = prepared.pivot;
              if (layer === 'second' && prepared.pivot) timePointerEl.secondPos = prepared.pivot;
              const effectedDataUrl = await applyPointerEffectsForZPK(prepared.dataUrl, timePointerEl, layer);
              const { bytes } = decodeDataUrlToBytes(effectedDataUrl, `Pointer image ${name}`);
              const newFile = { src: name, file: new File([bytes], name, { type: 'image/png' }) };
              const idx = elementFiles.findIndex((f) => f.src === name);
              if (idx >= 0) elementFiles[idx] = newFile;
              else elementFiles.push(newFile);
            }
            console.log('[App] Injected custom hand images for style:', timePointerEl.handStyle, 'scope:', pointerScope);
          }
        } else {
          const hs = (timePointerEl.handStyle ?? 'silver') as HandStyleKey;
          timePointerEl.hourHandSrc = scopedNames.hour;
          timePointerEl.minuteHandSrc = scopedNames.minute;
          timePointerEl.secondHandSrc = scopedNames.second;
          timePointerEl.coverSrc = scopedNames.cover;
          const handSet = generateHandSet(hs);
          const builtInHandFiles = [
            { name: scopedNames.hour, dataUrl: handSet.hourHand },
            { name: scopedNames.minute, dataUrl: handSet.minuteHand },
            { name: scopedNames.second, dataUrl: handSet.secondHand },
            { name: scopedNames.cover, dataUrl: handSet.cover },
          ];
          for (const { name, dataUrl } of builtInHandFiles) {
            const layer: PointerLayer = name.startsWith('hour_')
              ? 'hour'
              : name.startsWith('minute_')
                ? 'minute'
                : name.startsWith('second_')
                  ? 'second'
                  : 'cover';
            const prepared = await preparePointerGeometryForExport(dataUrl, layer, timePointerEl);
            if (layer === 'hour' && prepared.pivot) timePointerEl.hourPos = prepared.pivot;
            if (layer === 'minute' && prepared.pivot) timePointerEl.minutePos = prepared.pivot;
            if (layer === 'second' && prepared.pivot) timePointerEl.secondPos = prepared.pivot;
            const effectedDataUrl = await applyPointerEffectsForZPK(prepared.dataUrl, timePointerEl, layer);
            const { bytes } = decodeDataUrlToBytes(effectedDataUrl, `Pointer image ${name}`);
            const newFile = { src: name, file: new File([bytes], name, { type: 'image/png' }) };
            const idx = elementFiles.findIndex((f) => f.src === name);
            if (idx >= 0) elementFiles[idx] = newFile;
            else elementFiles.push(newFile);
          }
          console.log('[App] Regenerated built-in hand images for style:', hs, 'scope:', pointerScope);
        }

        const pointerAssetRefs = [
          timePointerEl.hourHandSrc,
          timePointerEl.minuteHandSrc,
          timePointerEl.hideSeconds ? undefined : timePointerEl.secondHandSrc,
          timePointerEl.coverSrc,
        ].filter((src): src is string => !!src);
        const exportedAssetNames = new Set(elementFiles.map((f) => f.src));
        const missingReferencedAssets = pointerAssetRefs.filter((src) => !exportedAssetNames.has(src));
        if (missingReferencedAssets.length > 0) {
          missingPointerAssets.push(...missingReferencedAssets.map((src) => `reference-missing:${timePointerEl.id}:${src}`));
          throw new Error(`TIME_POINTER assets missing before build (${timePointerEl.id}): ${missingReferencedAssets.join(', ')}`);
        }
      }
      pointerParityMissingAssetsRef.current = missingPointerAssets;

      // Capture adjustment-stage snapshot after export-side element/asset preparation.
      capturePointerParitySnapshotFromCanvas('adjustment-preview');

      if (investigationRunIdRef.current) {
        parityCaptureSession.captureStage({
          runId: investigationRunIdRef.current,
          fixtureId: state.watchFaceConfig.name,
          buildHash: investigationBuildHash,
          stage: 'export',
          eventType: 'export.asset_manifest',
          capturePoint: 'export_manifest',
          data: {
            totalElementFiles: elementFiles.length,
            missingPointerAssets,
            exportElementCount: exportCombinedElements.length,
            exportAodElementCount: exportAodElements?.length ?? 0,
          },
        });
      }

      // Pre-process: convert any remaining data: URL elements (e.g. from Add Image) into
      // physical File objects so the ZPK builder only ever sees clean filenames.
      for (const el of configForBuild.elements) {
        if (el.type === 'IMG' && el.src && el.src.startsWith('data:')) {
          try {
            const res = await fetch(el.src);
            const blob = await res.blob();
            const filename = `static_img_${el.id.slice(0, 6)}.png`;
            const file = new File([blob], filename, { type: 'image/png' });
            const existingIdx = elementFiles.findIndex((f) => f.src === filename);
            if (existingIdx >= 0) elementFiles[existingIdx] = { src: filename, file };
            else elementFiles.push({ src: filename, file });
            el.src = filename;
            el.assetFilename = filename;
            console.log(`[App] Converted Add Image data URL to file: ${filename}`);
          } catch (err) {
            console.error('[App] Failed to convert data URL for element:', el.name, err);
          }
        }
      }

      const zpkResult = await buildZPK({
        config: configForBuild,
        backgroundFile: state.backgroundFile,
        aodBackgroundFile: preparedAodBackgroundFile,
        elementFiles,
        previewDataUrl,
      });
      console.log('[App] ZPK built successfully, size:', zpkResult.size);

      // Capture baked-export stage snapshot once export build is complete.
      capturePointerParitySnapshotFromCanvas('baked-export');

      if (investigationRunIdRef.current) {
        parityCaptureSession.captureStage({
          runId: investigationRunIdRef.current,
          fixtureId: state.watchFaceConfig.name,
          buildHash: investigationBuildHash,
          stage: 'synthesis',
          eventType: 'export.completed',
          capturePoint: 'verdict_synthesis',
          data: {
            zpkSizeBytes: zpkResult.size,
            pointerParityMissingAssets: missingPointerAssets.length,
          },
        });
      }

      dispatch(actions.setZpkBlob(zpkResult.blob));

      const derivedSpecGroup = Object.values(watchModels).find(
        m => m.name === configForBuild.watchModel
      )?.specGroup ?? null;

      if (storeArchitectureFlags.workshop) {
        let pendingSave: PendingWorkshopSave | null = null;
        try {
          if (!workshopProjectBlob) throw new Error('Workshop project snapshot was not created');
          dispatch(actions.setLoadingMessage('Saving Workshop build...'));
          let activeProjectId = workshopProjectId;
          if (!activeProjectId) {
            const project = await createWorkshopProject({
              workingTitle: configForBuild.name,
              tags: [],
            });
            activeProjectId = project.projectId;
            setWorkshopProjectId(activeProjectId);
          }
          pendingSave = {
            projectId: activeProjectId,
            workshopLabel: configForBuild.name || `Watch test ${new Date().toISOString().slice(0, 10)}`,
            resolution: configForBuild.resolution,
            specGroup: derivedSpecGroup ?? undefined,
            parentBuildId: workshopBuildId ?? undefined,
            fvwf: workshopProjectBlob,
            zpk: zpkResult.blob,
            mainPreview: previewDataUrl?.startsWith('data:') ? dataUrlToBlob(previewDataUrl) : undefined,
            aodPreview: aodPreviewDataUrl?.startsWith('data:') ? dataUrlToBlob(aodPreviewDataUrl) : undefined,
          };
          const build = await createWorkshopBuild({ ...pendingSave, projectId: activeProjectId });
          setWorkshopBuildId(build.buildId);
          setPendingWorkshopSave(null);
          setWorkshopSaveError(null);
          dispatch(actions.setGithubUrl(build.installUrl));
          dispatch(actions.setQrCode(build.qrDataUrl));
          pendingSave = null;
          toast.success(`Watch test saved as Build ${String(build.buildNumber).padStart(3, '0')}.`);
        } catch (error) {
          const rawMessage = error instanceof Error ? error.message : 'Unknown Workshop save error';
          const message = rawMessage === 'Failed to fetch'
            ? 'Workshop backend could not be reached. The local ZPK is safe and ready to download.'
            : `Workshop save failed: ${rawMessage}`;
          console.error('[App] Workshop save failed after local ZPK generation:', error);
          if (pendingSave) setPendingWorkshopSave(pendingSave);
          setWorkshopSaveError(message);
          toast.error(message);
        }
        dispatch(actions.setStep('success'));
        return;
      }

      // Upload to Firebase storage through backend bridge.
      dispatch(actions.setLoadingMessage('Uploading to Firebase...'));

      const normalizedTargetId = republishTargetId.trim();
      const isRepublishExisting = normalizedTargetId.length > 0;
      const watchfaceId = isRepublishExisting
        ? normalizedTargetId
        : `${state.watchFaceConfig.name.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/gi, '').slice(0, 48) || 'watchface'}_${Date.now()}`;
      setUploadedWatchfaceId(watchfaceId);
      const backendBase = (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
        (import.meta.env.VITE_PURCHASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
        (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();
      const expectedZpkUrl = backendBase
        ? `${backendBase.replace(/\/$/, '')}/publicAsset?kind=zpk&id=${encodeURIComponent(watchfaceId)}`
        : '';
      
      dispatch(actions.setLoadingMessage('Generating QR code...'));
      const shouldGenerateQr = !isRepublishExisting || republishMode === 'REGENERATE_ALL';
      const qrDataUrl = shouldGenerateQr && expectedZpkUrl ? await generateQRCode(expectedZpkUrl) : null;

      // Build source.json for safe future regeneration
      // Derive specGroup from watchModel so adminPatchSpecGroups batch can repair catalog entries.
      const sourceJson = buildSourceJson(withNormalizedPointerEffects(configForBuild), derivedSpecGroup);

      const uploadResult = await uploadStudioArtifactsToFirebase({
        watchfaceId,
        zpkBlob: zpkResult.blob,
        qrMode: shouldGenerateQr ? 'REGENERATE' : 'KEEP_EXISTING',
        qrDataUrl: qrDataUrl ?? undefined,
        previewDataUrl: previewDataUrl ?? undefined,
        aodPreviewDataUrl: aodPreviewDataUrl ?? previewDataUrl ?? undefined,
        sourceJson,
      });

      setLatestUploadResult(uploadResult);

      if (!uploadResult.ok) {
        const uploadError = 'Upload failed';
        dispatch(actions.setGithubUrl(''));
        dispatch(actions.setQrCode(null));
        dispatch(actions.setStep('success'));
        if (/backend bridge is required/i.test(uploadError)) {
          toast.error('Upload skipped: backend bridge URL is not configured. ZPK generated locally — download it below.');
        } else {
          toast.error(`Upload skipped: ${uploadError}. ZPK generated locally — download it below.`);
        }
        return;
      }
      
      dispatch(actions.setGithubUrl(uploadResult.downloadUrl || ''));
      dispatch(actions.setQrCode(qrDataUrl));
      dispatch(actions.setStep('success'));

      // Auto-save as OFFLINE draft so the face appears in /admin even if PublishForm is skipped
      if (!isRepublishExisting) {
        publishStudioWatchfaceToFirebase({
          id: watchfaceId,
          name: configForBuild.name || watchfaceId,
          specGroup: derivedSpecGroup || 'unknown',
          categories: [],
          hashtags: [],
          basePrice: 0,
          discountPercent: 0,
          price: 0,
          stripeLink: null,
          draft: true,
        }).catch(() => { /* silent — draft is best-effort */ });
      }
      if (investigationRunIdRef.current) {
        parityCaptureSession.completeRun({ runId: investigationRunIdRef.current });
      }
      toast.success('Watch face created successfully!');
    } catch (error) {
      console.error('[App] Generation failed with error:', error);
      if (error instanceof Error) {
        console.error('[App] Error stack:', error.stack);
      }
      if (investigationRunIdRef.current) {
        parityCaptureSession.completeRun({
          runId: investigationRunIdRef.current,
          invalidationReason: error instanceof Error ? error.message : 'unknown-error',
        });
      }
      toast.error('Generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      dispatch(actions.setStep('preview'));
    } finally {
      investigationRunIdRef.current = null;
      dispatch(actions.setLoading(false));
    }
  }, [state.watchFaceConfig, aodElements, aodBackgroundMode, aodBackgroundFile, aodSolidColor, state.backgroundFile, state.backgroundImage, state.elementImages, state.githubRepo, dispatch, capturePointerParitySnapshotFromCanvas, parityCaptureSession, investigationBuildHash, showGrid, republishMode, republishTargetId, workshopProjectId, workshopBuildId]);

  const retryWorkshopSave = useCallback(async () => {
    if (!pendingWorkshopSave || retryingWorkshopSave) return;
    setRetryingWorkshopSave(true);
    try {
      let activeProjectId = pendingWorkshopSave.projectId;
      if (!activeProjectId) {
        const project = await createWorkshopProject({ workingTitle: pendingWorkshopSave.workshopLabel, tags: [] });
        activeProjectId = project.projectId;
        setWorkshopProjectId(activeProjectId);
      }
      const build = await createWorkshopBuild({ ...pendingWorkshopSave, projectId: activeProjectId });
      setWorkshopBuildId(build.buildId);
      setPendingWorkshopSave(null);
      setWorkshopSaveError(null);
      dispatch(actions.setGithubUrl(build.installUrl));
      dispatch(actions.setQrCode(build.qrDataUrl));
      toast.success(`Workshop Build ${String(build.buildNumber).padStart(3, '0')} saved. Installation QR is ready.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Workshop retry error';
      setWorkshopSaveError(`Workshop retry failed: ${message}`);
      toast.error(`Workshop retry failed: ${message}`);
    } finally {
      setRetryingWorkshopSave(false);
    }
  }, [dispatch, pendingWorkshopSave, retryingWorkshopSave]);

  const handleGenerateClick = useCallback(() => {
    if (state.currentStep === 'generating') {
      toast.error('Deploy already running. Please wait for completion.');
      return;
    }

    if (pointerParityRunning) {
      toast.error('Pointer parity check is running. Wait for it to finish, then deploy.');
      return;
    }

    const now = new Date();
    const stamp = `${now.toLocaleTimeString('en-US', { hour12: false })}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    toast.success(`Deploy started at ${stamp}`);
    void handleGenerate();
  }, [handleGenerate, pointerParityRunning, state.currentStep]);

  // Handle reset
  const handleReset = useCallback(() => {
    dispatch(actions.reset());
    setAodElements(null);
    setAodBackgroundMode('USE_MAIN_BACKGROUND');
    setAodBackgroundImage(null);
    setAodBackgroundFile(null);
    setAodSolidColor('#000000');
    setEditorMode('MAIN');
    setWatchFaceName('');
    setUploadedWatchfaceId('');
    setShowPublishForm(false);
    setPublishedEntry(null);
    setLatestUploadResult(null);
    setMainBackgroundSource('image');
    setMainBackgroundHtml('');
    setAodBackgroundSource('image');
    setAodBackgroundHtml('');
    toast.info('Started new watch face');
  }, [dispatch]);

  // Toggle element visibility
  const handleToggleElement = useCallback(
    (id: string) => {
      if (!state.watchFaceConfig) return;
      toggleActiveElementVisibility(id);
    },
    [state.watchFaceConfig, toggleActiveElementVisibility]
  );

  // Render different steps
  const renderContent = () => {
    switch (state.currentStep) {
      case 'upload':
        return (
          <div className="space-y-6">
            {/* Watch Model & Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-zinc-300">Watch Model</Label>
                <select
                  value={watchModel}
                  onChange={(e) => setWatchModel(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-[#0F0F0F] border border-zinc-700 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                >
                  {/* Names match models.json `name` field exactly for correct specGroup + deviceSources lookup */}
                  <option value="Amazfit Balance 2">⭐ Amazfit Balance 2 (480×480)</option>
                  <option value="Amazfit Balance">Amazfit Balance (480×480)</option>
                  <option value="Amazfit Active Max">Amazfit Active Max (480×480)</option>
                  <option value="Amazfit Active 3 Premium">Amazfit Active 3 Premium (466×466)</option>
                  <option value="Amazfit Active 2 (Round)">Amazfit Active 2 Round (466×466)</option>
                  <option value="Amazfit Active 2 (Square)">Amazfit Active 2 Square (390×450)</option>
                  <option value="Amazfit Active">Amazfit Active (390×450)</option>
                  <option value="Pop 3S (PIB)">Amazfit Pop 3S / PIB (410×502)</option>
                  {/* Original models */}
                  <option value="Amazfit GTR 4">Amazfit GTR 4 (466×466)</option>
                  <option value="Amazfit GTS 4">Amazfit GTS 4 (390×450)</option>
                  <option value="Amazfit Cheetah Pro">Amazfit Cheetah Pro (480×480)</option>
                  <option value="Amazfit T-Rex 2">Amazfit T-Rex 2 (454×454)</option>
                  <option value="Amazfit Falcon">Amazfit Falcon (416×416)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-zinc-300">Watch Face Name (optional)</Label>
                <Input
                  value={watchFaceName}
                  onChange={(e) => setWatchFaceName(e.target.value)}
                  placeholder="My Custom Watch Face"
                  className="bg-[#0F0F0F] border-zinc-700 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">New Path</p>
                  <h3 className="text-sm font-semibold text-cyan-100">Parametric Watchface Engine</h3>
                  <p className="mt-1 text-xs text-cyan-200/80">
                    Open deterministic template-based compiler workspace under Studio.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => navigate('/studio/parametric')}
                  className="h-10 bg-cyan-600 text-white hover:bg-cyan-500"
                >
                  Open Parametric Studio
                </Button>
              </div>
            </div>

            {/* AI Settings Panel */}
            <div className="border border-zinc-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#141414] hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-300">AI Settings</span>
                  {aiApiKey ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">
                      {aiProvider === 'gemini' ? 'Gemini' : 'GPT-4o'} configured
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">
                      Mock mode
                    </span>
                  )}
                </div>
                <span className="text-zinc-500 text-xs">{showSettings ? '▲' : '▼'}</span>
              </button>

              {showSettings && (
                <div className="px-4 py-4 space-y-4 border-t border-zinc-800">
                  {/* Provider selector */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm text-zinc-300">AI Provider</Label>
                      <select
                        value={aiProvider}
                        onChange={(e) => handleSetAiProvider(e.target.value as AIProvider)}
                        className="w-full h-10 px-3 rounded-md bg-[#0F0F0F] border border-zinc-700 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                      >
                        <option value="gemini">Google Gemini 2.0 Flash (cheapest)</option>
                        <option value="openai">OpenAI GPT-4o (most reliable)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-zinc-300">API Key</Label>
                      <div className="relative">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          value={aiApiKey}
                          onChange={(e) => handleSetApiKey(e.target.value)}
                          placeholder={aiProvider === 'gemini' ? 'AIza...' : 'sk-...'}
                          className="bg-[#0F0F0F] border-zinc-700 text-white placeholder:text-zinc-600 pr-20"
                        />
                        <div className="absolute right-1 top-1 flex gap-1">
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-300"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={async () => {
                              if (!aiApiKey) return;
                              const valid = await testApiKey({ provider: aiProvider, apiKey: aiApiKey });
                              toast[valid ? 'success' : 'error'](valid ? 'API key is valid!' : 'API key is invalid');
                            }}
                            className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          >
                            Test
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mock mode toggle */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useMockAnalysis}
                        onChange={(e) => setUseMockAnalysis(e.target.checked)}
                        className="rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500/20"
                      />
                      <span className="text-sm text-zinc-400">Use mock analysis (no API call, demo data)</span>
                    </label>
                  </div>

                  <p className="text-xs text-zinc-600">
                    {aiProvider === 'gemini'
                      ? 'Get your API key from Google AI Studio: aistudio.google.com/apikey'
                      : 'Get your API key from OpenAI: platform.openai.com/api-keys'}
                  </p>
                </div>
              )}
            </div>

            {/* Background source */}
            <div className="space-y-2">
              <Label className="text-sm text-zinc-300">Background Source</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMainBackgroundSource('image')}
                  className={`h-9 rounded border text-xs transition-colors ${mainBackgroundSource === 'image' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}
                >
                  Image
                </button>
                <button
                  onClick={() => setMainBackgroundSource('html')}
                  className={`h-9 rounded border text-xs transition-colors ${mainBackgroundSource === 'html' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}
                >
                  HTML
                </button>
              </div>
            </div>
            {mainBackgroundSource === 'image' ? (
              <UploadZone
                label="Background Image"
                sublabel="Any size — crop to fit"
                value={state.backgroundImage}
                onFileChange={(file) => { dispatch(actions.setBackgroundFile(file)); if (file) openCropTool(file, 'MAIN'); }}
              />
            ) : (
              <div className="space-y-2">
                <Label className="text-sm text-zinc-300">Background HTML</Label>
                <textarea
                  value={mainBackgroundHtml}
                  onChange={(e) => setMainBackgroundHtml(e.target.value)}
                  placeholder="Paste HTML for main background..."
                  className="w-full h-32 px-3 py-2 rounded-md bg-[#0F0F0F] border border-zinc-700 text-white text-xs font-mono placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none resize-y"
                />
                <Button
                  onClick={() => { void applyHtmlBackground('MAIN'); }}
                  variant="outline"
                  className="w-full h-9 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs"
                >
                  Apply HTML Background
                </Button>
              </div>
            )}
            {/* T038/T039: Edit Photo button — visible only when a background image is loaded */}
            {state.backgroundImage && (
              <button
                onClick={() => {
                  setPhotoEditorTarget('MAIN');
                  setShowPhotoEditor(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md border border-zinc-600 text-zinc-300 hover:text-white hover:border-cyan-500 hover:bg-zinc-800 text-xs font-medium transition-colors"
              >
                ✏ Edit Photo
              </button>
            )}

            {/* Spec 012 — unified design input */}
            <DesignInput
              activeTab={designTab}
              onTabChange={setDesignTab}
              imageValue={state.fullDesignImage}
              onImageChange={(img) => dispatch(actions.setFullDesignImage(img))}
              onImageFileChange={(file) => dispatch(actions.setFullDesignFile(file))}
              htmlValue={htmlInput}
              onHtmlChange={setHtmlInput}
              bgImage={state.backgroundImage}
            />

            {designTab === 'html_creator' && (
              <div className="space-y-2">
                <Label className="text-sm text-zinc-300">HTML Creator Target Library</Label>
                <select
                  value={htmlInjectTarget}
                  onChange={(e) => {
                    setHtmlInjectTarget(e.target.value as HtmlLibraryTarget);
                    setHtmlInjectSlot('auto');
                  }}
                  className="w-full h-10 px-3 rounded-md bg-[#0F0F0F] border border-zinc-700 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                >
                  <option value="background">Background</option>
                  <option value="icon">Icon</option>
                  <option value="time_pointer">Time Pointer</option>
                  <option value="gauge_pointer">Gauge Pointer</option>
                  <option value="weather_status">Weather Status</option>
                  <option value="all">All Types</option>
                </select>

                <Label className="text-sm text-zinc-300">HTML Creator Sub-Library Slot</Label>
                <select
                  value={htmlInjectSlot}
                  onChange={(e) => setHtmlInjectSlot(e.target.value as HtmlLibrarySlot)}
                  className="w-full h-10 px-3 rounded-md bg-[#0F0F0F] border border-zinc-700 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                >
                  {htmlCreatorSlotOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action button */}
            <Button
              onClick={designTab === 'image' ? handleAnalyze : designTab === 'html' ? handleLoadLayout : handleInjectHtmlToLibrary}
              disabled={
                designTab === 'image'
                  ? !state.backgroundImage || !state.fullDesignImage
                  : !htmlInput.trim()
              }
              className={`w-full h-12 bg-gradient-to-r text-white font-semibold disabled:opacity-50 ${
                designTab === 'image'
                  ? 'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                  : 'from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500'
              }`}
            >
              {designTab === 'image' ? (
                <><Sparkles className="h-5 w-5 mr-2" />Analyze with AI</>
              ) : designTab === 'html' ? (
                <>{'</>'} Load Layout</>
              ) : (
                <><Sparkles className="h-5 w-5 mr-2" />Inject to Library</>
              )}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            {/* Skip widget HTML — go straight to canvas with background, add widgets manually */}
            <Button
              onClick={handleStartBlank}
              disabled={!state.backgroundImage}
              variant="outline"
              className="w-full h-10 border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-white hover:bg-zinc-800 text-xs disabled:opacity-40"
            >
              Skip widgets — go to canvas with background
            </Button>

            {/* Load saved .fvwf project — skips upload step entirely */}
            <Button
              onClick={handleLoadProject}
              variant="outline"
              className="w-full h-10 border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-white hover:bg-zinc-800 text-xs"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Load saved project (.fvwf)
            </Button>
          </div>
        );

      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full border-4 border-zinc-800 border-t-cyan-500 animate-spin" />
              <Wand2 className="absolute inset-0 m-auto h-6 w-6 text-cyan-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Analyzing your design...</h3>
            <p className="text-zinc-500 text-center max-w-md">
              Our AI is detecting watch face elements, calculating positions, and preparing the configuration.
            </p>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6 min-h-[calc(100vh-14rem)]">
            {state.backgroundImage && state.watchFaceConfig && (
              <>
                {/* Interactive canvas + property panel */}
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,520px)_minmax(420px,1fr)] gap-6 items-start">
                  <div className="flex flex-col items-center shrink-0 xl:sticky xl:top-4 self-start">
                    <div className="flex items-center justify-between w-full max-w-sm mb-4">
                      <h4 className="text-sm font-medium text-zinc-400">{editorMode} Editor — drag to reposition</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => dispatch({ type: 'UNDO' })}
                          disabled={editorMode === 'AOD' || state.undoStack.length === 0}
                          className="p-1.5 rounded-lg border transition-colors bg-white/5 border-white/10 text-white/40 disabled:opacity-30"
                          title="Undo (Ctrl+Z)"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'REDO' })}
                          disabled={editorMode === 'AOD' || state.redoStack.length === 0}
                          className="p-1.5 rounded-lg border transition-colors bg-white/5 border-white/10 text-white/40 disabled:opacity-30"
                          title="Redo (Ctrl+Y)"
                        >
                          <Redo2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowGrid(g => !g)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            showGrid ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'
                          }`}
                          title="Toggle grid"
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setLabOpen(true)}
                          className="p-1.5 rounded-lg border text-xs transition-colors bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20 hover:border-violet-400"
                          title="Studio Lab — create icons & upload fonts"
                        >
                          <FlaskConical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full max-w-sm mb-3">
                      <button
                        onClick={() => {
                          setEditorMode('MAIN');
                          setSelectedElementId(null);
                          setExtraSelectedIds([]);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          editorMode === 'MAIN'
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                        }`}
                        title="Edit normal watchface layout"
                      >
                        MAIN
                      </button>
                      <button
                        onClick={() => {
                          if (!aodElements) return;
                          setEditorMode('AOD');
                          setSelectedElementId(null);
                          setExtraSelectedIds([]);
                        }}
                        disabled={!aodElements}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          editorMode === 'AOD'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                        }`}
                        title={aodElements ? 'Edit AOD layout' : 'Create AOD layout first'}
                      >
                        AOD
                      </button>
                      <button
                        onClick={createAodFromMain}
                        className="px-2.5 py-1.5 rounded-lg border text-xs transition-colors bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                        title="Create or replace AOD layout from current main layout"
                      >
                        {aodElements ? 'Re-Sync AOD from Main' : 'Create AOD from Main'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 w-full max-w-sm mb-3">
                      <button
                        onClick={() => setCalibrationEnabled((v) => !v)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          calibrationEnabled
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                        }`}
                        title="Simulate watch display calibration in preview"
                      >
                        Display Calibration
                      </button>
                      <select
                        value={calibrationMode}
                        onChange={(e) => setCalibrationMode(e.target.value as CalibrationMode)}
                        disabled={!calibrationEnabled}
                        className="px-2 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-white/15 bg-white/[0.04] text-zinc-200"
                        title="Calibration profile for display simulation"
                      >
                        <option value="perceptual-nearest">Perceptual Nearest</option>
                        <option value="legacy">Legacy</option>
                      </select>
                      <button
                        onClick={() => setFlickerAnalysisEnabled((v) => !v)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          flickerAnalysisEnabled
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                        }`}
                        title="Run anti-flicker analysis and warnings"
                      >
                        Anti-Flicker Analysis
                      </button>
                      <button
                        onClick={() => setFlickerOverlayEnabled((v) => !v)}
                        disabled={!flickerAnalysisEnabled}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          flickerOverlayEnabled && flickerAnalysisEnabled
                            ? 'bg-red-500/20 border-red-500 text-red-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                        }`}
                        title="Overlay forbidden RGB (1-46) flicker-prone pixels"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Show Flicker Zones
                      </button>
                      <button
                        onClick={() => setPreviewRefreshToken((v) => v + 1)}
                        disabled={!flickerAnalysisEnabled}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white/5 border-white/10 text-white/50 hover:text-white/70"
                        title="Force refresh of per-element warning analysis"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh Warnings
                      </button>
                    </div>
                    {editorMode === 'AOD' && aodElements && (
                      <div className="w-full max-w-sm mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                        <p className="text-xs text-amber-200 font-medium">AOD Background</p>
                        <select
                          value={aodBackgroundMode}
                          onChange={(e) => setAodBackgroundMode(e.target.value as AodBackgroundMode)}
                          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
                        >
                          <option value="USE_MAIN_BACKGROUND">Use Main Background</option>
                          <option value="UPLOAD_AOD_BACKGROUND">Upload AOD Background</option>
                          <option value="SOLID_COLOR">Solid Color</option>
                          <option value="NONE_BLACK">No Background (Black)</option>
                        </select>
                        {aodBackgroundMode === 'UPLOAD_AOD_BACKGROUND' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setAodBackgroundSource('image')}
                                className={`h-8 rounded border text-xs transition-colors ${aodBackgroundSource === 'image' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}
                              >
                                Image
                              </button>
                              <button
                                onClick={() => setAodBackgroundSource('html')}
                                className={`h-8 rounded border text-xs transition-colors ${aodBackgroundSource === 'html' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}
                              >
                                HTML
                              </button>
                            </div>
                            {aodBackgroundSource === 'image' ? (
                              <>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    if (!file) return;
                                    setAodBackgroundFile(file);
                                    openCropTool(file, 'AOD');
                                  }}
                                  className="text-xs"
                                />
                                <p className="text-[11px] text-zinc-400">Upload + crop applies only to AOD mode.</p>
                              </>
                            ) : (
                              <>
                                <textarea
                                  value={aodBackgroundHtml}
                                  onChange={(e) => setAodBackgroundHtml(e.target.value)}
                                  placeholder="Paste HTML for AOD background..."
                                  className="w-full h-24 px-2 py-1.5 rounded-md bg-[#0F0F0F] border border-zinc-700 text-white text-[11px] font-mono placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none resize-y"
                                />
                                <Button
                                  onClick={() => { void applyHtmlBackground('AOD'); }}
                                  variant="outline"
                                  className="w-full h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-[11px]"
                                >
                                  Apply AOD HTML Background
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                        {aodBackgroundMode === 'SOLID_COLOR' && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={aodSolidColor}
                              onChange={(e) => setAodSolidColor(e.target.value)}
                              className="h-8 w-12 p-1"
                            />
                            <Input
                              type="text"
                              value={aodSolidColor}
                              onChange={(e) => setAodSolidColor(e.target.value || '#000000')}
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setPhotoEditorTarget('AOD');
                            setShowPhotoEditor(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 text-xs font-medium transition-colors"
                        >
                          ✏ Edit AOD Photo
                        </button>
                      </div>
                    )}
                    <div className="w-full max-w-sm mb-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2">
                      <p className="text-xs text-cyan-200 font-medium">
                        {editorMode === 'AOD' && aodElements ? 'AOD Background Transform' : 'Main Background Transform'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="range"
                          min={-360}
                          max={360}
                          step={1}
                          value={Math.round(activeBackgroundTransform.angle)}
                          onChange={(e) => updateActiveBackgroundTransform({ angle: Number(e.target.value) })}
                        />
                        <Input
                          type="number"
                          value={Math.round(activeBackgroundTransform.angle)}
                          onChange={(e) => updateActiveBackgroundTransform({ angle: Number(e.target.value) || 0 })}
                          className="h-8 w-20 text-xs"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            onClick={() => updateActiveBackgroundTransform({ angle: deg })}
                            className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-[11px] text-zinc-300 hover:border-zinc-500"
                          >
                            {deg}deg
                          </button>
                        ))}
                        <button
                          onClick={() => updateActiveBackgroundTransform({ flipH: !activeBackgroundTransform.flipH })}
                          className={`px-2 py-1 rounded border text-[11px] ${activeBackgroundTransform.flipH ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'}`}
                        >
                          Flip H
                        </button>
                        <button
                          onClick={() => updateActiveBackgroundTransform({ flipV: !activeBackgroundTransform.flipV })}
                          className={`px-2 py-1 rounded border text-[11px] ${activeBackgroundTransform.flipV ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'}`}
                        >
                          Flip V
                        </button>
                        <button
                          onClick={() => updateActiveBackgroundTransform({ ...DEFAULT_BACKGROUND_TRANSFORM })}
                          className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-[11px] text-zinc-300 hover:border-zinc-500"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <InteractiveCanvas
                      ref={canvasRef}
                      backgroundImage={activeBackgroundImage ?? undefined}
                      backgroundTransform={activeBackgroundTransform}
                      elements={canvasElements}
                      elementImages={state.elementImages}
                      selectedElementId={selectedElementId}
                      extraSelectedIds={extraSelectedIds}
                      onSelectElement={handleSelectElement}
                      onMultiToggle={handleMultiToggle}
                      onUpdateElement={updateActiveElementSilent}
                      onBatchUpdateElements={handleBatchUpdateElements}
                      onDragStart={handleDragStart}
                      onAddElement={(el) => {
                        addActiveElement(el);
                        setSelectedElementId(el.id);
                        setExtraSelectedIds([]);
                      }}
                      showGrid={showGrid}
                      calibrationEnabled={calibrationEnabled}
                      calibrationMode={calibrationMode}
                      flickerAnalysisEnabled={flickerAnalysisEnabled}
                      flickerOverlayEnabled={flickerOverlayEnabled}
                      refreshToken={previewRefreshToken}
                      onElementWarningsChange={setElementWarnings}
                      className="w-full max-w-sm"
                      customHandStyles={customHandStyles}
                      canvasW={activeCanvasW}
                      canvasH={activeCanvasH}
                      canvasShape={activeShape}
                      canvasCornerRadius={activeCornerRadius}
                    />
                    <div
                      aria-hidden="true"
                      className="fixed left-[-10000px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none"
                    >
                      <InteractiveCanvas
                        ref={mainPreviewCanvasRef}
                        backgroundImage={state.backgroundImage ?? undefined}
                        backgroundTransform={mainBackgroundTransform}
                        elements={mainCaptureElements}
                        elementImages={state.elementImages}
                        selectedElementId={null}
                        extraSelectedIds={[]}
                        showGrid={false}
                        calibrationEnabled={calibrationEnabled}
                        calibrationMode={calibrationMode}
                        flickerAnalysisEnabled={false}
                        flickerOverlayEnabled={false}
                        customHandStyles={customHandStyles}
                        canvasW={activeCanvasW}
                        canvasH={activeCanvasH}
                        canvasShape={activeShape}
                        canvasCornerRadius={activeCornerRadius}
                      />
                      {aodElements && (
                        <InteractiveCanvas
                          ref={aodPreviewCanvasRef}
                          backgroundImage={aodCaptureBackgroundImage ?? undefined}
                          backgroundTransform={aodBackgroundTransform}
                          elements={aodCaptureElements}
                          elementImages={state.elementImages}
                          selectedElementId={null}
                          extraSelectedIds={[]}
                          showGrid={false}
                          calibrationEnabled={calibrationEnabled}
                          calibrationMode={calibrationMode}
                          flickerAnalysisEnabled={false}
                          flickerOverlayEnabled={false}
                          customHandStyles={customHandStyles}
                          canvasW={activeCanvasW}
                          canvasH={activeCanvasH}
                          canvasShape={activeShape}
                          canvasCornerRadius={activeCornerRadius}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-1 2xl:grid-cols-[minmax(420px,1fr)_minmax(280px,340px)] gap-4 xl:max-h-[calc(100vh-14rem)]">
                    <div className="space-y-4 xl:min-h-0 xl:pr-2">
                      <h4 className="text-sm font-medium text-zinc-400">Properties</h4>
                      <PropertyPanel
                        element={activeSelectedElement}
                        canvasWidth={activeCanvasW}
                        canvasHeight={activeCanvasH}
                        onUpdateElement={updateActiveElement}
                        onUpdateElementIsolated={updateActiveElementIsolated}
                        elements={activeElements}
                        onAddFrame={handleAddFrame}
                        onRemoveFrame={handleRemoveFrame}
                        iconLibraryKey={iconLibraryKey}
                        fontLibraryKey={fontLibraryKey}
                        customHandStyles={customHandStyles}
                        customGaugePointers={customGaugePointers}
                        switcherDefinitions={switcherDefinitions}
                        onOpenSwitcherLab={() => setShowSwitcherLab(true)}
                        onAddSiblingElement={(partialEl) => {
                          addActiveElement({ ...partialEl, id: generateId() } as import('@/types').WatchFaceElement);
                          // Keep GAUGE_POINTER selected — do NOT call setSelectedElementId
                        }}
                        onRemoveSiblingElements={(ids) => {
                          ids.forEach(id => deleteActiveElement(id));
                        }}
                        extraSelectedIds={extraSelectedIds}
                        onDuplicateSelected={handleDuplicateSelected}
                        onFlipHorizontal={(mode) => handleFlipSelected('h', mode)}
                        onFlipVertical={(mode) => handleFlipSelected('v', mode)}
                      />
                    </div>
                    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 min-h-[22rem] xl:min-h-[30rem] xl:overflow-y-auto 2xl:max-h-[calc(100vh-15rem)]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-zinc-400">Elements</h4>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 rounded px-2 py-1 transition-colors cursor-pointer" title="Add a static image">
                            <Plus className="h-3 w-3" />
                            Add Image
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const dataUrl = ev.target?.result as string;
                                  const img = new window.Image();
                                  img.onload = () => {
                                    addActiveElement({
                                      id: generateId(),
                                      type: 'IMG',
                                      name: file.name,
                                      displayName: 'Image',
                                      bounds: { x: 0, y: 0, width: img.width, height: img.height },
                                      visible: true,
                                      zIndex: activeElements.length,
                                      src: dataUrl
                                    });
                                  };
                                  img.src = dataUrl;
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            onClick={() => setShowAddElement(true)}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 rounded px-2 py-1 transition-colors"
                            title="Add a new element"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </button>
                        </div>
                      </div>
                      <ElementList
                        elements={activeElements}
                        elementWarnings={flickerAnalysisEnabled ? elementWarnings : {}}
                        onToggleVisibility={handleToggleElement}
                        selectedElementId={selectedElementId}
                        onSelectElement={handleSelectElement}
                        extraSelectedIds={extraSelectedIds}
                        onMultiToggle={handleMultiToggle}
                        onReorder={handleReorderElements}
                        onRenameElement={handleRenameElement}
                        onDeleteElement={(id) => {
                          deleteActiveElement(id);
                          if (selectedElementId === id) { setSelectedElementId(null); setExtraSelectedIds([]); }
                          else setExtraSelectedIds(prev => prev.filter(x => x !== id));
                        }}
                        onDuplicateElement={handleDuplicateElement}
                      />
                    </div>
                  </div>
                </div>

                {/* Studio Lab drawer */}
                <IconLab
                  open={labOpen}
                  onClose={() => { setLabOpen(false); handleLabIconsSaved(); handleLabHandsSaved(); }}
                  onIconsSaved={handleLabIconsSaved}
                  onFontsSaved={handleLabFontsSaved}
                  onHandsSaved={handleLabHandsSaved}
                  onGaugePointersSaved={handleLabGaugePointersSaved}
                />

                {/* Image Switcher Lab modal */}
                <Dialog open={showSwitcherLab} onOpenChange={(open) => {
                  if (!open) {
                    setShowSwitcherLab(false);
                    loadSwitcherDefinitions().then(setSwitcherDefinitions).catch(console.warn);
                  }
                }}>
                  <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white text-base">Image Switcher Lab</DialogTitle>
                    </DialogHeader>
                    <ImageSwitcherLab />
                  </DialogContent>
                </Dialog>

                {/* Add Element Dialog */}
                <Dialog open={showAddElement} onOpenChange={setShowAddElement}>
                  <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-white text-base">Add Element</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-1">
                      {/* Widget type grid */}
                      <div>
                        <p className="text-xs text-zinc-400 mb-2">Widget type</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              { type: 'TEXT' as const, label: 'Text', icon: '📝', desc: 'Freeform text label with font styling and data binding' },
                              { type: 'IMG_TIME' as const, label: 'Digital Hours', icon: '⏰', sub: 'hours', desc: 'Image-based digit display for the current hour' },
                              { type: 'IMG_TIME' as const, label: 'Digital Minutes', icon: '⏱️', sub: 'minutes', desc: 'Image-based digit display for the current minute' },
                              { type: 'IMG_TIME' as const, label: 'Digital Seconds', icon: '⏳', sub: 'seconds', desc: 'Image-based digit display for the current second' },
                              { type: 'ARC_PROGRESS' as const, label: 'Arc Progress', icon: '⭕', desc: 'Curved arc bar for displaying health or battery metrics' },
                              { type: 'TEXT_IMG' as const, label: 'Numeric Display', icon: '🔢', desc: 'Image-based number display for any data type (battery, steps, etc.)' },
                              { type: 'IMG_DATE' as const, label: 'Date Digit', icon: '📅', desc: 'Image-based digit display for the current day-of-month' },
                              { type: 'IMG_WEEK' as const, label: 'Weekday Name', icon: '📆', desc: 'Image-based label showing the current day of the week' },
                              { type: 'IMG_LEVEL' as const, label: 'Image Switcher', icon: '📊', desc: 'Swaps between a set of images based on a data value level' },
                              { type: 'IMG_STATUS' as const, label: 'Status Indicator', icon: '🔵', desc: 'Shows/hides an icon based on a system status (Bluetooth, alarm, DND, lock)' },
                              { type: 'IMG' as const, label: 'Static Image', icon: '🖼️', desc: 'A static image or icon from your library' },
                              { type: 'CIRCLE' as const, label: 'Shape', icon: '⚪', desc: 'Circle, filled rect, stroke rect or rounded rect shape' },
                              { type: 'TIME_POINTER' as const, label: 'Analog Clock', icon: '🕐', desc: 'Analog clock with rotating hour, minute and second hands' },
                              { type: 'GAUGE_POINTER' as const, label: 'Gauge Pointer', icon: '📍', desc: 'Data-driven rotating needle (Zepp IMG_POINTER) for bounded metrics like battery, steps, heart, stress and weather indices' },
                            ] as { type: WatchFaceElement['type']; label: string; icon: string; sub?: string; desc: string }[]
                          ).map((opt) => {
                            const isSelected = addElType === opt.type && (addElSubtype || '') === (opt.sub || '');
                            return (
                              <button
                                key={opt.label}
                                title={opt.desc}
                                onClick={() => { setAddElType(opt.type); setAddElSubtype(opt.sub ?? ''); if (opt.type === 'IMG_STATUS') setAddElDataType('DISCONNECT'); }}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                                  isSelected
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                                }`}
                              >
                                <span className="text-lg">{opt.icon}</span>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Data type selector — shown for relevant widget types */}
                      {addAllowedDataTypes.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-400 mb-2">Data type</p>
                          <select
                            value={addElDataType}
                            onChange={(e) => setAddElDataType(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded px-2 py-1.5"
                          >
                            {addAllowedDataTypes.map((dataType) => (
                              <option key={dataType} value={dataType}>{getDataTypeLabel(dataType)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Shape sub-type selector — CIRCLE only */}
                      {addElType === 'CIRCLE' && (
                        <div>
                          <p className="text-xs text-zinc-400 mb-2">Shape type</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {([
                              { value: 'circle'      as const, label: 'Circle' },
                              { value: 'fill_rect'   as const, label: 'Filled Rect' },
                              { value: 'stroke_rect' as const, label: 'Stroke Rect' },
                              { value: 'rounded_rect'as const, label: 'Rounded Rect' },
                            ]).map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setAddElShapeType(opt.value)}
                                className={`py-1.5 px-2 rounded border text-xs transition-colors ${
                                  addElShapeType === opt.value
                                    ? 'border-cyan-500 bg-cyan-500/20 text-white'
                                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status type selector — IMG_STATUS only (4 official Zepp OS values) */}
                      {addElType === 'IMG_STATUS' && (
                        <div>
                          <p className="text-xs text-zinc-400 mb-2">Status type</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { value: 'DISCONNECT', label: 'Bluetooth Off' },
                              { value: 'CLOCK',      label: 'Alarm Active' },
                              { value: 'DISTURB',    label: 'Do Not Disturb' },
                              { value: 'LOCK',       label: 'Screen Locked' },
                            ].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setAddElDataType(opt.value)}
                                className={`py-1.5 px-2 rounded border text-xs transition-colors ${
                                  addElDataType === opt.value
                                    ? 'border-cyan-500 bg-cyan-500/20 text-white'
                                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleAddElement}
                        className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
                      >
                        Add Element
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {/* Action buttons */}
            <div className="mt-6 border-t border-zinc-800/80 pt-4">
            {pointerParityResult && (
              <div className={`rounded-lg border px-3 py-2 text-xs ${pointerParityResult.pass ? 'border-green-600/40 bg-green-900/20 text-green-300' : 'border-amber-600/40 bg-amber-900/20 text-amber-300'}`}>
                {pointerParityResult.pass
                  ? `Pointer parity: PASS (tolerance ${pointerParityResult.tolerance.toFixed(4)})`
                  : `Pointer parity: FAIL (${pointerParityResult.mismatches.length} mismatch pair(s))`}
                {!pointerParityResult.pass && (
                  <div className="mt-1 space-y-1">
                    {pointerParityResult.mismatches.slice(0, 3).map((mismatch, index) => (
                      <div key={`${mismatch.leftStage}-${mismatch.rightStage}-${index}`} className="text-[11px] text-amber-200/90">
                        {`${mismatch.leftStage} vs ${mismatch.rightStage}: ratio ${mismatch.mismatchRatio.toFixed(4)}, max delta ${mismatch.maxChannelDelta}${mismatch.reason ? ` — ${mismatch.reason}` : ''}`}
                      </div>
                    ))}
                    {pointerParityResult.mismatches.length > 3 && (
                      <div className="text-[11px] text-amber-200/75">
                        +{pointerParityResult.mismatches.length - 3} more mismatch detail(s)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-3">
              <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Republish Options</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500">Target watchface ID (optional)</label>
                  <input
                    list="republish-watchface-ids"
                    value={republishTargetId}
                    onChange={(e) => setRepublishTargetId(e.target.value.trim())}
                    placeholder="Leave empty to create new ID"
                    className="h-9 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200"
                  />
                  <datalist id="republish-watchface-ids">
                    {republishCatalog.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.name}</option>
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500">Republish mode</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setRepublishMode('KEEP_QR')}
                      className={`h-9 rounded border text-[11px] ${republishMode === 'KEEP_QR' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}
                    >
                      Keep QR
                    </button>
                    <button
                      onClick={() => setRepublishMode('REGENERATE_ALL')}
                      className={`h-9 rounded border text-[11px] ${republishMode === 'REGENERATE_ALL' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}
                    >
                      Regenerate All
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-4 xl:sticky xl:bottom-0 xl:z-20 xl:bg-[#1A1A1A]/95 xl:backdrop-blur xl:pb-2">
              <Button
                onClick={handleLoadWidgetsOnly}
                variant="outline"
                className="h-12 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                title="Load widgets from a .fvwf project — keeps current background"
              >
                <FolderOpen className="h-4 w-4 mr-1.5" />
                Load Widgets (.fvwf)
              </Button>
              <Button
                onClick={handleGenerateClick}
                className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {storeArchitectureFlags.workshop ? 'Create Watch Test' : 'Generate ZPK & Upload'}
              </Button>
              <Button
                onClick={runPointerParityVerification}
                disabled={pointerParityRunning}
                variant="outline"
                className="h-12 border-zinc-700 text-white hover:bg-zinc-800"
              >
                {pointerParityRunning ? 'Checking parity...' : 'Run Pointer Parity Check'}
              </Button>
              <Button
                onClick={() => dispatch(actions.setStep('upload'))}
                variant="outline"
                className="h-12 border-zinc-700 text-white hover:bg-zinc-800"
              >
                Back
              </Button>
            </div>
            </div>
          </div>
        );

      case 'generating':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full border-4 border-zinc-800 border-t-green-500 animate-spin" />
              <RefreshCw className="absolute inset-0 m-auto h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Building your watch face...</h3>
            <div className="w-full max-w-md mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Converting images to TGA format
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Generating JavaScript code
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                Packaging ZPK file
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <div className="h-2 w-2 rounded-full bg-zinc-700" />
                Uploading to Firebase
              </div>
            </div>
          </div>
        );

      case 'success': {
        const [, repo] = state.githubRepo.split('/');
        return (
          <div className="space-y-6">
            {state.qrCodeDataUrl && state.githubUrl && (
              <QRDisplay
                qrCodeDataUrl={state.qrCodeDataUrl}
                githubUrl={state.githubUrl}
                zpkBlob={state.zpkBlob}
                filename={state.watchFaceConfig?.name + '.zpk'}
                previewImageUrl={previewImageUrl ?? undefined}
              />
            )}

            {state.zpkBlob && (!state.qrCodeDataUrl || !state.githubUrl) && (
              <div className="rounded-xl border border-amber-700 bg-amber-950/30 p-4 space-y-3">
                <p className="text-amber-300 text-sm font-medium">{workshopSaveError ? 'ZPK created locally. Workshop save did not complete.' : 'ZPK created locally. Installation QR is unavailable.'}</p>
                <p className="text-zinc-400 text-xs">The exact generated ZPK is safe. Download it below or retry saving the same artifacts without rebuilding.</p>
                <Button
                  onClick={() => {
                    const blobUrl = URL.createObjectURL(state.zpkBlob!);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `${state.watchFaceConfig?.name ?? 'watchface'}.zpk`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(blobUrl);
                  }}
                  variant="outline"
                  className="w-full h-10 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm"
                >
                  Download ZPK
                </Button>
              </div>
            )}

            {/* Publish flow */}
            {storeArchitectureFlags.workshop ? (
              <div className="space-y-3">
                <div className={`rounded-xl border px-4 py-3 ${workshopSaveError ? 'border-amber-700 bg-amber-950/30' : 'border-cyan-800 bg-cyan-950/30'}`}>
                  <p className={`text-sm font-medium ${workshopSaveError ? 'text-amber-300' : 'text-cyan-300'}`}>
                    {workshopSaveError ? 'Workshop copy was not saved' : 'Workshop build saved'}
                  </p>
                  <p className="text-zinc-400 text-xs mt-1">
                    {workshopSaveError ?? 'Review and approve physical-watch test builds before permanent store classification.'}
                  </p>
                </div>
                {storeArchitectureFlags.productHierarchy && workshopProjectId && workshopBuildId && <p className="text-xs text-zinc-400">Install and test this exact ZPK on the watch. When it passes, approve this build in Admin before opening the guided Store Release.</p>}
              </div>
            ) : publishedEntry ? (
              <div className="rounded-xl border border-green-700 bg-green-950/40 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-green-400 text-sm font-medium">Published to store ✓</p>
                  <p className="text-zinc-400 text-xs mt-0.5">{publishedEntry.name}</p>
                </div>
                <a
                  href={`/${repo}/face/${publishedEntry.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 underline underline-offset-4 hover:text-green-300 whitespace-nowrap"
                >
                  View in store →
                </a>
              </div>
            ) : showPublishForm && state.watchFaceConfig ? (
              <PublishForm
                watchFaceConfig={state.watchFaceConfig}
                watchfaceId={uploadedWatchfaceId}
                specGroups={specGroups}
                publishMode={republishMode}
                replacedAssets={latestUploadResult?.replacedAssets ?? ['zpk', 'source', 'preview', ...(republishMode === 'REGENERATE_ALL' ? (['qr'] as const) : [])]}
                onPublished={(entry) => {
                  setPublishedEntry(entry);
                  setShowPublishForm(false);
                  toast.success('Published to Flowvault store!');
                }}
                onCancel={() => setShowPublishForm(false)}
              />
            ) : (
              <Button
                onClick={() => setShowPublishForm(true)}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-semibold"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Publish to Flowvault Store
              </Button>
            )}

            <Button
              onClick={handleReset}
              className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Create Another Watch Face
            </Button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Header />

      <main className={`container mx-auto px-4 py-6 ${state.currentStep === 'preview' ? 'max-w-[1400px]' : 'max-w-4xl'}`}>
        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator currentStep={state.currentStep} />
        </div>

        {/* Main content card */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-zinc-800 p-6">
          {renderContent()}
        </div>

        {/* Admin panel */}
        <AdminPanel />

        {/* Studio Lab drawer — icon & font creator */}
        <IconLab
          open={labOpen}
          onClose={() => { setLabOpen(false); handleLabIconsSaved(); handleLabHandsSaved(); }}
          onIconsSaved={handleLabIconsSaved}
          onFontsSaved={handleLabFontsSaved}
          onHandsSaved={handleLabHandsSaved}
          onGaugePointersSaved={handleLabGaugePointersSaved}
        />

        {/* Image Switcher Lab modal */}
        <Dialog open={showSwitcherLab} onOpenChange={(open) => {
          if (!open) {
            setShowSwitcherLab(false);
            loadSwitcherDefinitions().then(setSwitcherDefinitions).catch(console.warn);
          }
        }}>
          <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-base">Image Switcher Lab</DialogTitle>
            </DialogHeader>
            <ImageSwitcherLab />
          </DialogContent>
        </Dialog>

        {/* Tips */}
        {state.currentStep === 'upload' && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-[#1A1A1A] rounded-xl border border-zinc-800">
              <div className="text-2xl mb-2">🎨</div>
              <h4 className="text-sm font-medium text-white mb-1">Design in Gemini</h4>
              <p className="text-xs text-zinc-500">
                Create your watch face design using Gemini AI with detailed prompts.
              </p>
            </div>
            <div className="p-4 bg-[#1A1A1A] rounded-xl border border-zinc-800">
              <div className="text-2xl mb-2">📤</div>
              <h4 className="text-sm font-medium text-white mb-1">Upload Images</h4>
              <p className="text-xs text-zinc-500">
                Upload clean background and full design images for AI analysis.
              </p>
            </div>
            <div className="p-4 bg-[#1A1A1A] rounded-xl border border-zinc-800">
              <div className="text-2xl mb-2">⌚</div>
              <h4 className="text-sm font-medium text-white mb-1">Install on Watch</h4>
              <p className="text-xs text-zinc-500">
                Scan the QR code with Zepp app to install your custom watch face.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Loading overlay */}
      <LoadingOverlay
        isVisible={state.isLoading}
        title={state.loadingMessage || 'Processing...'}
      />

      <Dialog open={!!pendingProjectLoad} onOpenChange={(open) => { if (!open) setPendingProjectLoad(null); }}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Project resolution differs</DialogTitle>
          </DialogHeader>
          {pendingProjectLoad && (
            <div className="space-y-4 text-sm text-zinc-300">
              <p>
                This FVWF was saved as {pendingProjectLoad.config.resolution.width}×{pendingProjectLoad.config.resolution.height},
                while the selected model uses {pendingProjectLoad.targetResolution.width}×{pendingProjectLoad.targetResolution.height}.
              </p>
              <p className="text-xs text-zinc-400">
                Rearranging updates project-space positions only. Artwork sizes and TIME_POINTER geometry remain unchanged.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => setPendingProjectLoad(null)}>Cancel</Button>
                <Button variant="outline" onClick={() => void commitProjectLoad(pendingProjectLoad, 'keep')}>
                  Keep original positions
                </Button>
                <Button onClick={() => void commitProjectLoad(pendingProjectLoad, 'rearrange')}>
                  Rearrange positions
                </Button>
                {storeArchitectureFlags.workshop && pendingWorkshopSave && (
                  <Button
                    onClick={retryWorkshopSave}
                    disabled={retryingWorkshopSave}
                    className="w-full h-10 bg-cyan-600 hover:bg-cyan-500 text-white text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${retryingWorkshopSave ? 'animate-spin' : ''}`} />
                    {retryingWorkshopSave ? 'Retrying Workshop Save...' : 'Retry Workshop Save & Generate QR'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Spec 023 — Background photo editor modal (T040–T043) */}
      {showPhotoEditor && photoEditorSource && (
        <BackgroundPhotoEditor
          sourceDataUrl={photoEditorSource}
          onSave={handlePhotoEditorSave}
          onCancel={handlePhotoEditorClose}
          canvasShape={activeShape}
          canvasCornerRadius={activeCornerRadius}
          canvasWidth={activeCanvasW}
          canvasHeight={activeCanvasH}
        />
      )}

      {/* Spec 011 — Background crop tool modal */}
      <Dialog open={!!cropFile} onOpenChange={(open) => { if (!open) handleCropCancel(); }}>
        <DialogContent className="max-w-[560px] bg-[#1a1a1a] border-zinc-700 p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-white text-sm font-medium">
              {cropTarget === 'AOD' ? 'Crop AOD Background Image' : 'Crop Background Image'}
            </DialogTitle>
          </DialogHeader>
          {cropFile && (
            <BackgroundCropTool
              file={cropFile}
              onConfirm={handleCropConfirm}
              onCancel={handleCropCancel}
              width={activeCanvasW}
              height={activeCanvasH}
              shape={activeShape}
              cornerRadius={activeCornerRadius}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function generateArcTicksPng(el: WatchFaceElement, canvasW: number, canvasH: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = el.center?.x ?? (el.bounds.x + el.bounds.width / 2);
  const cy = el.center?.y ?? (el.bounds.y + el.bounds.height / 2);
  const radius = el.radius ?? 100;
  const startDeg = el.startAngle ?? 135;
  const endDeg = el.endAngle ?? 345;
  const tickWidth = el.tickWidth ?? 2;
  const tickLength = el.tickLength ?? 10;
  
  const tickColorRaw = el.tickColor || '#FFFFFF';
  const tickColor = (tickColorRaw.startsWith('0x') || tickColorRaw.startsWith('0X')) 
    ? '#' + tickColorRaw.slice(2).padStart(6, '0') 
    : tickColorRaw;
    
  const showEnds = !(el.hideStartEndTicks ?? false);
  const count = el.tickCount ?? 0;

  if (count <= 0) return '';

  ctx.strokeStyle = tickColor;
  ctx.lineWidth = tickWidth;
  ctx.lineCap = 'butt';

  const totalDeg = endDeg - startDeg;
  const steps = count > 1 ? count - 1 : 1;

  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    if (!showEnds && count > 1 && (i === 0 || i === count - 1)) continue;
    
    const fraction = count > 1 ? i / steps : 0.5;
    const angleRad = (startDeg - 90 + (totalDeg * fraction)) * (Math.PI / 180);
    
    const innerR = radius - tickLength / 2;
    const outerR = radius + tickLength / 2;
    
    const x1 = cx + innerR * Math.cos(angleRad);
    const y1 = cy + innerR * Math.sin(angleRad);
    const x2 = cx + outerR * Math.cos(angleRad);
    const y2 = cy + outerR * Math.sin(angleRad);
    
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  return canvas.toDataURL();
}

export default StudioApp;
