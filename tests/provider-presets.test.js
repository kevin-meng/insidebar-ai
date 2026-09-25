import { describe, expect, it } from 'vitest';
import { PROVIDER_PRESETS, getProviderPreset } from '../modules/provider-presets.js';
import { validateProviderAdapter } from '../modules/provider-adapters.js';

describe('provider presets', () => {
  it('contains the initial China AI preset catalog', () => {
    expect(PROVIDER_PRESETS.map(preset => preset.id)).toEqual([
      'kimi',
      'qwen',
      'doubao',
      'yuanbao'
    ]);
  });

  it('uses https web apps and valid adapter configuration', () => {
    for (const preset of PROVIDER_PRESETS) {
      expect(new URL(preset.url).protocol).toBe('https:');

      const validation = validateProviderAdapter({
        id: preset.id,
        inputSelectors: preset.inputSelectors,
        submitSelectors: preset.submitSelectors,
        submitMode: preset.submitMode,
        capabilities: { autoSubmit: true }
      });

      expect(validation).toEqual({ valid: true, errors: [] });
    }
  });

  it('retrieves presets by id', () => {
    expect(getProviderPreset('kimi')?.name).toBe('Kimi');
    expect(getProviderPreset('missing')).toBeNull();
  });
});
