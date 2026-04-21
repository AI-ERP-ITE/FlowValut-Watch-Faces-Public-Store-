import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowRight, RefreshCw, Sparkles, Wand2, Settings, Eye, EyeOff, Grid3X3, Undo2, Redo2, Plus, FlaskConical } from 'lucide-react';
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
import { InteractiveCanvas } from '@/components/InteractiveCanvas';
import { PropertyPanel } from '@/components/PropertyPanel';

import { useApp, actions } from '@/context/AppContext';
import { buildZPK } from '@/lib/zpkBuilder';
import { FONT_STYLES } from '@/lib/fontLibrary';
import { uploadZPKWithQR, regenerateSingleQR } from '@/lib/githubApi';
import { generateQRCode } from '@/lib/qrGenerator';
import { getIconByKey } from '@/lib/iconLibrary';
import { testApiKey, type AIProvider } from '@/lib/aiService';
import { runPipeline } from '@/pipeline';
import { extractElementsFromImage, type PipelineAIProvider } from '@/pipeline/pipelineAIService';
import { generatePipelineAssets, generateCurvedTextImage } from '@/pipeline/assetImageGenerator';
import { generateHandSet } from '@/lib/handStyles';
import type { HandStyleKey } from '@/lib/handStyles';
import { buildSourceJson, sourceJsonToBlob } from '@/lib/sourceJsonGenerator';
import { PublishForm } from '@/components/PublishForm';
import { AdminPanel } from '@/components/AdminPanel';
import type { CatalogEntry, SpecGroup } from '@/context/CatalogContext';
import type { WatchFaceConfig, WatchFaceElement, ElementImage } from '@/types';
import { generateId } from '@/lib/utils';
import { parseDom } from '@/html/parseDom';
import { mapDomToElements } from '@/html/mapDomToElements';
import { BackgroundCropTool } from '@/components/BackgroundCropTool';
import { BackgroundPhotoEditor } from '@/components/BackgroundPhotoEditor';
import { DesignInput } from '@/components/DesignInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IconLab } from '@/components/IconLab';
import { loadCustomIcons } from '@/lib/customIconStore';
import { loadCustomFonts, registerCustomFonts } from '@/lib/customFontStore';
import { registerCustomIconsInLibrary } from '@/lib/iconLibrary';
import { registerCustomFontsInLibrary } from '@/lib/fontLibrary';
import { loadCustomHandStyles, getCustomHandByKey, resolveCustomHandPack, type CustomHandRecord } from '@/lib/customHandStore';
import {
  POINTER_PARITY_TOLERANCE,
  createMissingStageParityResult,
  runPointerParityChecks,
} from '@/lib/pointerParity';
import { normalizePointerEffects, pointerEffectsToCanvasFilter } from '@/lib/pointerEffects';
import { renderEngraveFrameEffect } from '@/lib/engraveFrameRenderer';
import type { PointerParityResult, PointerParityStage } from '@/types';

