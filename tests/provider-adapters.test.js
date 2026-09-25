import { describe, expect, it } from 'vitest';
import {
  PROVIDER_ADAPTERS,
  createProviderAdapter,
  validateProviderAdapter,
  toRuntimeAdapter
} from '../modules/provider-adapters.js';

describe('provider adapter SDK', () => {
  it('ships valid built-in adapters', () => {
    for (const adapter of Object.values(PROVIDER_ADAPTERS)) {
      expect(validateProviderAdapter(adapter)).toEqual({ valid: true, errors: [] });
    }
  });

  it('rejects adapters without input selectors', () => {
    const validation = validateProviderAdapter({ id: 'broken', inputSelectors: [] });
    expect(validation.valid).toBe(false);
  });

  it('creates a serializable runtime adapter', () => {
    const adapter = createProviderAdapter({
      id: 'example',
      inputSelectors: ['textarea'],
      submitSelectors: ['button[type="submit"]'],
      submitMode: 'button',
      capabilities: { autoSubmit: true }
    });

    expect(toRuntimeAdapter(adapter)).toEqual({
      id: 'example',
      inputSelectors: ['textarea'],
      submitSelectors: ['button[type="submit"]'],
      submitMode: 'button',
      capabilities: {
        inject: true,
        autoSubmit: true,
        history: false
      }
    });
  });
});
