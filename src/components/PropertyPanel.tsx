import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WatchFaceElement } from '@/types';
import { getIconLibrary, getFullIconLibrary } from '@/lib/iconLibrary';
import type { IconEntry } from '@/lib/iconLibrary';
import { cn } from '@/lib/utils';
import { FONT_STYLES, getFontStyle } from '@/lib/fontLibrary';
import { WEATHER_STYLES, generateWeatherSet } from '@/lib/weatherIconSets';
import type { WeatherStyle } from '@/lib/weatherIconSets';
import { HAND_STYLES } from '@/lib/handStyles';
import type { CustomHandRecord } from '@/lib/customHandStore';
import { useState, useEffect, useRef } from 'react';

export interface PropertyPanelProps {
  element: WatchFaceElement | null;
  onUpdateElement?: (id: string, changes: Partial<WatchFaceElement>) => void;
  className?: string;
  elements?: WatchFaceElement[];
  onAddFrame?: (parent: WatchFaceElement) => void;
  onRemoveFrame?: (parent: WatchFaceElement) => void;
  iconLibraryKey?: number; // increment to force icon list refresh
  customHandStyles?: CustomHandRecord[]; // user-created hand styles from IconLab
}

const WIDGET_TYPES: WatchFaceElement['type'][] = [
  'ARC_PROGRESS', 'TIME_POINTER', 'IMG_TIME', 'IMG_DATE', 'IMG_WEEK',
  'TEXT_IMG', 'IMG', 'TEXT',
  'IMG_LEVEL', 'IMG_STATUS', 'CIRCLE', 'BUTTON',
];

const DATA_TYPES: { value: string; label: string }[] = [
  { value: 'BATTERY',       label: 'Battery %'        },
  { value: 'STEP',          label: 'Step Count'        },
  { value: 'HEART',         label: 'Heart Rate'        },
  { value: 'SPO2',          label: 'Blood Oxygen'      },
  { value: 'CAL',           label: 'Calories'          },
  { value: 'DISTANCE',      label: 'Distance'          },
  { value: 'STRESS',        label: 'Stress Level'      },
  { value: 'PAI_WEEKLY',    label: 'PAI (Weekly)'      },
  { value: 'SLEEP',         label: 'Sleep Duration'    },
  { value: 'TRAINING_LOAD', label: 'Training Load'     },
  { value: 'VO2MAX',        label: 'VO2 Max'           },
  { value: 'ALTIMETER',     label: 'Altitude'          },
  { value: 'UVI',           label: 'UV Index'          },
  { value: 'AQI',           label: 'Air Quality'       },
  { value: 'SUN_RISE',      label: 'Sunrise Time'      },
  { value: 'WEATHER_CURRENT', label: 'Weather (preview only)' },
];

const APP_SHORTCUTS = [
  { value: '', label: '— none —' },
  { value: 'HeartRate', label: 'Heart Rate' },
  { value: 'Sport', label: 'Exercise' },
  { value: 'Weather', label: 'Weather' },
  { value: 'Alarm', label: 'Alarm' },
  { value: 'Settings', label: 'Settings' },
  { value: 'Music', label: 'Music' },
  { value: 'Notification', label: 'Notifications' },
  { value: 'StopWatch', label: 'Stopwatch' },
  { value: 'Timer', label: 'Timer' },
  { value: 'Compass', label: 'Compass' },
  { value: 'Barometer', label: 'Barometer' },
  { value: 'WorldClock', label: 'World Clock' },
];

const TYPE_LABELS: Record<string, string> = {
  ARC_PROGRESS: 'Arc Progress',
  TIME_POINTER: 'Clock Hands',
  TEXT_IMG: 'Text Image',
  IMG: 'Image',
  IMG_TIME: 'Time Image',
  IMG_DATE: 'Date Image',
  IMG_WEEK: 'Week Image',
  IMG_LEVEL: 'Level Image',
  IMG_STATUS: 'Status Image',
  TEXT: 'Text',
  CIRCLE: 'Circle',
  BUTTON: 'Button',
};

// Module-level style clipboard — persists across element selections
interface StyleClipboard {
  color?: string;
  fontSize?: number;
  fontStyle?: string;
  radius?: number;
  lineWidth?: number;
  startAngle?: number;
  endAngle?: number;
}
let _styleClipboard: StyleClipboard | null = null;