function withNormalizedPointerEffects(config: WatchFaceConfig): WatchFaceConfig {
  return {
    ...config,
    elements: config.elements.map((el) => {
      if (el.type !== 'TIME_POINTER') return el;
      const effects = normalizePointerEffects(el);
      return {
        ...el,
        pointerBrightness: effects.brightness,
        pointerContrast: effects.contrast,
        pointerSaturation: effects.saturation,
        pointerOpacity: effects.opacity,
      };
    }),
  };
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
    // User's main goal
    'Balance 2': { width: 480, height: 480 },
    // Other requested models
    'Balance': { width: 480, height: 480 },
    'Active Max': { width: 480, height: 480 },
    'Active 3 Premium': { width: 466, height: 466 },
    'Active 2 Round': { width: 466, height: 466 },
    'Active 2 Square': { width: 390, height: 450 },
    'Active': { width: 390, height: 450 },
    'Pop 3S (PIB)': { width: 410, height: 502 },
    // Original models
    'GTR4': { width: 466, height: 466 },
    'GTS4': { width: 390, height: 450 },
    'Cheetah Pro': { width: 466, height: 466 },
    'T-Rex 2': { width: 454, height: 454 },
    'Falcon': { width: 416, height: 416 },
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
      hourPos: { x: 11, y: 70 },
      minutePos: { x: 8, y: 100 },
      secondPos: { x: 3, y: 120 },
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
      images: Array.from({length: 29}, (_, i) => `weather_${i}.png`),
      dataType: 'WEATHER_CURRENT',
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
    // ===== BUTTON: Battery Shortcut =====
    {
      id: generateId(),
      type: 'BUTTON',
      name: 'Battery Shortcut',
      bounds: { x: cx - 50, y: 60, width: 100, height: 100 },
      normalSrc: 'trasparente.png',
      pressSrc: 'trasparente.png',
      clickAction: 'Settings_batteryManagerScreen',
      visible: true,
      zIndex: 10,
    },
    // ===== BUTTON: Heart Shortcut =====
    {
      id: generateId(),
      type: 'BUTTON',
      name: 'Heart Shortcut',
      bounds: { x: 30, y: cy - 50, width: 100, height: 100 },
      normalSrc: 'trasparente.png',
      pressSrc: 'trasparente.png',
      clickAction: 'heart_app_Screen',
      visible: true,
      zIndex: 10,
    },
    // ===== BUTTON: Steps/Activity Shortcut =====
    {
      id: generateId(),
      type: 'BUTTON',
      name: 'Activity Shortcut',
      bounds: { x: resolution.width - 130, y: cy - 50, width: 100, height: 100 },
      normalSrc: 'trasparente.png',
      pressSrc: 'trasparente.png',
      clickAction: 'activityAppScreen',
      visible: true,
      zIndex: 10,
    },
    // ===== BUTTON: Weather Shortcut =====
    {
      id: generateId(),
      type: 'BUTTON',
      name: 'Weather Shortcut',
      bounds: { x: 30, y: resolution.height - 100, width: 90, height: 90 },
      normalSrc: 'trasparente.png',
      pressSrc: 'trasparente.png',
      clickAction: 'WeatherScreen',
      visible: true,
      zIndex: 10,
    },
    // ===== BUTTON: Stress Shortcut =====
    {
      id: generateId(),
      type: 'BUTTON',
      name: 'Stress Shortcut',
      bounds: { x: resolution.width - 120, y: resolution.height - 100, width: 90, height: 90 },
      normalSrc: 'trasparente.png',
      pressSrc: 'trasparente.png',
      clickAction: 'StressHomeScreen',
      visible: true,
      zIndex: 10,
    },
    // ===== BUTTON: PAI/Bio Charge Shortcut =====
    {
      id: generateId(),
      type: 'BUTTON',
      name: 'PAI Shortcut',
      bounds: { x: cx - 45, y: resolution.height - 100, width: 90, height: 90 },
      normalSrc: 'trasparente.png',
      pressSrc: 'trasparente.png',
      clickAction: 'BioChargeHomeScreen',
      visible: true,
      zIndex: 10,
    },
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
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(h * 0.7)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(digit, w / 2, h / 2);
  }
  
  // Generate TIME digit images (0-9) - used by IMG_TIME for hours and minutes
  const timeDigitSize = { w: 30, h: 50 };
  for (let i = 0; i < 10; i++) {
    const filename = `time_digit_${i}.png`;
    const dataUrl = createCanvasImage(timeDigitSize.w, timeDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#FFFFFF');
    });
    elementImages.push({
      name: filename,
      dataUrl,
      bounds: { x: 0, y: 0, width: timeDigitSize.w, height: timeDigitSize.h },
      type: 'IMG',
    });
  }
  
  // Generate DATE digit images (0-9) - used by IMG_DATE for day numbers
  const dateDigitSize = { w: 20, h: 30 };
  for (let i = 0; i < 10; i++) {
    const filename = `date_digit_${i}.png`;
    const dataUrl = createCanvasImage(dateDigitSize.w, dateDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#CCCCCC');
    });
    elementImages.push({
      name: filename,
      dataUrl,
      bounds: { x: 0, y: 0, width: dateDigitSize.w, height: dateDigitSize.h },
      type: 'IMG',
    });
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
    const dataUrl = createCanvasImage(battDigitSize.w, battDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#00CC88');
    });
    elementImages.push({
      name: filename,
      dataUrl,
      bounds: { x: 0, y: 0, width: battDigitSize.w, height: battDigitSize.h },
      type: 'TEXT_IMG',
    });
  }

  // Generate HEART RATE digit images (0-9) - used by TEXT_IMG
  const heartDigitSize = { w: 18, h: 30 };
  for (let i = 0; i < 10; i++) {
    const filename = `heart_digit_${i}.png`;
    const dataUrl = createCanvasImage(heartDigitSize.w, heartDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#FF6B6B');
    });
    elementImages.push({
      name: filename,
      dataUrl,
      bounds: { x: 0, y: 0, width: heartDigitSize.w, height: heartDigitSize.h },
      type: 'TEXT_IMG',
    });
  }

  // Generate STEPS digit images (0-9) - used by TEXT_IMG
  const stepDigitSize = { w: 18, h: 30 };
  for (let i = 0; i < 10; i++) {
    const filename = `step_digit_${i}.png`;
    const dataUrl = createCanvasImage(stepDigitSize.w, stepDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#FFD93D');
    });
    elementImages.push({
      name: filename,
      dataUrl,
      bounds: { x: 0, y: 0, width: stepDigitSize.w, height: stepDigitSize.h },
      type: 'TEXT_IMG',
    });
  }

  // Generate CALORIES digit images (0-9) - used by TEXT_IMG CAL
  const calDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `cal_digit_${i}.png`;
    const dataUrl = createCanvasImage(calDigitSize.w, calDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#FF9F43');
    });
    elementImages.push({ name: filename, dataUrl, bounds: { x: 0, y: 0, width: calDigitSize.w, height: calDigitSize.h }, type: 'TEXT_IMG' });
  }

  // Generate DISTANCE digit images (0-9) - used by TEXT_IMG DIST
  const distDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `dist_digit_${i}.png`;
    const dataUrl = createCanvasImage(distDigitSize.w, distDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#54A0FF');
    });
    elementImages.push({ name: filename, dataUrl, bounds: { x: 0, y: 0, width: distDigitSize.w, height: distDigitSize.h }, type: 'TEXT_IMG' });
  }

  // Generate PAI digit images (0-9) - used by TEXT_IMG PAI_DAILY
  const paiDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `pai_digit_${i}.png`;
    const dataUrl = createCanvasImage(paiDigitSize.w, paiDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#5F27CD');
    });
    elementImages.push({ name: filename, dataUrl, bounds: { x: 0, y: 0, width: paiDigitSize.w, height: paiDigitSize.h }, type: 'TEXT_IMG' });
  }

  // Generate SPO2 digit images (0-9) - used by TEXT_IMG SPO2
  const spo2DigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `spo2_digit_${i}.png`;
    const dataUrl = createCanvasImage(spo2DigitSize.w, spo2DigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#EE5A24');
    });
    elementImages.push({ name: filename, dataUrl, bounds: { x: 0, y: 0, width: spo2DigitSize.w, height: spo2DigitSize.h }, type: 'TEXT_IMG' });
  }

  // Generate HUMIDITY digit images (0-9) - used by TEXT_IMG HUMIDITY
  const humDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `hum_digit_${i}.png`;
    const dataUrl = createCanvasImage(humDigitSize.w, humDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#0ABDE3');
    });
    elementImages.push({ name: filename, dataUrl, bounds: { x: 0, y: 0, width: humDigitSize.w, height: humDigitSize.h }, type: 'TEXT_IMG' });
  }

  // Generate UVI digit images (0-9) - used by TEXT_IMG UVI
  const uviDigitSize = { w: 16, h: 25 };
  for (let i = 0; i < 10; i++) {
    const filename = `uvi_digit_${i}.png`;
    const dataUrl = createCanvasImage(uviDigitSize.w, uviDigitSize.h, (ctx, w, h) => {
      drawDigit(ctx, w, h, String(i), '#FFC312');
    });
    elementImages.push({ name: filename, dataUrl, bounds: { x: 0, y: 0, width: uviDigitSize.w, height: uviDigitSize.h }, type: 'TEXT_IMG' });
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

  // Generate transparent button image (1x1 transparent PNG)
  const transpDataUrl = createCanvasImage(1, 1, () => {
    // Transparent - no drawing needed
  });
  elementImages.push({
    name: 'trasparente.png',
    dataUrl: transpDataUrl,
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    type: 'BUTTON',
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

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Hue-rotate + saturation via canvas filter
  const hue = el.iconHue ?? 0;
  const sat = el.iconSaturation ?? 100;
  const filterParts: string[] = [];
  if (hue !== 0)   filterParts.push(`hue-rotate(${hue}deg)`);
  if (sat !== 100) filterParts.push(`saturate(${sat}%)`);
  ctx.save();
  if (filterParts.length > 0) ctx.filter = filterParts.join(' ');
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();

  // Colorize: paint solid color through icon's alpha mask (source-in)
  if (el.iconColorize) {
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const octx = offscreen.getContext('2d')!;
    octx.drawImage(img, 0, 0, w, h);
    octx.globalCompositeOperation = 'source-in';
    octx.fillStyle = el.iconColorize;
    octx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = el.iconColorizeOpacity ?? 1.0;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Apply pointer image effects to a rendered hand image before packaging into ZPK.
 */
async function applyPointerEffectsForZPK(
  dataUrl: string,
  el: WatchFaceElement,
  layer: 'hour' | 'minute' | 'second' | 'cover',
): Promise<string> {
  const effects = normalizePointerEffects(el);
  const shadowIntensity = Math.max(0, Math.min(1, el.handShadow ?? 0));
  const glowIntensity = Math.max(0, Math.min(1, el.handGlow ?? 0));
  const trailIntensity = Math.max(0, Math.min(1, el.handTrail ?? 0));
  const tintColor = el.handTint?.trim();
  const hasBasePointerEffects = effects.brightness === 0
    && effects.contrast === 0
    && effects.saturation === 0
    && effects.opacity === 1;
  const hasHandVisualEffects = shadowIntensity > 0 || glowIntensity > 0 || trailIntensity > 0 || !!tintColor;
  if (hasBasePointerEffects && !hasHandVisualEffects) return dataUrl;

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

  const pointerFilter = pointerEffectsToCanvasFilter(effects);
  const isCover = layer === 'cover';

  if (trailIntensity > 0 && !isCover) {
    for (let t = 1; t <= 3; t += 1) {
      const trailAlpha = trailIntensity * (0.18 - t * 0.04);
      if (trailAlpha <= 0) break;
      ctx.save();
      ctx.filter = pointerFilter;
      ctx.globalAlpha = effects.opacity * trailAlpha;
      ctx.drawImage(img, 0, -t * 2, width, height);
      ctx.restore();
    }
  }

  ctx.save();
  if (shadowIntensity > 0) {
    ctx.shadowColor = `rgba(0,0,0,${0.3 + shadowIntensity * 0.6})`;
    ctx.shadowBlur = 4 + shadowIntensity * 20;
    ctx.shadowOffsetX = shadowIntensity * 4;
    ctx.shadowOffsetY = shadowIntensity * 4;
  }
  ctx.filter = pointerFilter;
  ctx.globalAlpha = effects.opacity;
  ctx.drawImage(img, 0, 0, width, height);
  ctx.restore();

  if (glowIntensity > 0 && !isCover) {
    const glowColor = tintColor || '#00EEFF';
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = glowIntensity * 0.55 * effects.opacity;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12 + glowIntensity * 20;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.restore();
  }

  if (tintColor && !isCover) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Regenerate digit/label PNG images from current element colors + font styles.
 * Called at ZPK build time so that UI color/font choices actually reach the device.
 */
function regenerateDigitFilesFromElements(
  elements: WatchFaceElement[],
): { filename: string; dataUrl: string }[] {
  const results: { filename: string; dataUrl: string }[] = [];

  const DATA_TYPE_PREFIXES: Record<string, string> = {
    BATTERY: 'batt_digit',   STEP: 'step_digit',      HEART: 'heart_digit',
    SPO2: 'spo2_digit',      CAL: 'cal_digit',         DISTANCE: 'dist_digit',
    STRESS: 'stress_digit',  PAI: 'pai_digit',         PAI_WEEKLY: 'pai_digit',
    SLEEP: 'sleep_digit',    STAND: 'stand_digit',     FAT_BURN: 'fatburn_digit',
    UVI: 'uvi_digit',        AQI: 'aqi_digit',         HUMIDITY: 'humid_digit',
    WIND: 'wind_digit',      ALARM: 'alarm_digit',     NOTIFICATION: 'notif_digit',
    MOON: 'moon_digit',      SUN_RISE: 'sunrise_digit',SUN_SET: 'sunset_digit',
    VO2MAX: 'vo2_digit',     ALTIMETER: 'alt_digit',   TRAINING_LOAD: 'training_digit',
  };

  function makeDigitCanvas(digit: string, color: string, fontFamily: string, fontWeight: string, w: number, h: number): string {
    // Pre-measure the widest digit (0-9) in this font so all digit images share the
    // same width (monospace-like), with minimal whitespace on the sides.
    // This prevents proportional glyphs like "1" from having huge empty margins
    // that appear as large visual gaps (e.g. "0  1" on device).
    const fontSize = Math.floor(h * 0.75);
    const measureCtx = document.createElement('canvas').getContext('2d')!;
    measureCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    let maxGlyphW = 0;
    for (let d = 0; d <= 9; d++) {
      const m = measureCtx.measureText(String(d));
      maxGlyphW = Math.max(maxGlyphW, Math.ceil(m.width));
    }
    // Canvas width = widest glyph + 2px margin on each side, capped by caller's max
    const canvasW = Math.min(w, Math.max(maxGlyphW + 4, 10));

    const canvas = document.createElement('canvas');
    canvas.width = canvasW; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvasW, h);
    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(digit, canvasW / 2, h / 2);
    return canvas.toDataURL('image/png');
  }

  function makeLabelCanvas(label: string, color: string, fontFamily: string, fontWeight: string, w: number, h: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${Math.floor(h * 0.6)}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2);
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

    if (el.type === 'IMG_TIME') {
      const w = Math.max(Math.floor((el.bounds.width || 60) / 2), 12);
      const h = Math.max(el.bounds.height || 50, 16);
      for (let i = 0; i < 10; i++) {
        results.push({ filename: `time_digit_${i}.png`, dataUrl: makeDigitCanvas(String(i), color, fontFamily, fontWeight, w, h) });
      }
    } else if (el.type === 'IMG_DATE' && el.subtype !== 'month') {
      const w = Math.max(Math.floor((el.bounds.width || 40) / 2), 8);
      const h = Math.max(el.bounds.height || 30, 12);
      for (let i = 0; i < 10; i++) {
        results.push({ filename: `date_digit_${i}.png`, dataUrl: makeDigitCanvas(String(i), color, fontFamily, fontWeight, w, h) });
      }
    } else if (el.type === 'IMG_WEEK') {
      const WEEK_FULL    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const WEEK_SHORT   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const WEEK_INITIAL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      const days = el.weekFormat === 'full' ? WEEK_FULL : el.weekFormat === 'initial' ? WEEK_INITIAL : WEEK_SHORT;
      const w = Math.max(el.bounds.width || 40, 20);
      const h = Math.max(el.bounds.height || 20, 12);
      for (let i = 0; i < 7; i++) {
        results.push({ filename: `week_${i}.png`, dataUrl: makeLabelCanvas(days[i], color, fontFamily, fontWeight, w, h) });
      }
    } else if (el.type === 'TEXT_IMG' && el.dataType) {
      const prefix = DATA_TYPE_PREFIXES[el.dataType];
      if (prefix) {
        const w = Math.max(Math.floor((el.bounds.width || 64) / 4), 8);
        const h = Math.max(el.bounds.height || 25, 12);
        for (let i = 0; i < 10; i++) {
          results.push({ filename: `${prefix}_${i}.png`, dataUrl: makeDigitCanvas(String(i), color, fontFamily, fontWeight, w, h) });
        }
      }
    }
  }

  return results;
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
  return ds.blur + Math.max(Math.abs(ds.offsetX), Math.abs(ds.offsetY)) + 4;
}

function applyShadowToCtx(ctx: CanvasRenderingContext2D, ds: NonNullable<WatchFaceElement['dropShadow']>) {
  const { r, g, b } = hexToRgb(ds.color);
  ctx.shadowColor = `rgba(${r},${g},${b},${ds.opacity})`;
  ctx.shadowBlur = ds.blur;
  ctx.shadowOffsetX = ds.offsetX;
  ctx.shadowOffsetY = ds.offsetY;
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

/** Bake a CIRCLE with its drop shadow. */
function renderCircleWithShadowToPng(el: WatchFaceElement): { dataUrl: string; pad: number } {
  const ds = el.dropShadow!;
  const pad = shadowPadding(ds);
  const r = el.radius ?? Math.min(el.bounds.width, el.bounds.height) / 2;
  const size = r * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size + pad * 2;
  canvas.height = size + pad * 2;
  const ctx = canvas.getContext('2d')!;
  applyShadowToCtx(ctx, ds);
  ctx.fillStyle = el.color ? el.color.replace(/^0x/, '#') : '#FFFFFF';
  ctx.beginPath();
  ctx.arc(pad + r, pad + r, r, 0, Math.PI * 2);
  ctx.fill();
  return { dataUrl: canvas.toDataURL('image/png'), pad };
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
  renderEngraveFrameEffect(ctx, { x: 0, y: 0, width: w, height: h }, el.engraveFrame!);

  return canvas.toDataURL('image/png');
}

function StudioApp() {
  const { state, dispatch } = useApp();
  const [watchModel, setWatchModel] = useState('Balance 2');
  const [watchFaceName, setWatchFaceName] = useState('');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showAddElement, setShowAddElement] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [addElType, setAddElType] = useState<WatchFaceElement['type']>('TEXT');
  const [iconLibraryKey, setIconLibraryKey] = useState(0);
  const [customHandStyles, setCustomHandStyles] = useState<CustomHandRecord[]>([]);
  const [addElDataType, setAddElDataType] = useState('HEART');
  const [addElSubtype, setAddElSubtype] = useState<string>('');
  const [addElShapeType, setAddElShapeType] = useState<'circle' | 'fill_rect' | 'stroke_rect' | 'rounded_rect'>('circle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerParitySnapshotsRef = useRef<Partial<Record<PointerParityStage, ImageData>>>({});
  const pointerParityMissingAssetsRef = useRef<string[]>([]);
  const [pointerParityResult, setPointerParityResult] = useState<PointerParityResult | null>(null);
  const [pointerParityRunning, setPointerParityRunning] = useState(false);

  // Load custom icons + fonts from IndexedDB on startup and register them
  useEffect(() => {
    Promise.all([loadCustomIcons(), loadCustomFonts(), registerCustomFonts(), loadCustomHandStyles()]).then(
      ([icons, , loadedFontNames, hands]) => {
        if (icons.length > 0) registerCustomIconsInLibrary(icons);
        if (loadedFontNames.length > 0) registerCustomFontsInLibrary(loadedFontNames);
        if (hands.length > 0) setCustomHandStyles(hands);
        // Trigger PropertyPanel icon picker to re-fetch now that custom icons are registered
        if (icons.length > 0) setIconLibraryKey(k => k + 1);
      }
    );
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
    });
  }, []);

  const handleLabHandsSaved = useCallback(() => {
    loadCustomHandStyles().then(setCustomHandStyles);
  }, []);

  const registerPointerParitySnapshot = useCallback((stage: PointerParityStage, snapshot: ImageData | null) => {
    if (!snapshot) return;
    pointerParitySnapshotsRef.current[stage] = snapshot;
  }, []);

  const capturePointerParitySnapshotFromCanvas = useCallback((stage: PointerParityStage) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    registerPointerParitySnapshot(stage, ctx.getImageData(0, 0, canvas.width, canvas.height));
  }, [registerPointerParitySnapshot]);

  const runPointerParityVerification = useCallback(() => {
    setPointerParityRunning(true);
    try {
      const snapshots = pointerParitySnapshotsRef.current;
      const requiredStages: PointerParityStage[] = ['composer-preview', 'adjustment-preview', 'baked-export'];
      const missingStages = requiredStages.filter((stage) => !snapshots[stage]);

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
  }, []);

  useEffect(() => {
    pointerParitySnapshotsRef.current = {};
    pointerParityMissingAssetsRef.current = [];
    setPointerParityResult(null);
  }, [state.watchFaceConfig]);

  const handleAddElement = () => {
    if (!state.watchFaceConfig) return;
    const maxZ = state.watchFaceConfig.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const canvas = state.watchFaceConfig.resolution?.width ?? 480;
    const cx = Math.floor(canvas / 2);
    // Default sizes per type
    const defaults: Partial<Record<WatchFaceElement['type'], { w: number; h: number }>> = {
      TEXT: { w: 160, h: 50 },
      ARC_PROGRESS: { w: 400, h: 400 },
      TEXT_IMG: { w: 160, h: 50 },
      IMG: { w: 100, h: 100 },
      IMG_TIME: { w: 200, h: 80 },
      IMG_DATE: { w: 100, h: 50 },
      IMG_WEEK: { w: 120, h: 50 },
      IMG_LEVEL: { w: 60, h: 60 },
      IMG_STATUS: { w: 40, h: 40 },
      CIRCLE: { w: 80, h: 80 },
      BUTTON: { w: 120, h: 60 },
      TIME_POINTER: { w: canvas, h: canvas },
    };
    const { w = 120, h = 60 } = defaults[addElType] ?? {};
    const x = addElType === 'ARC_PROGRESS' || addElType === 'TIME_POINTER' ? 0 : cx - Math.floor(w / 2);
    const y = addElType === 'ARC_PROGRESS' || addElType === 'TIME_POINTER' ? 0 : Math.floor(canvas * 0.4) - Math.floor(h / 2);
    const needsDataType = addElType === 'ARC_PROGRESS' || addElType === 'TEXT_IMG' || addElType === 'IMG_LEVEL';
    const isStatus = addElType === 'IMG_STATUS';
    const isArc = addElType === 'ARC_PROGRESS';
    const newEl: WatchFaceElement = {
      id: generateId(),
      type: addElType,
      ...(addElSubtype ? { subtype: addElSubtype } : {}),
      name: addElSubtype
        ? addElSubtype.charAt(0).toUpperCase() + addElSubtype.slice(1)
        : (needsDataType || isStatus ? addElDataType.charAt(0) + addElDataType.slice(1).toLowerCase() : addElType),
      bounds: { x, y, width: w, height: h },
      visible: true,
      zIndex: maxZ + 1,
      ...(needsDataType ? { dataType: addElDataType } : {}),
      ...(isStatus ? { statusType: addElDataType } : {}),
      ...(isArc ? { startAngle: -90, endAngle: 270, radius: 190, lineWidth: 10, color: '#00CC88' } : {}),
      ...(addElType === 'TIME_POINTER' ? { center: { x: cx, y: cx } } : {}),
      ...(addElType === 'TEXT' ? { text: 'Text', fontSize: 36, color: '#FFFFFF' } : {}),
      ...(addElType === 'CIRCLE' ? { shapeType: addElShapeType, color: '0xFFFFFF', ...(addElShapeType === 'rounded_rect' ? { shapeCornerRadius: 12 } : {}) } : {}),
    };
    dispatch({ type: 'ADD_ELEMENT', payload: newEl });
    setSelectedElementId(newEl.id);
    setShowAddElement(false);
    toast.success(`Added ${newEl.name}`);
  };

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
    dispatch({ type: 'ADD_ELEMENT', payload: frameEl });
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id: parent.id, changes: { frameElementId: frameId } } });
    setSelectedElementId(frameId);
    toast.success('Frame added');
  };

  const handleRemoveFrame = (parent: WatchFaceElement) => {
    if (!parent.frameElementId) return;
    dispatch({ type: 'DELETE_ELEMENT', payload: parent.frameElementId });
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id: parent.id, changes: { frameElementId: undefined } } });
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
  }, [dispatchRef]);

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

  // Spec 012 — unified design input tab
  const [designTab, setDesignTab] = useState<'image' | 'html'>('image');
  const [htmlInput, setHtmlInput] = useState('');

  // Spec 011 — Background crop tool
  const [cropFile, setCropFile] = useState<File | null>(null);

  // Publish flow
  const [uploadedWatchfaceId, setUploadedWatchfaceId] = useState<string>('');
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [publishedEntry, setPublishedEntry] = useState<CatalogEntry | null>(null);
  const [specGroups, setSpecGroups] = useState<Record<string, SpecGroup>>({});
  const [regenQrLoading, setRegenQrLoading] = useState(false);

  // Fetch specGroups.json from GitHub Pages whenever repo changes
  useEffect(() => {
    if (!state.githubRepo) return;
    const [owner, repo] = state.githubRepo.split('/');
    if (!owner || !repo) return;
    fetch(`https://${owner}.github.io/${repo}/specGroups.json`)
      .then((r) => r.ok ? r.json() : {})
      .then((data) => setSpecGroups(data as Record<string, SpecGroup>))
      .catch(() => setSpecGroups({}));
  }, [state.githubRepo]);

  const openCropTool = (file: File) => { setCropFile(file); };

  const handleCropConfirm = (dataUrl: string) => {
    dispatch(actions.setBackgroundImage(dataUrl));
    // Convert cropped data URL to File so buildZPK gets the cropped version
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    console.log('[Crop] Converted data URL → Uint8Array, size:', u8.length, 'mime:', mime, 'PNG magic:', u8[0] === 137 && u8[1] === 80);
    const croppedFile = new File([u8], 'background.png', { type: mime });
    console.log('[Crop] Created File:', croppedFile.name, 'size:', croppedFile.size);
    dispatch(actions.setBackgroundFile(croppedFile));
    setCropFile(null);
  };

  const handleCropCancel = () => { setCropFile(null); };

  // Spec 023 — Background photo editor
  // T037: showPhotoEditor flag controls modal visibility
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);

  // T042: on Save → dispatch edited image to state (also rebuild backgroundFile)
  const handlePhotoEditorSave = (dataUrl: string) => {
    dispatch(actions.setBackgroundImage(dataUrl));
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    dispatch(actions.setBackgroundFile(new File([u8], 'background.png', { type: mime })));
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

  // T020–T022: HTML-driven pipeline — no AI, DOM → elements → generator
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

  // Handle regenerate ZPK (local download, no GitHub upload)
  // Handle generate ZPK
  const handleGenerate = useCallback(async () => {
    console.log('[App] handleGenerate called');

    // Deselect any selected element so the selection rectangle doesn't appear in the preview
    setSelectedElementId(null);
    // Temporarily hide grid so it doesn't appear in the preview screenshot
    const gridWasOn = showGrid;
    if (gridWasOn) setShowGrid(false);
    // Wait two animation frames for InteractiveCanvas to redraw without selection + grid
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    // Capture canvas screenshot FIRST before step change unmounts the canvas
    let previewDataUrl: string | null = null;
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        previewDataUrl = canvas.toDataURL('image/png');
        setPreviewImageUrl(previewDataUrl);
        console.log('[App] Canvas screenshot captured, size:', previewDataUrl.length);
        capturePointerParitySnapshotFromCanvas('composer-preview');
      }
    } catch (e) {
      console.warn('[App] Canvas capture failed (tainted?), falling back to backgroundImage', e);
      previewDataUrl = state.backgroundImage;
      if (previewDataUrl) setPreviewImageUrl(previewDataUrl);
    }

    // Restore grid after capture
    if (gridWasOn) setShowGrid(true);

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

    if (!state.githubToken) {
      console.log('[App] ERROR: Missing githubToken');
      toast.error('Please set your GitHub token in settings');
      return;
    }

    console.log('[App] All checks passed, starting generation...');
    console.log('[App] Background file:', state.backgroundFile.name, 'size:', state.backgroundFile.size);

    dispatch(actions.setLoading(true));
    dispatch(actions.setLoadingMessage('Generating ZPK file...'));
    dispatch(actions.setStep('generating'));

    try {
      pointerParityMissingAssetsRef.current = [];

      // Build ZPK using File objects
      console.log('[App] Calling buildZPK...');
      
      // Convert elementImages from dataUrl to File objects
      const elementFiles = state.elementImages.map((img) => {
        console.log('[App] Converting element image to file:', img.name);
        
        // Parse data URL properly
        const parts = img.dataUrl.split(',');
        const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(parts[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        const blob = new Blob([u8arr], { type: mimeType });
        
        console.log('[App] Converted', img.name, 'size:', blob.size);
        return {
          src: img.name,
          file: new File([blob], img.name, { type: mimeType }),
        };
      });
      
      console.log('[App] Element files prepared:', { count: elementFiles.length, files: elementFiles.map(f => f.src) });
      
      if (elementFiles.length === 0) {
        console.warn('[App] WARNING: No element files were prepared!');
      }

      // Regenerate digit images with current element colors + font styles.
      // This replaces any stale images from initial generation so UI choices reach the device.
      const freshDigits = regenerateDigitFilesFromElements(state.watchFaceConfig.elements);
      for (const { filename, dataUrl } of freshDigits) {
        const p0 = dataUrl.split(',');
        const b0 = atob(p0[1]);
        const u0 = new Uint8Array(b0.length);
        for (let i = 0; i < b0.length; i++) u0[i] = b0.charCodeAt(i);
        const existing = elementFiles.findIndex(f => f.src === filename);
        const newFile = { src: filename, file: new File([u0], filename, { type: 'image/png' }) };
        if (existing >= 0) elementFiles[existing] = newFile;
        else elementFiles.push(newFile);
      }
      console.log('[App] Digit images regenerated with current colors/fonts:', freshDigits.length, 'files updated');

      // Pre-warm Tabler icon cache so getIconByKey works synchronously for tabler:* keys
      if (state.watchFaceConfig.elements.some(el => el.iconKey?.startsWith('tabler:'))) {
        dispatch(actions.setLoadingMessage('Warming icon cache...'));
        const { buildTablerLibrary } = await import('@/lib/tablerIconRenderer');
        await buildTablerLibrary();
      }

      // Inject icon assets for elements with iconKey.
      // Apply icon visual effects (hue, saturation, colorize) so what you see = what ships.
      for (const el of state.watchFaceConfig.elements) {
        if (el.iconKey) {
          const iconEntry = getIconByKey(el.iconKey);
          if (iconEntry) {
            const safeKey = el.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `icon_${safeKey}.png`;
            const hasEffects = (el.iconHue ?? 0) !== 0 || (el.iconSaturation ?? 100) !== 100 || !!el.iconColorize;
            const finalDataUrl = hasEffects
              ? await applyIconEffectsForZPK(iconEntry.dataUrl, el, el.bounds.width || 48, el.bounds.height || 48)
              : iconEntry.dataUrl;
            const p = finalDataUrl.split(',');
            const b = atob(p[1]);
            const u8 = new Uint8Array(b.length);
            for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
            elementFiles.push({ src: filename, file: new File([u8], filename, { type: 'image/png' }) });
          }
        }
      }

      // Inject curved text PNGs for TEXT elements with curvedText
      for (const el of state.watchFaceConfig.elements) {
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
          const p2 = dataUrl.split(',');
          const b2 = atob(p2[1]);
          const u2 = new Uint8Array(b2.length);
          for (let i = 0; i < b2.length; i++) u2[i] = b2.charCodeAt(i);
          elementFiles.push({ src: filename, file: new File([u2], filename, { type: 'image/png' }) });
        }
      }

      // Build a stable export config snapshot so all bakes/generation use the same element state.
      // This prevents preview/export drift (especially for custom-hand pivots and cover fallback).
      const exportElements = state.watchFaceConfig.elements.map(el => ({
        ...el,
        bounds: { ...el.bounds },
        ...(el.center ? { center: { ...el.center } } : {}),
        ...(el.pointerCenter ? { pointerCenter: { ...el.pointerCenter } } : {}),
        ...(el.hourPos ? { hourPos: { ...el.hourPos } } : {}),
        ...(el.minutePos ? { minutePos: { ...el.minutePos } } : {}),
        ...(el.secondPos ? { secondPos: { ...el.secondPos } } : {}),
      }));
      const configForBuild: WatchFaceConfig = {
        ...state.watchFaceConfig,
        elements: exportElements,
      };

      // Inject engrave/emboss frame PNGs for FILL_RECT elements with engraveFrame
      for (const el of exportElements) {
        if (el.type === 'FILL_RECT' && el.engraveFrame) {
          const safeName = el.name.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `frame_${safeName}.png`;
          const dataUrl = renderEngraveFrameToPng(el);
          const pf = dataUrl.split(',');
          const bf = atob(pf[1]);
          const uf = new Uint8Array(bf.length);
          for (let i = 0; i < bf.length; i++) uf[i] = bf.charCodeAt(i);
          elementFiles.push({ src: filename, file: new File([uf], filename, { type: 'image/png' }) });
        }
      }

      // ── Drop-shadow baking for IMG / FILL_RECT / STROKE_RECT / CIRCLE ──
      for (const el of exportElements) {
        if (!el.dropShadow) continue;
        const safeName = el.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        let bakeResult: { dataUrl: string; pad: number } | null = null;

        if (el.type === 'IMG' && el.iconKey) {
          // Load the icon image (use effects-applied version if present in elementFiles)
          const safeKey = el.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_');
          const existingFile = elementFiles.find(f => f.src === `icon_${safeKey}.png`);
          if (existingFile) {
            const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              const reader = new FileReader();
              reader.onload = () => { img.src = reader.result as string; };
              reader.readAsDataURL(existingFile.file);
            });
            bakeResult = renderImgWithShadowToPng(el, imgEl);
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
          const pf = bakeResult.dataUrl.split(',');
          const bf = atob(pf[1]);
          const uf = new Uint8Array(bf.length);
          for (let i = 0; i < bf.length; i++) uf[i] = bf.charCodeAt(i);
          elementFiles.push({ src: filename, file: new File([uf], filename, { type: 'image/png' }) });
        }
      }

      // Inject clock hand images for TIME_POINTER elements
      // Always regenerate from current handStyle so the actual selected style is baked in.
      const timePointerEl = exportElements.find(el => el.type === 'TIME_POINTER');
      const missingPointerAssets: string[] = [];
      if (timePointerEl) {
        if (timePointerEl.handStyle?.startsWith('custom_hand:')) {
          const customHand = await getCustomHandByKey(timePointerEl.handStyle);
          if (customHand) {
            if (!timePointerEl.hourPos && typeof customHand.hourPosX === 'number' && typeof customHand.hourPosY === 'number') {
              timePointerEl.hourPos = { x: customHand.hourPosX, y: customHand.hourPosY };
            }
            if (!timePointerEl.minutePos && typeof customHand.minutePosX === 'number' && typeof customHand.minutePosY === 'number') {
              timePointerEl.minutePos = { x: customHand.minutePosX, y: customHand.minutePosY };
            }
            if (!timePointerEl.secondPos && typeof customHand.secondPosX === 'number' && typeof customHand.secondPosY === 'number') {
              timePointerEl.secondPos = { x: customHand.secondPosX, y: customHand.secondPosY };
            }
            if (!timePointerEl.coverSrc) {
              timePointerEl.coverSrc = 'hand_cover.png';
            }
            const resolvedPack = resolveCustomHandPack(customHand);
            const handFiles = [
              { name: 'hour_hand.png', dataUrl: resolvedPack?.sources.hour ?? customHand.hourDataUrl },
              { name: 'minute_hand.png', dataUrl: resolvedPack?.sources.minute ?? customHand.minuteDataUrl },
              { name: 'second_hand.png', dataUrl: resolvedPack?.sources.second ?? customHand.secondDataUrl },
              { name: 'hand_cover.png', dataUrl: resolvedPack?.sources.cover ?? customHand.coverDataUrl },
            ];
            for (const { name, dataUrl } of handFiles) {
              if (!dataUrl) {
                console.warn('[App] Missing custom hand layer for export:', name, 'style:', timePointerEl.handStyle);
                missingPointerAssets.push(`baked-export:${name} (${timePointerEl.handStyle})`);
                continue;
              }
              const layer = name.startsWith('hour_')
                ? 'hour'
                : name.startsWith('minute_')
                  ? 'minute'
                  : name.startsWith('second_')
                    ? 'second'
                    : 'cover';
              const effectedDataUrl = await applyPointerEffectsForZPK(dataUrl, timePointerEl, layer);
              const p = effectedDataUrl.split(',');
              const b = atob(p[1]);
              const u8 = new Uint8Array(b.length);
              for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
              const newFile = { src: name, file: new File([u8], name, { type: 'image/png' }) };
              const idx = elementFiles.findIndex(f => f.src === name);
              if (idx >= 0) elementFiles[idx] = newFile;
              else elementFiles.push(newFile);
            }
            console.log('[App] Injected custom hand images for style:', timePointerEl.handStyle);
          }
        } else {
          // Built-in hand style — always regenerate so style changes are reflected
          const hs = (timePointerEl.handStyle ?? 'silver') as HandStyleKey;
          if (!timePointerEl.coverSrc) {
            timePointerEl.coverSrc = 'hand_cover.png';
          }
          const handSet = generateHandSet(hs);
          const builtInHandFiles = [
            { name: 'hour_hand.png', dataUrl: handSet.hourHand },
            { name: 'minute_hand.png', dataUrl: handSet.minuteHand },
            { name: 'second_hand.png', dataUrl: handSet.secondHand },
            { name: 'hand_cover.png', dataUrl: handSet.cover },
          ];
          for (const { name, dataUrl } of builtInHandFiles) {
            const layer = name.startsWith('hour_')
              ? 'hour'
              : name.startsWith('minute_')
                ? 'minute'
                : name.startsWith('second_')
                  ? 'second'
                  : 'cover';
            const effectedDataUrl = await applyPointerEffectsForZPK(dataUrl, timePointerEl, layer);
            const p = effectedDataUrl.split(',');
            const b = atob(p[1]);
            const u8 = new Uint8Array(b.length);
            for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
            const newFile = { src: name, file: new File([u8], name, { type: 'image/png' }) };
            const idx = elementFiles.findIndex(f => f.src === name);
            if (idx >= 0) elementFiles[idx] = newFile;
            else elementFiles.push(newFile);
          }
          console.log('[App] Regenerated built-in hand images for style:', hs);
        }
      }
      pointerParityMissingAssetsRef.current = missingPointerAssets;

      // Capture adjustment-stage snapshot after export-side element/asset preparation.
      capturePointerParitySnapshotFromCanvas('adjustment-preview');

      const zpkResult = await buildZPK({
        config: configForBuild,
        backgroundFile: state.backgroundFile,
        elementFiles,
      });
      console.log('[App] ZPK built successfully, size:', zpkResult.size);

      // Capture baked-export stage snapshot once export build is complete.
      capturePointerParitySnapshotFromCanvas('baked-export');

      dispatch(actions.setZpkBlob(zpkResult.blob));

      // Upload to GitHub with folder-based structure
      dispatch(actions.setLoadingMessage('Uploading to GitHub...'));

      const repoParts = state.githubRepo.split('/');
      const owner = repoParts[0];
      const repo = repoParts[1];
      
      console.log('[App] GitHub repo split:', { original: state.githubRepo, owner, repo, parts: repoParts });
      
      if (!owner || !repo || repoParts.length !== 2) {
        throw new Error(`Invalid GitHub repository format: "${state.githubRepo}". Expected format: "owner/repo"`);
      }

      // Step 1: Generate QR code with the expected GitHub Pages URL
      //  We use the watchface ID (timestamp-based) to create a predictable URL
      const watchfaceId = state.watchFaceConfig.name.replace(/\s+/g, '_');
      setUploadedWatchfaceId(watchfaceId);
      const expectedZpkUrl = `https://${owner}.github.io/${repo}/zpk/${watchfaceId}/face.zpk`;
      
      dispatch(actions.setLoadingMessage('Generating QR code...'));
      console.log('[App] Generating QR with expected URL:', expectedZpkUrl);
      const qrDataUrl = await generateQRCode(expectedZpkUrl);
      console.log('[App] QR code generated');

      // Build source.json for safe future regeneration
      const sourceBlob = sourceJsonToBlob(buildSourceJson(withNormalizedPointerEffects(state.watchFaceConfig)));

      // Step 2: Upload both ZPK and QR code to the same folder on GitHub
      console.log('[App] Starting folder-based upload (ZPK + QR)...');
      const uploadResult = await uploadZPKWithQR(
        {
          token: state.githubToken,
          owner,
          repo,
        },
        watchfaceId,
        zpkResult.blob,
        qrDataUrl,
        state.watchFaceConfig.name,
        previewDataUrl ?? undefined,
        sourceBlob
      );

      if (!uploadResult.success) {
        console.error('[App] Upload error:', uploadResult.error);
        throw new Error(`GitHub upload failed: ${uploadResult.error || 'Unknown error'}`);
      }
      
      console.log('[App] Upload successful!');
      console.log('[App] ZPK URL:', uploadResult.downloadUrl);
      console.log('[App] QR URL:', uploadResult.qrUrl);

      dispatch(actions.setGithubUrl(uploadResult.downloadUrl || ''));
      dispatch(actions.setQrCode(qrDataUrl));
      dispatch(actions.setStep('success'));
      toast.success('Watch face created successfully!');
    } catch (error) {
      console.error('[App] Generation failed with error:', error);
      if (error instanceof Error) {
        console.error('[App] Error stack:', error.stack);
      }
      toast.error('Generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      dispatch(actions.setStep('preview'));
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [state.watchFaceConfig, state.backgroundFile, state.backgroundImage, state.githubToken, state.githubRepo, dispatch, capturePointerParitySnapshotFromCanvas]);

  // Handle reset
  const handleReset = useCallback(() => {
    dispatch(actions.reset());
    setWatchFaceName('');
    setUploadedWatchfaceId('');
    setShowPublishForm(false);
    setPublishedEntry(null);
    setRegenQrLoading(false);
    toast.info('Started new watch face');
  }, [dispatch]);

  // Toggle element visibility
  const handleToggleElement = useCallback(
    (id: string) => {
      if (!state.watchFaceConfig) return;

      const updatedElements = state.watchFaceConfig.elements.map((el) =>
        el.id === id ? { ...el, visible: !el.visible } : el
      );

      dispatch(
        actions.setWatchFaceConfig({
          ...state.watchFaceConfig,
          elements: updatedElements,
        })
      );
    },
    [state.watchFaceConfig, dispatch]
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
                  {/* User's requested models - Balance 2 as default */}
                  <option value="Balance 2">⭐ Amazfit Balance 2 (480×480)</option>
                  <option value="Balance">Amazfit Balance (480×480)</option>
                  <option value="Active Max">Amazfit Active Max (480×480)</option>
                  <option value="Active 3 Premium">Amazfit Active 3 Premium (466×466)</option>
                  <option value="Active 2 Round">Amazfit Active 2 Round (466×466)</option>
                  <option value="Active 2 Square">Amazfit Active 2 Square (390×450)</option>
                  <option value="Active">Amazfit Active (390×450)</option>
                  <option value="Pop 3S (PIB)">Amazfit Pop 3S / PIB (410×502)</option>
                  {/* Original models */}
                  <option value="GTR4">Amazfit GTR 4 (466×466)</option>
                  <option value="GTS4">Amazfit GTS 4 (390×450)</option>
                  <option value="Cheetah Pro">Amazfit Cheetah Pro (466×466)</option>
                  <option value="T-Rex 2">Amazfit T-Rex 2 (454×454)</option>
                  <option value="Falcon">Amazfit Falcon (416×416)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-zinc-300">Watch Face Name (optional)</Label>
                <Input
                  value={watchFaceName}
                  onChange={(e) => setWatchFaceName(e.target.value.trim())}
                  placeholder="My Custom Watch Face"
                  className="bg-[#0F0F0F] border-zinc-700 text-white placeholder:text-zinc-600"
                />
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

            {/* Background upload — always visible */}
            <UploadZone
              label="Background Image"
              sublabel="Any size — crop to fit"
              value={state.backgroundImage}
              onFileChange={(file) => { dispatch(actions.setBackgroundFile(file)); if (file) openCropTool(file); }}
            />
            {/* T038/T039: Edit Photo button — visible only when a background image is loaded */}
            {state.backgroundImage && (
              <button
                onClick={() => setShowPhotoEditor(true)}
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

            {/* Action button */}
            <Button
              onClick={designTab === 'image' ? handleAnalyze : handleLoadLayout}
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
              ) : (
                <>{'</>'} Load Layout</>
              )}
              <ArrowRight className="h-5 w-5 ml-2" />
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
          <div className="space-y-6">
            {state.backgroundImage && state.watchFaceConfig && (
              <>
                {/* Interactive canvas + property panel */}
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex items-center justify-between w-full max-w-sm mb-4">
                      <h4 className="text-sm font-medium text-zinc-400">Live Editor — drag to reposition</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => dispatch({ type: 'UNDO' })}
                          disabled={state.undoStack.length === 0}
                          className="p-1.5 rounded-lg border transition-colors bg-white/5 border-white/10 text-white/40 disabled:opacity-30"
                          title="Undo (Ctrl+Z)"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'REDO' })}
                          disabled={state.redoStack.length === 0}
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
                    <InteractiveCanvas
                      ref={canvasRef}
                      backgroundImage={state.backgroundImage}
                      elements={state.watchFaceConfig.elements}
                      selectedElementId={selectedElementId}
                      onSelectElement={setSelectedElementId}
                      onUpdateElement={(id, changes) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id, changes } })}
                      onAddElement={(el) => {
                        dispatch({ type: 'ADD_ELEMENT', payload: el });
                        setSelectedElementId(el.id);
                      }}
                      showGrid={showGrid}
                      className="w-full max-w-sm"
                      customHandStyles={customHandStyles}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <h4 className="text-sm font-medium text-zinc-400">Properties</h4>
                    <PropertyPanel
                      element={state.watchFaceConfig.elements.find(el => el.id === selectedElementId) ?? null}
                      onUpdateElement={(id, changes) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id, changes } })}
                      elements={state.watchFaceConfig.elements}
                      onAddFrame={handleAddFrame}
                      onRemoveFrame={handleRemoveFrame}
                      iconLibraryKey={iconLibraryKey}
                      customHandStyles={customHandStyles}
                    />
                    <div className="flex items-center justify-between mt-4">
                      <h4 className="text-sm font-medium text-zinc-400">Elements</h4>
                      <button
                        onClick={() => setShowAddElement(true)}
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 rounded px-2 py-1 transition-colors"
                        title="Add a new element"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                    <ElementList
                      elements={state.watchFaceConfig.elements}
                      onToggleVisibility={handleToggleElement}
                      selectedElementId={selectedElementId}
                      onSelectElement={setSelectedElementId}
                      onDeleteElement={(id) => {
                        dispatch({ type: 'DELETE_ELEMENT', payload: id });
                        if (selectedElementId === id) setSelectedElementId(null);
                      }}
                    />
                  </div>
                </div>

                {/* Studio Lab drawer */}
                <IconLab
                  open={labOpen}
                  onClose={() => { setLabOpen(false); handleLabIconsSaved(); handleLabHandsSaved(); }}
                  onIconsSaved={handleLabIconsSaved}
                  onFontsSaved={handleLabFontsSaved}
                  onHandsSaved={handleLabHandsSaved}
                />

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
                      {(addElType === 'ARC_PROGRESS' || addElType === 'TEXT_IMG' || addElType === 'IMG_LEVEL') && (
                        <div>
                          <p className="text-xs text-zinc-400 mb-2">Data type</p>
                          <select
                            value={addElDataType}
                            onChange={(e) => setAddElDataType(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded px-2 py-1.5"
                          >
                            {[
                              { value: 'BATTERY',        label: 'Battery %'              },
                              { value: 'STEP',           label: 'Step Count'             },
                              { value: 'HEART',          label: 'Heart Rate'             },
                              { value: 'SPO2',           label: 'Blood Oxygen'           },
                              { value: 'CAL',            label: 'Calories'               },
                              { value: 'DISTANCE',       label: 'Distance'               },
                              { value: 'STRESS',         label: 'Stress Level'           },
                              { value: 'PAI_WEEKLY',     label: 'PAI (Weekly)'           },
                              { value: 'SLEEP',          label: 'Sleep Duration'         },
                              { value: 'TRAINING_LOAD',  label: 'Training Load'          },
                              { value: 'VO2MAX',         label: 'VO2 Max'                },
                              { value: 'ALTIMETER',      label: 'Altitude'               },
                              { value: 'UVI',            label: 'UV Index'               },
                              { value: 'AQI',            label: 'Air Quality'            },
                              { value: 'SUN_RISE',       label: 'Sunrise Time'           },
                              { value: 'WEATHER_CURRENT',label: 'Weather Icon (sensor on device)' },
                            ].map(dt => (
                              <option key={dt.value} value={dt.value}>{dt.label}</option>
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
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                onClick={handleGenerate}
                className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Generate ZPK & Upload
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
                Uploading to GitHub
              </div>
            </div>
          </div>
        );

      case 'success': {
        const [owner, repo] = state.githubRepo.split('/');
        const ghConfig = { token: state.githubToken, owner, repo };
        const baseUrl = `https://${owner}.github.io/${repo}`;
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

            {/* Regenerate QR button */}
            {uploadedWatchfaceId && (
              <Button
                onClick={async () => {
                  setRegenQrLoading(true);
                  const result = await regenerateSingleQR(ghConfig, uploadedWatchfaceId, baseUrl);
                  if (result.success && result.qrDataUrl) {
                    dispatch(actions.setQrCode(result.qrDataUrl));
                    toast.success('QR code regenerated!');
                  } else {
                    toast.error('QR regen failed: ' + (result.error ?? 'unknown'));
                  }
                  setRegenQrLoading(false);
                }}
                disabled={regenQrLoading}
                variant="outline"
                className="w-full h-10 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regenQrLoading ? 'animate-spin' : ''}`} />
                {regenQrLoading ? 'Regenerating QR…' : 'Regenerate QR Code'}
              </Button>
            )}

            {/* Publish flow */}
            {publishedEntry ? (
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
                githubConfig={ghConfig}
                apiVersion="v3"
                specGroups={specGroups}
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

      <main className="container mx-auto max-w-4xl px-4 py-6">
        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator currentStep={state.currentStep} />
        </div>

        {/* Main content card */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-zinc-800 p-6">
          {renderContent()}
        </div>

        {/* Admin panel — visible only when GitHub token is configured */}
        {state.githubToken && (() => {
          const [owner, repo] = state.githubRepo.split('/');
          return (
            <AdminPanel
              githubConfig={{ token: state.githubToken, owner, repo }}
              defaultBaseUrl={`https://${owner}.github.io/${repo}`}
            />
          );
        })()}

        {/* Studio Lab drawer — icon & font creator */}
        <IconLab
          open={labOpen}
          onClose={() => { setLabOpen(false); handleLabIconsSaved(); handleLabHandsSaved(); }}
          onIconsSaved={handleLabIconsSaved}
          onFontsSaved={handleLabFontsSaved}
          onHandsSaved={handleLabHandsSaved}
        />

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

      {/* Spec 023 — Background photo editor modal (T040–T043) */}
      {showPhotoEditor && state.backgroundImage && (
        <BackgroundPhotoEditor
          sourceDataUrl={state.backgroundImage}
          onSave={handlePhotoEditorSave}
          onCancel={handlePhotoEditorClose}
        />
      )}

      {/* Spec 011 — Background crop tool modal */}
      <Dialog open={!!cropFile} onOpenChange={(open) => { if (!open) handleCropCancel(); }}>
        <DialogContent className="max-w-[560px] bg-[#1a1a1a] border-zinc-700 p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-white text-sm font-medium">Crop Background Image</DialogTitle>
          </DialogHeader>
          {cropFile && (
            <BackgroundCropTool
              file={cropFile}
              onConfirm={handleCropConfirm}
              onCancel={handleCropCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudioApp;
