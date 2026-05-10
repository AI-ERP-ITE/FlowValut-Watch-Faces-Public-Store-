import { runEngine } from '../engine/index.js';

const template = {
  layoutDescriptor: { canvas: { width: 480, height: 480 } },
  elements: [
    {
      id: 'test-rect',
      type: 'free_rect',
      visible: true,
      params: { width: 0.4, height: 0.3, fill: '#5fa8ff', stroke: 'none', cornerRadius: 0.04, thickness: 0 },
      position: { x: 0, y: 0 },
      dropShadow: {
        color: '#000000',
        opacity: 0.32,
        blur: 6,
        spread: 0,
        offsetX: 1,
        offsetY: 1,
        mode: 'outer',
      },
    },
  ],
};

const result = runEngine({
  templateInput: template,
  renderQualityMode: 'final',
});

const svg = typeof result === 'string' ? result : (result?.svg || JSON.stringify(result).slice(0, 500));

console.log('SVG length:', svg.length);
console.log('---');
// Print only filter region
const filterMatch = svg.match(/<filter[^]*?<\/filter>/);
console.log('Filter found:', !!filterMatch);
if (filterMatch) console.log(filterMatch[0]);
console.log('---');
console.log('Has dsOuterBlur:', svg.includes('dsOuterBlur'));
console.log('Has dropShadow:', svg.includes('result="dropShadow"'));
console.log('Has feGaussianBlur:', svg.includes('feGaussianBlur'));
