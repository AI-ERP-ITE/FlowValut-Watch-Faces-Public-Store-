import { DATA_TO_ELEMENT, ELEMENT_TO_DATA } from '@/lib/elementDataRules';
import { ZEP_DATA_TYPES, ZEP_WIDGETS } from '@/lib/zeppSnapshot';

export type GapReport = {
  missingElementForWidget: string[];
  unmappedWidgets: string[];
  dataWithoutElement: string[];
  elementWithoutPurpose: string[];
  inconsistentMappings: string[];
};

// Manual audit mapping only. This is intentionally static and non-runtime.
export const ELEMENT_TO_WIDGET: Record<string, string | string[]> = {
  TEXT: 'TEXT',
  DIGITAL_HOURS: 'TEXT_IMG',
  DIGITAL_MINUTES: 'TEXT_IMG',
  DIGITAL_SECONDS: 'TEXT_IMG',
  GAUGE_POINTER: 'IMG_POINTER',
  ARC_PROGRESS: 'ARC_PROGRESS',
  NUMERIC_DISPLAY: 'TEXT_IMG',
  DATE_DIGIT: 'TEXT_IMG',
  WEEKDAY_NAME: 'TEXT_IMG',
  IMAGE_SWITCHER: 'IMG_LEVEL',
  STATUS_INDICATOR: 'IMG_STATUS',
  STATIC_IMAGE: 'TEXT_IMG',
  SHAPE: 'TEXT_IMG',
  ANALOG_CLOCK: 'TIME_POINTER',
};

function toSortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function mappedWidgets(): string[] {
  const out: string[] = [];
  for (const mapped of Object.values(ELEMENT_TO_WIDGET)) {
    if (Array.isArray(mapped)) {
      out.push(...mapped);
    } else {
      out.push(mapped);
    }
  }
  return out;
}

function isStaticOrTimeElement(elementKey: string): boolean {
  return [
    'DIGITAL_HOURS',
    'DIGITAL_MINUTES',
    'DIGITAL_SECONDS',
    'DATE_DIGIT',
    'WEEKDAY_NAME',
    'STATIC_IMAGE',
    'SHAPE',
    'ANALOG_CLOCK',
  ].includes(elementKey);
}

export function runGapAudit(): GapReport {
  const missingElementForWidget: string[] = [];
  const unmappedWidgets: string[] = [];
  const dataWithoutElement: string[] = [];
  const elementWithoutPurpose: string[] = [];
  const inconsistentMappings: string[] = [];

  const widgetSet = new Set<string>(ZEP_WIDGETS as readonly string[]);
  const allMappedWidgets = mappedWidgets();

  // CHECK 1 — Missing ELEMENT for Zepp widget
  for (const widget of ZEP_WIDGETS) {
    const found = Object.values(ELEMENT_TO_WIDGET).some((mapped) => {
      if (Array.isArray(mapped)) return mapped.includes(widget);
      return mapped === widget;
    });
    if (!found) {
      missingElementForWidget.push(widget);
    }
  }

  // CHECK 2 — Unmapped widgets (reverse check)
  for (const widget of allMappedWidgets) {
    if (!widgetSet.has(widget)) {
      unmappedWidgets.push(widget);
    }
  }

  // CHECK 3 — Data without representation
  for (const dataType of ZEP_DATA_TYPES) {
    if (!DATA_TO_ELEMENT[dataType] || DATA_TO_ELEMENT[dataType].length === 0) {
      dataWithoutElement.push(dataType);
    }
  }

  // CHECK 4 — Element without purpose
  for (const [elementKey, allowedData] of Object.entries(ELEMENT_TO_DATA)) {
    if (allowedData.length === 0 && !isStaticOrTimeElement(elementKey)) {
      elementWithoutPurpose.push(elementKey);
    }
  }

  // CHECK 5 — Inconsistent mapping
  for (const [dataType, elements] of Object.entries(DATA_TO_ELEMENT)) {
    for (const elementKey of elements) {
      const forward = ELEMENT_TO_DATA[elementKey as keyof typeof ELEMENT_TO_DATA] ?? [];
      if (!forward.includes(dataType)) {
        inconsistentMappings.push(`ELEMENT:${elementKey} missing DATA:${dataType}`);
      }
    }
  }

  return {
    missingElementForWidget: toSortedUnique(missingElementForWidget),
    unmappedWidgets: toSortedUnique(unmappedWidgets),
    dataWithoutElement: toSortedUnique(dataWithoutElement),
    elementWithoutPurpose: toSortedUnique(elementWithoutPurpose),
    inconsistentMappings: toSortedUnique(inconsistentMappings),
  };
}

export function printGapReport(report: GapReport): void {
  // Structured, deterministic sections.
  // eslint-disable-next-line no-console
  console.log('=== GAP REPORT ===');
  // eslint-disable-next-line no-console
  console.log('');

  // eslint-disable-next-line no-console
  console.log('Missing Elements for Zepp Widgets:');
  if (report.missingElementForWidget.length === 0) {
    // eslint-disable-next-line no-console
    console.log('- (none)');
  } else {
    for (const widget of report.missingElementForWidget) {
      // eslint-disable-next-line no-console
      console.log(`- ${widget}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log('');

  // eslint-disable-next-line no-console
  console.log('Unmapped Widgets:');
  if (report.unmappedWidgets.length === 0) {
    // eslint-disable-next-line no-console
    console.log('- (none)');
  } else {
    for (const widget of report.unmappedWidgets) {
      // eslint-disable-next-line no-console
      console.log(`- ${widget}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log('');

  // eslint-disable-next-line no-console
  console.log('Data Without Representation:');
  if (report.dataWithoutElement.length === 0) {
    // eslint-disable-next-line no-console
    console.log('- (none)');
  } else {
    for (const dataType of report.dataWithoutElement) {
      // eslint-disable-next-line no-console
      console.log(`- ${dataType}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log('');

  // eslint-disable-next-line no-console
  console.log('Elements Without Purpose:');
  if (report.elementWithoutPurpose.length === 0) {
    // eslint-disable-next-line no-console
    console.log('- (none)');
  } else {
    for (const element of report.elementWithoutPurpose) {
      // eslint-disable-next-line no-console
      console.log(`- ${element}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log('');

  // eslint-disable-next-line no-console
  console.log('Inconsistent Mappings:');
  if (report.inconsistentMappings.length === 0) {
    // eslint-disable-next-line no-console
    console.log('- (none)');
  } else {
    for (const mismatch of report.inconsistentMappings) {
      // eslint-disable-next-line no-console
      console.log(`- ${mismatch}`);
    }
  }
}