export function PropertyPanel({ element, onUpdateElement, className, elements, onAddFrame, onRemoveFrame, iconLibraryKey, customHandStyles = [] }: PropertyPanelProps) {
  const [allIcons, setAllIcons] = useState<IconEntry[]>(() => getIconLibrary());
  const [iconSearch, setIconSearch] = useState('');
  const [clipboardHasData, setClipboardHasData] = useState(() => _styleClipboard !== null);
  const tablerLoadedRef = useRef(false);

  // Load Tabler icons lazily when an IMG element is selected
  useEffect(() => {
    if (element?.type !== 'IMG' || tablerLoadedRef.current) return;
    tablerLoadedRef.current = true;
    getFullIconLibrary().then(setAllIcons);
  }, [element?.type]);

  // Refresh icon list when new custom icons are saved (iconLibraryKey increments)
  useEffect(() => {
    if (!iconLibraryKey) return;
    getFullIconLibrary().then(setAllIcons);
  }, [iconLibraryKey]);

  if (!element) {
    return (
      <div className={`rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/40 ${className ?? ''}`}>
        Click element on canvas to edit
      </div>
    );
  }

  const update = (changes: Partial<WatchFaceElement>) => onUpdateElement?.(element.id, changes);

  // ── Frame element: show dedicated controls ──────────────────────────────
  if (element.engraveFrame) {
    const parentEl = elements?.find(e => e.id === element.engraveFrame!.frameOf);
    const parentName = parentEl?.name ?? 'element';
    const ef = element.engraveFrame;
    const isLinked = ef.linked !== false;
    const updateFrame = (patch: Partial<WatchFaceElement['engraveFrame'] & object>) =>
      update({ engraveFrame: { ...ef, ...patch } });

    const handleLinkToggle = (nowLinked: boolean) => {
      if (nowLinked && parentEl) {
        // Re-sync bounds to parent + padding immediately on re-link
        const pad = ef.padding;
        onUpdateElement?.(element.id, {
          engraveFrame: { ...ef, linked: true },
          bounds: {
            x: parentEl.bounds.x - pad,
            y: parentEl.bounds.y - pad,
            width: parentEl.bounds.width + pad * 2,
            height: parentEl.bounds.height + pad * 2,
          },
        });
      } else {
        updateFrame({ linked: false });
      }
    };

    return (
      <div className={`rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-4 ${className ?? ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">⬚ Frame Effect</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLinkToggle(!isLinked)}
              title={isLinked ? 'Unlink from parent (move independently)' : 'Re-link to parent (auto-sync position)'}
              className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors',
                isLinked
                  ? 'border-amber-500/50 text-amber-400 hover:border-amber-400'
                  : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/60'
              )}
            >
              {isLinked ? '🔗' : '⛓️‍💥'} {isLinked ? parentName : 'Unlinked'}
            </button>
          </div>
        </div>

        {/* Mode */}
        <Section label="Mode">
          <div className="flex gap-1.5">
            {(['inner', 'outer'] as const).map(m => (
              <button key={m} onClick={() => updateFrame({ mode: m })}
                className={cn('flex-1 h-7 rounded border text-[11px] transition-colors',
                  ef.mode === m ? 'border-amber-500 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                )}>
                {m === 'inner' ? 'Engrave' : 'Emboss'}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-white/30 mt-1">{ef.mode === 'inner' ? 'Inset — sunken into surface' : 'Raised — lifted out of surface'}</p>
        </Section>

        {/* Depth */}
        <Section label={`Depth (${typeof ef.depth === 'number' ? ef.depth : 6})`}>
          <input
            type="range" min={1} max={20}
            value={typeof ef.depth === 'number' ? ef.depth : 6}
            onChange={e => updateFrame({ depth: Number(e.target.value) })}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[9px] text-white/25 mt-0.5"><span>Subtle</span><span>Deep</span></div>
        </Section>

        {/* Light Direction */}
        <Section label={`Light Direction (${ef.lightAngle ?? 135}°)`}>
          <input
            type="range" min={0} max={359}
            value={ef.lightAngle ?? 135}
            onChange={e => updateFrame({ lightAngle: Number(e.target.value) })}
            className="w-full accent-amber-500"
          />
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {[{label:'↖ TL', v:225},{label:'↗ TR', v:315},{label:'↙ BL', v:135},{label:'↘ BR', v:45}].map(p => (
              <button key={p.v} onClick={() => updateFrame({ lightAngle: p.v })}
                className={cn('h-6 rounded border text-[10px] transition-colors',
                  (ef.lightAngle ?? 135) === p.v ? 'border-amber-500 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-white/40 hover:border-white/30'
                )}>{p.label}</button>
            ))}
          </div>
        </Section>

        {/* Highlight / Shadow Colors */}
        <Section label="Highlight Color">
          <div className="flex items-center gap-2">
            <input type="color" value={ef.highlightColor ?? '#FFFFFF'}
              onChange={e => updateFrame({ highlightColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
            <div className="flex-1">
              <input type="range" min={0} max={100}
                value={Math.round((ef.highlightOpacity ?? 0.6) * 100)}
                onChange={e => updateFrame({ highlightOpacity: Number(e.target.value) / 100 })}
                className="w-full accent-amber-500" />
              <div className="text-[9px] text-white/30 text-right">{Math.round((ef.highlightOpacity ?? 0.6) * 100)}%</div>
            </div>
          </div>
        </Section>

        <Section label="Shadow Color">
          <div className="flex items-center gap-2">
            <input type="color" value={ef.shadowColor ?? '#000000'}
              onChange={e => updateFrame({ shadowColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
            <div className="flex-1">
              <input type="range" min={0} max={100}
                value={Math.round((ef.shadowOpacity ?? 0.6) * 100)}
                onChange={e => updateFrame({ shadowOpacity: Number(e.target.value) / 100 })}
                className="w-full accent-amber-500" />
              <div className="text-[9px] text-white/30 text-right">{Math.round((ef.shadowOpacity ?? 0.6) * 100)}%</div>
            </div>
          </div>
        </Section>

        {/* Shape */}
        <Section label="Shape">
          <div className="grid grid-cols-3 gap-1">
            {(['rect', 'circle', 'rounded'] as const).map(s => (
              <button key={s} onClick={() => updateFrame({ shape: s })}
                className={cn('h-7 rounded border text-[11px] transition-colors capitalize',
                  (ef.shape ?? 'rect') === s ? 'border-amber-500 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                )}>
                {s === 'rect' ? 'Rectangle' : s === 'circle' ? 'Circle' : 'Rounded'}
              </button>
            ))}
          </div>
          {(ef.shape === 'rounded') && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-white/40 w-16 shrink-0">Corner R</span>
              <Input type="number" value={ef.cornerRadius ?? 12}
                onChange={e => updateFrame({ cornerRadius: Math.max(0, Math.min(100, Number(e.target.value))) })}
                className="h-7 text-xs bg-white/5 border-white/10 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <span className="text-[10px] text-white/30">px</span>
            </div>
          )}
        </Section>

        {/* Fill */}
        <Section label="Fill">
          <div className="flex gap-1.5 mb-2">
            {(['none', 'color'] as const).map(fm => (
              <button key={fm} onClick={() => updateFrame({ fillMode: fm })}
                className={cn('flex-1 h-7 rounded border text-[11px] transition-colors capitalize',
                  ef.fillMode === fm ? 'border-amber-500 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                )}>
                {fm === 'none' ? 'None' : 'Color'}
              </button>
            ))}
          </div>
          {ef.fillMode === 'color' && (
            <div className="flex items-center gap-2">
              <input type="color" value={ef.fillColor}
                onChange={e => updateFrame({ fillColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
              <Input value={ef.fillColor}
                onChange={e => updateFrame({ fillColor: e.target.value })}
                className="h-7 text-xs font-mono bg-white/5 border-white/10 text-white" />
            </div>
          )}
        </Section>

        {/* Padding */}
        <Section label="Padding">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40 w-6 shrink-0">Pad</span>
            <Input type="number" value={ef.padding}
              onChange={e => updateFrame({ padding: Math.max(-20, Math.min(40, Number(e.target.value))) })}
              className="h-7 text-xs bg-white/5 border-white/10 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <span className="text-[10px] text-white/30">px</span>
          </div>
        </Section>

        {/* Layer */}
        <Section label="Layer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={element.visible} onCheckedChange={v => update({ visible: v })} id={`vis-frame-${element.id}`} />
              <Label htmlFor={`vis-frame-${element.id}`} className="text-xs text-white/60">Visible</Label>
            </div>
            <div className="flex items-center gap-1 w-24">
              <span className="text-[10px] text-white/40 w-4 shrink-0">Z</span>
              <Input type="number" value={Math.round(element.zIndex)} onChange={e => update({ zIndex: Number(e.target.value) })}
                className="h-7 text-xs bg-white/5 border-white/10 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          </div>
        </Section>
      </div>
    );
  }

  const handleTypeChange = (newType: WatchFaceElement['type']) => {
    if (newType === element.type) return;
    const changes: Partial<WatchFaceElement> = { type: newType };
    switch (newType) {
      case 'ARC_PROGRESS':
        changes.center = element.center ?? { x: 240, y: 240 };
        changes.radius = element.radius ?? 100;
        changes.startAngle = element.startAngle ?? 135;
        changes.endAngle = element.endAngle ?? 345;
        changes.lineWidth = element.lineWidth ?? 8;
        changes.color = element.color ?? '0x00FF00';
        break;
      case 'TIME_POINTER':
        changes.center = { x: 240, y: 240 };
        changes.hourPos = { x: 11, y: 70 };
        changes.minutePos = { x: 8, y: 100 };
        changes.secondPos = { x: 3, y: 120 };
        break;
      case 'TEXT':
        changes.fontSize = element.fontSize ?? 20;
        changes.color = element.color ?? '0xFFFFFFFF';
        changes.text = element.text ?? '';
        break;
      case 'CIRCLE':
        changes.center = element.center ?? { x: element.bounds.x + element.bounds.width / 2, y: element.bounds.y + element.bounds.height / 2 };
        changes.radius = element.radius ?? Math.min(element.bounds.width, element.bounds.height) / 2;
        changes.color = element.color ?? '0xFFFFFF';
        break;
    }
    update(changes);
  };

  const setX = (v: number) => update({ bounds: { ...element.bounds, x: clamp(v, 0, 480) } });
  const setY = (v: number) => update({ bounds: { ...element.bounds, y: clamp(v, 0, 480) } });
  const setW = (v: number) => update({ bounds: { ...element.bounds, width: clamp(v, 1, 480) } });
  const setH = (v: number) => update({ bounds: { ...element.bounds, height: clamp(v, 1, 480) } });

  const handleCopyStyle = () => {
    _styleClipboard = {
      color: element.color,
      fontSize: element.fontSize,
      fontStyle: element.fontStyle,
      radius: element.radius,
      lineWidth: element.lineWidth,
      startAngle: element.startAngle,
      endAngle: element.endAngle,
    };
    setClipboardHasData(true);
    toast.success('Style copied!');
  };

  const handlePasteStyle = () => {
    if (!_styleClipboard) return;
    const changes: Partial<WatchFaceElement> = {};
    if (_styleClipboard.color !== undefined) changes.color = _styleClipboard.color;
    if (_styleClipboard.fontSize !== undefined) changes.fontSize = _styleClipboard.fontSize;
    if (_styleClipboard.fontStyle !== undefined) changes.fontStyle = _styleClipboard.fontStyle;
    if (element.type === 'ARC_PROGRESS') {
      if (_styleClipboard.radius !== undefined) changes.radius = _styleClipboard.radius;
      if (_styleClipboard.lineWidth !== undefined) changes.lineWidth = _styleClipboard.lineWidth;
      if (_styleClipboard.startAngle !== undefined) changes.startAngle = _styleClipboard.startAngle;
      if (_styleClipboard.endAngle !== undefined) changes.endAngle = _styleClipboard.endAngle;
    }
    update(changes);
    toast.success('Style pasted!');
  };

  const isCentered = element.type === 'ARC_PROGRESS' || element.type === 'TIME_POINTER';
  const isSizeLocked = false; // Allow resizing all elements in editor

  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-4 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
          {TYPE_LABELS[element.type] ?? element.type}
          {element.subtype && <span className="ml-1 text-cyan-400/70">({element.subtype})</span>}
        </span>
        <span className="text-xs text-white/40 truncate max-w-[100px]">{element.name}</span>
      </div>
      {/* Copy / Paste Style */}
      <div className="flex gap-1.5">
        <button
          onClick={handleCopyStyle}
          className="flex-1 h-6 rounded border border-white/10 bg-white/5 text-[10px] text-white/50 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
          title="Copy color, font size, arc shape"
        >
          Copy Style
        </button>
        {clipboardHasData && (
          <button
            onClick={handlePasteStyle}
            className="flex-1 h-6 rounded border border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            title="Paste copied style to this element"
          >
            Paste Style
          </button>
        )}
      </div>

      {/* Widget Type */}
      <Section label="Widget Type">
        <Select value={element.type} onValueChange={v => handleTypeChange(v as WatchFaceElement['type'])}>
          <SelectTrigger className="w-full h-7 text-xs bg-zinc-800 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WIDGET_TYPES.map(wt => (
              <SelectItem key={wt} value={wt}>{TYPE_LABELS[wt] ?? wt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* Position */}
      <Section label="Position">
        {isCentered ? (
          <FieldRow>
            <NumField label="CX" value={element.center?.x ?? 240} onChange={v => update({ center: { x: clamp(v, 0, 480), y: element.center?.y ?? 240 } })} />
            <NumField label="CY" value={element.center?.y ?? 240} onChange={v => update({ center: { x: element.center?.x ?? 240, y: clamp(v, 0, 480) } })} />
          </FieldRow>
        ) : (
          <FieldRow>
            <NumField label="X" value={element.bounds.x} onChange={setX} />
            <NumField label="Y" value={element.bounds.y} onChange={setY} />
          </FieldRow>
        )}
      </Section>

      {/* Size — hidden for centered (arc/pointer) elements */}
      {!isCentered && (
        <Section label="Size">
          <FieldRow>
            <NumField label="W" value={element.bounds.width} onChange={setW} disabled={isSizeLocked} />
            <NumField label="H" value={element.bounds.height} onChange={setH} disabled={isSizeLocked} />
          </FieldRow>
          {isSizeLocked && (
            <p className="text-[10px] text-white/30 mt-1">Size determined by digit images</p>
          )}
        </Section>
      )}

      {/* Shape Type — CIRCLE elements only */}
      {element.type === 'CIRCLE' && (
        <Section label="Shape Type">
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: 'circle',       label: 'Circle'      },
              { value: 'fill_rect',    label: 'Filled Rect' },
              { value: 'stroke_rect',  label: 'Stroke Rect' },
              { value: 'rounded_rect', label: 'Rounded Rect'},
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => update({ shapeType: opt.value })}
                className={`py-1.5 px-2 rounded border text-xs transition-colors ${
                  (element.shapeType ?? 'circle') === opt.value
                    ? 'border-cyan-500 bg-cyan-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {(element.shapeType === 'rounded_rect') && (
            <div className="mt-2">
              <label className="block text-[10px] text-zinc-400 mb-1">Corner Radius</label>
              <input
                type="range" min={0} max={60} step={1}
                value={element.shapeCornerRadius ?? 12}
                onChange={e => update({ shapeCornerRadius: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
              <span className="text-[10px] text-zinc-400">{element.shapeCornerRadius ?? 12}px</span>
            </div>
          )}
        </Section>
      )}

      {/* Color */}
      {(element.color !== undefined || element.type === 'ARC_PROGRESS' || element.type === 'CIRCLE') && (
        <Section label="Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={toCssColor(element.color ?? '0x00CC88')}
              onChange={e => update({ color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
            <Input
              value={toCssColor(element.color ?? '0x00CC88')}
              onChange={e => update({ color: e.target.value })}
              className="h-7 text-xs font-mono bg-white/5 border-white/10 text-white"
            />
          </div>
        </Section>
      )}

      {/* Text Content — TEXT elements only */}
      {element.type === 'TEXT' && (
        <Section label="Text Content">
          <Input
            value={element.text ?? ''}
            onChange={e => update({ text: e.target.value })}
            placeholder="Enter text…"
            className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-white/40 w-14">Font size</span>
            <input
              type="number"
              value={element.fontSize ?? 16}
              min={8}
              max={80}
              onChange={e => update({ fontSize: Number(e.target.value) })}
              className="w-full h-6 text-xs bg-white/5 border border-white/10 rounded px-2 text-white"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-white/40 w-14">Char gap</span>
            <input
              type="number"
              value={element.charSpace ?? 0}
              min={-10}
              max={30}
              onChange={e => update({ charSpace: Number(e.target.value) })}
              className="w-full h-6 text-xs bg-white/5 border border-white/10 rounded px-2 text-white"
              title="Letter spacing (Zepp char_space)"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-white/40 w-14">Line gap</span>
            <input
              type="number"
              value={element.lineSpace ?? 0}
              min={-10}
              max={30}
              onChange={e => update({ lineSpace: Number(e.target.value) })}
              className="w-full h-6 text-xs bg-white/5 border border-white/10 rounded px-2 text-white"
              title="Line spacing (Zepp line_space)"
            />
          </div>
        </Section>
      )}

      {/* Date Format — TEXT elements with dateFormat set, or enabled via toggle */}
      {element.type === 'TEXT' && (() => {
        const DATE_FORMATS = [
          { value: 'DD/MM',       label: 'DD/MM',        sample: '21/04' },
          { value: 'MM/DD',       label: 'MM/DD',        sample: '04/21' },
          { value: 'DD/MM/YYYY',  label: 'DD/MM/YYYY',   sample: '21/04/2026' },
          { value: 'MM/DD/YYYY',  label: 'MM/DD/YYYY',   sample: '04/21/2026' },
          { value: 'DD-MM-YYYY',  label: 'DD-MM-YYYY',   sample: '21-04-2026' },
          { value: 'DD MMM',      label: 'DD MMM',       sample: '21 Apr' },
          { value: 'MMM DD',      label: 'MMM DD',       sample: 'Apr 21' },
        ] as const;
        const isDateMode = !!element.dateFormat;
        return (
          <Section label="Date Format">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => update({ dateFormat: isDateMode ? undefined : 'DD/MM' })}
                className={`flex-1 py-1 rounded border text-[11px] transition-colors ${
                  isDateMode
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                    : 'border-white/10 bg-white/5 text-zinc-500 hover:border-zinc-500'
                }`}
              >
                {isDateMode ? 'Date mode: ON' : 'Enable date mode'}
              </button>
            </div>
            {isDateMode && (
              <div className="grid grid-cols-2 gap-1.5">
                {DATE_FORMATS.map(fmt => (
                  <button
                    key={fmt.value}
                    onClick={() => update({ dateFormat: fmt.value })}
                    className={`py-1.5 px-2 rounded border text-left transition-colors ${
                      element.dateFormat === fmt.value
                        ? 'border-cyan-500 bg-cyan-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    <span className="block text-[11px] font-mono">{fmt.label}</span>
                    <span className="block text-[9px] text-zinc-500">{fmt.sample}</span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        );
      })()}

      {/* DataType — shown for all data-bindable elements */}
      {['ARC_PROGRESS', 'TEXT_IMG', 'IMG', 'IMG_LEVEL', 'TEXT', 'CIRCLE'].includes(element.type) && (
        <Section label="Data Type">
          <Select value={element.dataType ?? '__none__'} onValueChange={v => update({ dataType: v === '__none__' ? undefined : v })}>
            <SelectTrigger className="w-full h-7 text-xs bg-zinc-800 border-white/10 text-white">
              <SelectValue placeholder="— none —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— none —</SelectItem>
              {DATA_TYPES.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>
      )}

      {/* Status type picker — IMG_STATUS only (4 official Zepp OS system_status values) */}
      {element.type === 'IMG_STATUS' && (() => {
        const STATUS_OPTIONS = [
          { value: 'DISCONNECT', label: 'Bluetooth Off', desc: 'Shows when Bluetooth is disconnected' },
          { value: 'CLOCK',      label: 'Alarm Active',  desc: 'Shows when an alarm is set' },
          { value: 'DISTURB',    label: 'Do Not Disturb', desc: 'Shows when DND mode is on' },
          { value: 'LOCK',       label: 'Screen Locked',  desc: 'Shows when screen lock is on' },
        ] as const;
        const current = element.statusType ?? 'DISCONNECT';
        return (
          <Section label="Status Type">
            <div className="space-y-1">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ statusType: opt.value, src: undefined })}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded border text-[11px] transition-colors',
                    current === opt.value
                      ? 'border-cyan-500 bg-cyan-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                  )}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-[9px] text-white/35 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </Section>
        );
      })()}

      {/* ARC-specific fields */}
      {element.type === 'ARC_PROGRESS' && (
        <>
          <Section label="Arc Shape">
            <FieldRow>
              <NumField label="R" value={element.radius ?? 100} onChange={v => update({ radius: clamp(v, 10, 240) })} />
              <NumField label="LW" value={element.lineWidth ?? 8} onChange={v => update({ lineWidth: clamp(v, 1, 40) })} />
            </FieldRow>
            <FieldRow>
              <NumField label="Sta°" value={element.startAngle ?? 135} onChange={v => update({ startAngle: v })} />
              <NumField label="End°" value={element.endAngle ?? 345} onChange={v => update({ endAngle: v })} />
            </FieldRow>
          </Section>
        </>
      )}

      {/* TIME_POINTER-specific fields */}
      {element.type === 'TIME_POINTER' && (
        <Section label="Hand Style">
          <div className="grid grid-cols-5 gap-1.5">
            {HAND_STYLES.map(hs => {
              const active = (element.handStyle ?? 'silver') === hs.key;
              return (
                <button
                  key={hs.key}
                  title={hs.label}
                  onClick={() => update({ handStyle: hs.key })}
                  className={cn(
                    'flex flex-col items-center gap-1 py-1.5 rounded border text-[9px] transition-colors',
                    active
                      ? 'border-cyan-500 bg-cyan-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/80'
                  )}
                >
                  <span
                    className="w-4 h-4 rounded-full border"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, white 0%, ${hs.swatch} 60%, #111 100%)`,
                      borderColor: active ? '#22d3ee' : 'rgba(255,255,255,0.15)',
                    }}
                  />
                  <span className="leading-tight text-center px-0.5">{hs.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
          {/* Custom hand styles from IconLab — separate section with real hand preview */}
          {customHandStyles.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-[9px] text-cyan-400/60 uppercase tracking-wider">My Hand Styles</p>
              <div className="grid grid-cols-4 gap-1.5">
                {customHandStyles.map(ch => {
                  const active = element.handStyle === ch.key;
                  return (
                    <button
                      key={ch.key}
                      title={`Custom: ${ch.name}`}
                      onClick={() => update({ handStyle: ch.key })}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2 px-1 rounded border text-[9px] transition-colors',
                        active
                          ? 'border-cyan-500 bg-cyan-500/15 text-white'
                          : 'border-cyan-500/20 bg-cyan-500/5 text-white/60 hover:border-cyan-500/50 hover:text-white/90'
                      )}
                    >
                      {/* Show hour hand image at actual aspect ratio (22:140 ≈ 1:6.4) */}
                      <img
                        src={ch.hourDataUrl}
                        alt={ch.name}
                        className="w-5 h-14 object-contain"
                        style={{ borderRadius: 2, border: active ? '1px solid #22d3ee' : '1px solid rgba(100,200,255,0.15)' }}
                      />
                      <span className="leading-tight text-center truncate w-full px-0.5 mt-0.5">{ch.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-[10px] text-white/30 mt-1">Re-generate watchface to apply new hand style.</p>
          {/* Seconds toggle */}
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!(element.hideSeconds ?? false)}
              onChange={e => update({ hideSeconds: !e.target.checked })}
              className="accent-cyan-400 w-3 h-3"
            />
            <span className="text-[11px] text-white/70">Show seconds hand</span>
          </label>
        </Section>
      )}

      {/* TIME_POINTER — Hand Scale */}
      {element.type === 'TIME_POINTER' && (
        <Section label="Hand Scale">
          {/* Scale whole */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50">Scale whole</span>
              <span className="text-[10px] text-cyan-400 font-mono w-10 text-right">{(element.handLengthScale ?? 1).toFixed(2)}×</span>
            </div>
            <input
              type="range" min="0.5" max="2.0" step="0.05"
              value={element.handLengthScale ?? 1}
              onChange={e => update({ handLengthScale: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1"
            />
          </div>
          {/* Scale each */}
          <details className="mt-2">
            <summary className="text-[10px] text-white/40 cursor-pointer hover:text-white/70 select-none">Scale each hand individually ▸</summary>
            <div className="mt-2 space-y-3 pl-1 border-l border-white/10">
              {/* Hour */}
              <div>
                <span className="text-[9px] text-white/40 uppercase tracking-wider">Hour</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-white/30 w-10">Length</span>
                  <input type="range" min="0.5" max="2.0" step="0.05"
                    value={element.handHourLength ?? (element.handLengthScale ?? 1)}
                    onChange={e => update({ handHourLength: Number(e.target.value) })}
                    className="flex-1 accent-cyan-400 h-1" />
                  <span className="text-[9px] font-mono text-cyan-400 w-8 text-right">{(element.handHourLength ?? (element.handLengthScale ?? 1)).toFixed(2)}×</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/30 w-10">Width</span>
                  <input type="range" min="0.5" max="2.0" step="0.05"
                    value={element.handHourWidth ?? 1}
                    onChange={e => update({ handHourWidth: Number(e.target.value) })}
                    className="flex-1 accent-cyan-400 h-1" />
                  <span className="text-[9px] font-mono text-cyan-400 w-8 text-right">{(element.handHourWidth ?? 1).toFixed(2)}×</span>
                </div>
              </div>
              {/* Minute */}
              <div>
                <span className="text-[9px] text-white/40 uppercase tracking-wider">Minute</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-white/30 w-10">Length</span>
                  <input type="range" min="0.5" max="2.0" step="0.05"
                    value={element.handMinuteLength ?? (element.handLengthScale ?? 1)}
                    onChange={e => update({ handMinuteLength: Number(e.target.value) })}
                    className="flex-1 accent-cyan-400 h-1" />
                  <span className="text-[9px] font-mono text-cyan-400 w-8 text-right">{(element.handMinuteLength ?? (element.handLengthScale ?? 1)).toFixed(2)}×</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/30 w-10">Width</span>
                  <input type="range" min="0.5" max="2.0" step="0.05"
                    value={element.handMinuteWidth ?? 1}
                    onChange={e => update({ handMinuteWidth: Number(e.target.value) })}
                    className="flex-1 accent-cyan-400 h-1" />
                  <span className="text-[9px] font-mono text-cyan-400 w-8 text-right">{(element.handMinuteWidth ?? 1).toFixed(2)}×</span>
                </div>
              </div>
              {/* Second */}
              {!element.hideSeconds && (
                <div>
                  <span className="text-[9px] text-white/40 uppercase tracking-wider">Second</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-white/30 w-10">Length</span>
                    <input type="range" min="0.5" max="2.0" step="0.05"
                      value={element.handSecondLength ?? (element.handLengthScale ?? 1)}
                      onChange={e => update({ handSecondLength: Number(e.target.value) })}
                      className="flex-1 accent-cyan-400 h-1" />
                    <span className="text-[9px] font-mono text-cyan-400 w-8 text-right">{(element.handSecondLength ?? (element.handLengthScale ?? 1)).toFixed(2)}×</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/30 w-10">Width</span>
                    <input type="range" min="0.5" max="2.0" step="0.05"
                      value={element.handSecondWidth ?? 1}
                      onChange={e => update({ handSecondWidth: Number(e.target.value) })}
                      className="flex-1 accent-cyan-400 h-1" />
                    <span className="text-[9px] font-mono text-cyan-400 w-8 text-right">{(element.handSecondWidth ?? 1).toFixed(2)}×</span>
                  </div>
                </div>
              )}
            </div>
          </details>
        </Section>
      )}

      {/* TIME_POINTER — Hand Effects */}
      {element.type === 'TIME_POINTER' && (
        <Section label="Hand Effects">
          {/* Shadow */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50">Shadow</span>
              <span className="text-[10px] text-white/40 font-mono w-8 text-right">{Math.round((element.handShadow ?? 0) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05"
              value={element.handShadow ?? 0}
              onChange={e => update({ handShadow: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1" />
          </div>
          {/* Glow */}
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50">Glow / Neon</span>
              <span className="text-[10px] text-white/40 font-mono w-8 text-right">{Math.round((element.handGlow ?? 0) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05"
              value={element.handGlow ?? 0}
              onChange={e => update({ handGlow: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1" />
          </div>
          {/* Speed trail */}
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50">Speed trail</span>
              <span className="text-[10px] text-white/40 font-mono w-8 text-right">{Math.round((element.handTrail ?? 0) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05"
              value={element.handTrail ?? 0}
              onChange={e => update({ handTrail: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1" />
          </div>
          {/* Tint color */}
          <div className="mt-2">
            <span className="text-[10px] text-white/50 block mb-1">Tint / Accent color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.handTint ?? '#4488FF'}
                onChange={e => update({ handTint: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              />
              <button
                onClick={() => update({ handTint: undefined })}
                className="text-[9px] text-white/30 hover:text-white/60 border border-white/10 rounded px-1.5 h-5"
                title="Remove tint"
              >none</button>
              {element.handTint && (
                <span className="text-[9px] font-mono text-white/50">{element.handTint}</span>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Weather style picker — IMG_LEVEL + WEATHER_CURRENT */}
      {element.type === 'IMG_LEVEL' && element.dataType === 'WEATHER_CURRENT' && (
        <Section label="Weather Style">
          <div className="space-y-2">
            <div className="flex gap-2">
              {WEATHER_STYLES.map(ws => (
                <button
                  key={ws.key}
                  onClick={() => update({ weatherStyle: ws.key })}
                  className={cn(
                    'flex-1 h-7 rounded border text-[10px]',
                    (element.weatherStyle ?? 'flat') === ws.key
                      ? 'border-cyan-500 bg-cyan-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                  )}
                >
                  {ws.label}
                </button>
              ))}
            </div>
            {/* Preview strip: show codes 0,1,2,4,5,8,11,20,28 as samples */}
            <WeatherPreviewStrip style={(element.weatherStyle ?? 'flat') as WeatherStyle} />
          </div>
        </Section>
      )}

      {/* Icon picker — IMG and IMG_STATUS elements */}
      {(element.type === 'IMG' || element.type === 'IMG_STATUS') && (
        <Section label={element.type === 'IMG_STATUS' ? 'Disconnect Icon' : 'Icon'}>
          {element.type === 'IMG_STATUS' && (
            <p className="text-[9px] text-amber-400/80 mb-1.5 leading-tight">
              This icon shows only when the condition is inactive (e.g. Bluetooth OFF). This is official Zepp OS behavior — the widget is a warning indicator.
            </p>
          )}
          <div className="space-y-2">
            {/* Search box */}
            <input
              type="text"
              placeholder="Search icons…"
              value={iconSearch}
              onChange={e => setIconSearch(e.target.value)}
              className="w-full h-7 rounded border border-white/10 bg-white/5 px-2 text-[11px] text-white/80 placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
            />
            {/* None button */}
            <button
              onClick={() => update({ iconKey: undefined })}
              className={cn(
                'w-full h-7 rounded border text-[10px] text-white/40',
                !element.iconKey ? 'border-cyan-500 bg-cyan-500/20' : 'border-white/10 bg-white/5'
              )}
            >
              None
            </button>
            <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
              {/* Custom (user-saved) icons — shown first */}
              {(() => {
                const q = iconSearch.trim().toLowerCase();
                const customIcons = allIcons.filter(i =>
                  i.source === 'custom' &&
                  (q === '' || i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q))
                );
                if (customIcons.length === 0) return null;
                return (
                  <div key="custom">
                    <p className="text-[9px] text-cyan-400/60 uppercase tracking-wider mb-1">My Icons</p>
                    <div className="grid grid-cols-6 gap-1">
                      {customIcons.map(icon => (
                        <button
                          key={icon.key}
                          onClick={() => update({ iconKey: icon.key })}
                          className={cn(
                            'relative p-1 rounded border',
                            element.iconKey === icon.key ? 'border-cyan-500 bg-cyan-500/20' : 'border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/50'
                          )}
                          title={icon.label}
                        >
                          <img src={icon.dataUrl} alt={icon.label} className="w-6 h-6 object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {(['health', 'fitness', 'weather', 'system', 'time'] as const).map(cat => {
                const q = iconSearch.trim().toLowerCase();
                const icons = allIcons.filter(i =>
                  i.source !== 'custom' &&
                  i.category === cat &&
                  (q === '' || i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q))
                );
                if (icons.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">{cat}</p>
                    <div className="grid grid-cols-6 gap-1">
                      {icons.map(icon => (
                        <button
                          key={icon.key}
                          onClick={() => update({ iconKey: icon.key })}
                          className={cn(
                            'relative p-1 rounded border',
                            element.iconKey === icon.key ? 'border-cyan-500 bg-cyan-500/20' : 'border-white/10 bg-white/5 hover:border-white/30'
                          )}
                          title={`${icon.label}${icon.source === 'tabler' ? ' (Tabler)' : ''}`}
                        >
                          <img src={icon.dataUrl} alt={icon.label} className="w-6 h-6 object-contain" />
                          {icon.source === 'tabler' && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-violet-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-white/25">
              {allIcons.filter(i => i.source === 'tabler').length > 0
                ? `${allIcons.length} icons — violet dot = Tabler`
                : 'Loading Tabler icons…'}
            </p>
          </div>
        </Section>
      )}

      {/* Icon Effects — only for IMG elements that have an icon selected */}
      {element.type === 'IMG' && element.iconKey && (() => {
        const updateEffect = (patch: Partial<Pick<WatchFaceElement, 'iconHue' | 'iconSaturation' | 'iconColorize' | 'iconColorizeOpacity'>>) =>
          update(patch);
        const hue = element.iconHue ?? 0;
        const sat = element.iconSaturation ?? 100;
        const colorize = element.iconColorize ?? '';
        const colorizeOpacity = element.iconColorizeOpacity ?? 0.8;
        const hasEffects = hue !== 0 || sat !== 100 || !!colorize;
        return (
          <Section label="Icon Effects">
            <div className="space-y-2">
              {/* Hue rotate */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 w-14 shrink-0">Hue</span>
                <input type="range" min={-180} max={180} value={hue}
                  onChange={e => updateEffect({ iconHue: Number(e.target.value) })}
                  className="flex-1 accent-cyan-500 h-1" />
                <span className="text-[10px] text-white/30 w-10 text-right">{hue > 0 ? `+${hue}` : hue}°</span>
              </div>
              {/* Saturation */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 w-14 shrink-0">Saturation</span>
                <input type="range" min={0} max={200} value={sat}
                  onChange={e => updateEffect({ iconSaturation: Number(e.target.value) })}
                  className="flex-1 accent-cyan-500 h-1" />
                <span className="text-[10px] text-white/30 w-10 text-right">{sat}%</span>
              </div>
              {/* Color fill overlay */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 w-14 shrink-0">Color fill</span>
                <input type="color" value={colorize || '#ffffff'}
                  onChange={e => updateEffect({ iconColorize: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0" />
                {colorize && (
                  <>
                    <input type="range" min={0} max={100} value={Math.round(colorizeOpacity * 100)}
                      onChange={e => updateEffect({ iconColorizeOpacity: Number(e.target.value) / 100 })}
                      className="flex-1 accent-cyan-500 h-1" />
                    <span className="text-[10px] text-white/30 w-8 text-right">{Math.round(colorizeOpacity * 100)}%</span>
                  </>
                )}
                {!colorize && <span className="text-[10px] text-white/25 flex-1">None — click to enable</span>}
              </div>
              {colorize && (
                <button
                  onClick={() => updateEffect({ iconColorize: undefined })}
                  className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                >
                  Remove color fill
                </button>
              )}
              {hasEffects && (
                <button
                  onClick={() => updateEffect({ iconHue: 0, iconSaturation: 100, iconColorize: undefined })}
                  className="w-full h-6 rounded border border-white/10 bg-white/5 text-[10px] text-white/50 hover:text-white hover:border-white/30 transition-colors"
                >
                  Reset all effects
                </button>
              )}
              <p className="text-[9px] text-amber-500/60">Effects are baked into ZPK export</p>
            </div>
          </Section>
        );
      })()}

      {/* Widget type toggle — DATE/WEEKDAY conversion */}
      {(element.type === 'IMG_DATE' || element.type === 'IMG_WEEK') && (
        <Section label="Widget Type">
          <div className="grid grid-cols-2 gap-1">
            {(['IMG_DATE', 'IMG_WEEK'] as const).map(wt => (
              <button
                key={wt}
                onClick={() => update({ type: wt })}
                className={cn(
                  'py-1.5 rounded border text-[11px] font-medium transition-colors',
                  element.type === wt
                    ? 'border-cyan-500 bg-cyan-500/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                )}
              >
                {wt === 'IMG_DATE' ? 'Date Digit' : 'Weekday Name'}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Name format — IMG_WEEK only */}
      {element.type === 'IMG_WEEK' && (
        <Section label="Name Format">
          <div className="space-y-1">
            {([
              { value: 'full',    label: 'Full',    example: 'Monday' },
              { value: 'short',   label: 'Short',   example: 'Mon' },
              { value: 'initial', label: 'Initial', example: 'Mo.' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => update({ weekFormat: opt.value })}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-[11px] transition-colors',
                  (element.weekFormat ?? 'full') === opt.value
                    ? 'border-cyan-500 bg-cyan-500/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                )}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-white/35">{opt.example}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Font style picker — text/digit elements */}
      {['IMG_TIME', 'TEXT_IMG', 'TEXT', 'IMG_DATE'].includes(element.type) && (
        <Section label="Font Style">
          <div className="rounded-md border border-white/10 overflow-hidden">
            {/* Selected font preview */}
            <div className="px-3 py-2 bg-zinc-800 border-b border-white/10 flex items-center justify-between">
              <span style={{
                fontFamily: getFontStyle(element.fontStyle ?? 'bold-white').fontFamily,
                fontWeight: getFontStyle(element.fontStyle ?? 'bold-white').fontWeight,
                color: getFontStyle(element.fontStyle ?? 'bold-white').color,
                fontSize: '20px',
              }}>
                12:34
              </span>
              <span className="text-[10px] text-white/40">{getFontStyle(element.fontStyle ?? 'bold-white').label}</span>
            </div>
            {/* Scrollable list */}
            <div className="max-h-48 overflow-y-auto bg-zinc-900">
              {FONT_STYLES.map(style => (
                <button
                  key={style.key}
                  onClick={() => update({ fontStyle: style.key, color: style.color })}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors',
                    (element.fontStyle ?? 'bold-white') === style.key
                      ? 'bg-cyan-500/20 border-l-2 border-cyan-500'
                      : 'border-l-2 border-transparent hover:bg-white/5'
                  )}
                >
                  <span style={{
                    fontFamily: style.fontFamily,
                    fontWeight: style.fontWeight,
                    color: style.color,
                    fontSize: '18px',
                  }}>
                    12:34
                  </span>
                  <span className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[10px] text-white/30">{style.label}</span>
                    {style.embeddable
                      ? <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1 leading-4" title="This font will be embedded in the ZPK file">✓ Embeds</span>
                      : <span className="text-[9px] text-white/20" title="Preview only — device uses system font">preview only</span>
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Curved Text — TEXT elements only */}
      {element.type === 'TEXT' && (
        <Section label="Curved Text">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={!!element.curvedText}
              onChange={e => {
                if (e.target.checked) {
                  update({ curvedText: { radius: 180, startAngle: -45, endAngle: 45 } });
                } else {
                  update({ curvedText: undefined });
                }
              }}
              className="rounded"
            />
            <span className="text-xs text-white/60">Enable arc text</span>
          </div>
          {element.curvedText && (
            <div className="space-y-2">
              <FieldRow>
                <NumField label="Radius" value={element.curvedText.radius} onChange={v => update({ curvedText: { ...element.curvedText!, radius: v } })} />
              </FieldRow>
              <FieldRow>
                <NumField label="Start°" value={element.curvedText.startAngle} onChange={v => update({ curvedText: { ...element.curvedText!, startAngle: v } })} />
                <NumField label="End°" value={element.curvedText.endAngle} onChange={v => update({ curvedText: { ...element.curvedText!, endAngle: v } })} />
              </FieldRow>
            </div>
          )}
        </Section>
      )}

      {/* Drop Shadow — all types except TIME_POINTER (has handShadow) and engraveFrame elements */}
      {!['TIME_POINTER'].includes(element.type) && !element.engraveFrame && (
        <Section label="Drop Shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-white/60">Enable shadow</span>
            <Switch
              checked={!!element.dropShadow}
              onCheckedChange={checked => {
                if (checked) {
                  update({ dropShadow: { color: '#000000', opacity: 0.6, blur: 8, offsetX: 3, offsetY: 3 } });
                } else {
                  update({ dropShadow: undefined });
                }
              }}
              id={`shadow-${element.id}`}
            />
          </div>
          {element.dropShadow && (() => {
            const ds = element.dropShadow;
            const updateShadow = (patch: Partial<NonNullable<typeof element.dropShadow>>) =>
              update({ dropShadow: { ...ds, ...patch } });
            const previewOnly = ['TEXT', 'ARC_PROGRESS', 'IMG_TIME', 'IMG_DATE', 'IMG_WEEK', 'TEXT_IMG', 'IMG_STATUS', 'IMG_LEVEL', 'IMG_PROGRESS', 'IMG_ANIM'].includes(element.type);
            return (
              <div className="space-y-2">
                {/* Color */}
                <div className="flex items-center gap-2">
                  <input type="color" value={ds.color}
                    onChange={e => updateShadow({ color: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                  <Input value={ds.color}
                    onChange={e => updateShadow({ color: e.target.value })}
                    className="h-7 text-xs font-mono bg-white/5 border-white/10 text-white flex-1" />
                  <span className="text-[10px] text-white/30 shrink-0">{Math.round(ds.opacity * 100)}%</span>
                </div>
                {/* Opacity */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12 shrink-0">Opacity</span>
                  <input type="range" min={0} max={100} value={Math.round(ds.opacity * 100)}
                    onChange={e => updateShadow({ opacity: Number(e.target.value) / 100 })}
                    className="flex-1 accent-cyan-500 h-1" />
                </div>
                {/* Blur */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12 shrink-0">Blur</span>
                  <input type="range" min={0} max={40} value={ds.blur}
                    onChange={e => updateShadow({ blur: Number(e.target.value) })}
                    className="flex-1 accent-cyan-500 h-1" />
                  <span className="text-[10px] text-white/30 w-8 text-right">{ds.blur}px</span>
                </div>
                {/* Offset X */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12 shrink-0">X offset</span>
                  <input type="range" min={-30} max={30} value={ds.offsetX}
                    onChange={e => updateShadow({ offsetX: Number(e.target.value) })}
                    className="flex-1 accent-cyan-500 h-1" />
                  <span className="text-[10px] text-white/30 w-8 text-right">{ds.offsetX}px</span>
                </div>
                {/* Offset Y */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12 shrink-0">Y offset</span>
                  <input type="range" min={-30} max={30} value={ds.offsetY}
                    onChange={e => updateShadow({ offsetY: Number(e.target.value) })}
                    className="flex-1 accent-cyan-500 h-1" />
                  <span className="text-[10px] text-white/30 w-8 text-right">{ds.offsetY}px</span>
                </div>
                {previewOnly && (
                  <p className="text-[9px] text-yellow-500/70 mt-1">⚠ Preview only — shadow not baked into .zpk for this element type</p>
                )}
              </div>
            );
          })()}
        </Section>
      )}

      {/* Element Frame toggle — hidden for ARC_PROGRESS, TIME_POINTER, and frame elements */}
      {!['ARC_PROGRESS', 'TIME_POINTER'].includes(element.type) && !element.engraveFrame && (
        <Section label="Element Frame">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/60">Add 3D engrave / emboss frame</span>
            <Switch
              checked={!!element.frameElementId}
              onCheckedChange={checked => {
                if (checked) onAddFrame?.(element);
                else onRemoveFrame?.(element);
              }}
              id={`frame-${element.id}`}
            />
          </div>
          {element.frameElementId && (
            <p className="text-[9px] text-amber-400/70 mt-1">Frame element created — select it in the list to edit.</p>
          )}
        </Section>
      )}

      {/* App Shortcut */}
      <Section label="App Shortcut">
        <Select value={element.clickAction ?? '__none__'} onValueChange={v => update({ clickAction: v === '__none__' ? undefined : v })}>
          <SelectTrigger className="w-full h-7 text-xs bg-zinc-800 border-white/10 text-white">
            <SelectValue placeholder="— none —" />
          </SelectTrigger>
          <SelectContent>
            {APP_SHORTCUTS.map(s => (
              <SelectItem key={s.value || '__none__'} value={s.value || '__none__'}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* Visible + zIndex */}
      <Section label="Layer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={element.visible}
              onCheckedChange={v => update({ visible: v })}
              id={`vis-${element.id}`}
            />
            <Label htmlFor={`vis-${element.id}`} className="text-xs text-white/60">Visible</Label>
          </div>
          <NumField label="Z" value={element.zIndex} onChange={v => update({ zIndex: v })} />
        </div>
      </Section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
      {children}
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}

function NumField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1 flex-1">
      <span className="text-[10px] text-white/40 w-4 shrink-0">{label}</span>
      <Input
        type="number"
        value={Math.round(value)}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          'h-7 text-xs bg-white/5 border-white/10 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
    </div>
  );
}

// ─── Weather preview strip ─────────────────────────────────────────────────────

const PREVIEW_CODES = [0, 2, 4, 5, 8, 11, 14, 20, 28];

function WeatherPreviewStrip({ style }: { style: WeatherStyle }) {
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  useEffect(() => {
    // generateWeatherSet uses document.createElement, safe to call in useEffect
    const all = generateWeatherSet(style);
    setDataUrls(PREVIEW_CODES.map(c => all[c]));
  }, [style]);

  if (dataUrls.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {dataUrls.map((url, i) => (
        <img key={i} src={url} alt={`weather_${PREVIEW_CODES[i]}`} className="w-7 h-7 rounded" />
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function toCssColor(color: string): string {
  if (color.startsWith('0x') || color.startsWith('0X')) {
    return '#' + color.slice(2).padStart(6, '0');
  }
  return color.startsWith('#') ? color : '#ffffff';
}
