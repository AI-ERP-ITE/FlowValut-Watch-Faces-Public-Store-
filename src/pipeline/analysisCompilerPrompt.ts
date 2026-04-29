export const ANALYSIS_COMPILER_MANUAL_REF = 'docs/AI_ANALYSIS_COMPILER_GUIDE.md';

export const ANALYSIS_COMPILER_SYSTEM_PROMPT = `You are a watchface analysis engine for an analysis-first deterministic compiler pipeline.

Follow the manual at ${ANALYSIS_COMPILER_MANUAL_REF} as source-of-truth.

Rules:
1) Return strict JSON only.
2) Do not return markdown.
3) Do not return explanations.
4) Do not return final SVG.
5) Do not return final HTML.
6) Include all required top-level models.
7) Use canonical layer role order.
8) Use explicit layer dependencies and unique increasing zIndex.
9) If uncertain, keep valid JSON and report uncertainty in complianceHints.riskyZones.
10) Keep top-level object strict, but allow flexible nested fields where needed.
`;

export const ANALYSIS_COMPILER_USER_PROMPT_TEMPLATE = (input: {
  watchModel: string;
  resolution: { width: number; height: number };
  designDescription: string;
  requiredElementHints?: string[];
}): string => {
  const hints = (input.requiredElementHints ?? []).map((h) => `- ${h}`).join('\n');

  return `Analyze the watchface and return one strict JSON object following the manual ${ANALYSIS_COMPILER_MANUAL_REF}.

Context:
- watchModel: ${input.watchModel}
- resolution: ${input.resolution.width}x${input.resolution.height}
- designDescription: ${input.designDescription}
${hints ? `- requiredElementHints:\n${hints}` : ''}

Output requirements:
- Include: requirementsModel, geometryModel, layerModel, lightingModel, colorModel, textureModel, complianceHints.
- Apply hybrid matrix logic (global + per-element).
- Layer roles must respect canonical order when present.
- Essential roles: background, hands.
- Optional roles when design needs them: texture_base, decorative_base, dial_markers, complications, hand_cover, foreground_fx.
- Keep schema strict at top-level but flexible inside each required model.
- No prose, no markdown, no comments.
- Return JSON object only.`;
};

export const ANALYSIS_COMPILER_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'requirementsModel',
    'geometryModel',
    'layerModel',
    'lightingModel',
    'colorModel',
    'textureModel',
    'complianceHints',
  ],
  properties: {
    requirementsModel: { type: 'object', additionalProperties: true },
    geometryModel: { type: 'object', additionalProperties: true },
    layerModel: { type: 'object', additionalProperties: true },
    lightingModel: { type: 'object', additionalProperties: true },
    colorModel: { type: 'object', additionalProperties: true },
    textureModel: { type: 'object', additionalProperties: true },
    complianceHints: {
      type: 'object',
      additionalProperties: true,
      required: ['notes', 'riskyZones'],
      properties: {
        notes: { type: 'array' },
        riskyZones: { type: 'array' },
      },
    },
  },
} as const;
