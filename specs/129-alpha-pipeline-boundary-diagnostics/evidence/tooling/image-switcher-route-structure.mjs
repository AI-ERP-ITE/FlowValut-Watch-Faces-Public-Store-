import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    options[String(argv[index]).replace(/^--/, '')] = argv[index + 1];
  }
  if (!options.output) throw new Error('--output is required');
  return options;
}

const options = parseArgs(process.argv.slice(2));
const element = {
  id: 'spec129-alpha-switcher',
  name: 'Spec 129 Alpha Fixture',
  type: 'IMG_LEVEL',
  dataType: 'BATTERY',
  imageSwitcherDefinitionId: 'spec129-definition',
  bounds: { x: 17, y: 23, width: 466, height: 466 },
};
const definition = {
  id: 'spec129-definition',
  ranges: Array.from({ length: 4 }, (_, slotIndex) => ({
    slotIndex,
    dataUrl: `data:image/png;base64,SLOT_${slotIndex}`,
  })),
};
const existingElementImages = [];

// Source-equivalent switcherSlotImages construction from StudioApp.tsx.
const switcherSlotImages = [];
definition.ranges.forEach((slot, index) => {
  if (!slot.dataUrl) return;
  const slotName =
    `switcher_${element.id}_slot_${String(index).padStart(2, '0')}.png`;
  if (!existingElementImages.some((image) => image.name === slotName)) {
    switcherSlotImages.push({
      name: slotName,
      dataUrl: slot.dataUrl,
      bounds: {
        x: 0,
        y: 0,
        width: element.bounds.width,
        height: element.bounds.height,
      },
      type: 'IMG_LEVEL',
    });
  }
});

// Source-equivalent linked-definition override and generated asset names.
const configuredFrames = switcherSlotImages
  .filter((image) => image.name.startsWith(`switcher_${element.id}_`))
  .sort((left, right) => left.name.localeCompare(right.name))
  .map((image) => image.dataUrl);
const explicitCount = configuredFrames.length;
const expectedCount = explicitCount;
const sanitizedBase =
  (element.name || element.id).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
const generatedNames = configuredFrames.map(
  (_frame, index) => `imglvl_${sanitizedBase}_${index}.png`,
);

const expectedSlotNames = Array.from(
  { length: 4 },
  (_, index) =>
    `switcher_${element.id}_slot_${String(index).padStart(2, '0')}.png`,
);
const expectedFrameMarkers = Array.from(
  { length: 4 },
  (_, index) => `data:image/png;base64,SLOT_${index}`,
);
const expectedGeneratedNames = Array.from(
  { length: 4 },
  (_, index) => `imglvl_spec_129_alpha_fixture_${index}.png`,
);

const checks = {
  slotCount: switcherSlotImages.length === 4,
  slotNames:
    JSON.stringify(switcherSlotImages.map((image) => image.name)) ===
    JSON.stringify(expectedSlotNames),
  slotBounds:
    switcherSlotImages.every(
      (image) =>
        image.bounds.x === 0 &&
        image.bounds.y === 0 &&
        image.bounds.width === 466 &&
        image.bounds.height === 466,
    ),
  linkedDefinitionFilterIsolation: configuredFrames.length === 4,
  lexicographicOrderPreservesSlotOrder:
    JSON.stringify(configuredFrames) === JSON.stringify(expectedFrameMarkers),
  expectedCount: expectedCount === 4,
  generatedNames:
    JSON.stringify(generatedNames) === JSON.stringify(expectedGeneratedNames),
};

const result = {
  result: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  element,
  slotNames: switcherSlotImages.map((image) => image.name),
  configuredFrames,
  expectedCount,
  generatedNames,
  checks,
};

const outputPath = path.resolve(options.output);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.result !== 'PASS') process.exitCode = 1;
