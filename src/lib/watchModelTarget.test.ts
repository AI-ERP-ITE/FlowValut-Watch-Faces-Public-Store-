import { describe, expect, it } from 'vitest';
import { resolveUniqueTargetByResolution, resolveWatchModelTarget } from './watchModelTarget';

const models = {
  'balance-2': { name: 'Amazfit Balance 2', specGroup: '480-round-v2' },
  'active-2-square': { name: 'Active 2 Square', specGroup: '390x450-square-v2' },
};

describe('resolveWatchModelTarget', () => {
  it('resolves a canonical model id', () => {
    expect(resolveWatchModelTarget('balance-2', models)).toEqual({
      modelId: 'balance-2',
      specGroup: '480-round-v2',
    });
  });

  it('resolves exact and vendor-prefixed display names', () => {
    expect(resolveWatchModelTarget('Amazfit Balance 2', models)?.specGroup).toBe('480-round-v2');
    expect(resolveWatchModelTarget('Amazfit Active 2 Square', models)?.specGroup).toBe('390x450-square-v2');
  });

  it('does not guess when normalized names are ambiguous', () => {
    expect(resolveWatchModelTarget('AMAZFIT_balance-2', {
      first: models['balance-2'],
      second: { name: 'Balance 2', specGroup: 'other-target' },
    })).toBeNull();
  });
});

describe('resolveUniqueTargetByResolution', () => {
  it('recovers a single configured target for a legacy blank build', () => {
    expect(resolveUniqueTargetByResolution({ width: 480, height: 480 }, {
      '480-round': { resolution: '480x480' },
      '466-round': { resolution: '466x466' },
    })).toBe('480-round');
  });

  it('refuses to guess when multiple targets share a resolution', () => {
    expect(resolveUniqueTargetByResolution({ width: 480, height: 480 }, {
      first: { resolution: '480x480' },
      second: { resolution: '480x480' },
    })).toBeNull();
  });
});
