import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PROVIDERS,
  getProviderById,
  getProviderByIdWithSettings,
  getEnabledProviders,
} from '../modules/providers.js';

describe('providers module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PROVIDERS constant', () => {
    it('should contain all expected providers', () => {
      expect(PROVIDERS).toHaveLength(8);
      const providerIds = PROVIDERS.map((p) => p.id);
      expect(providerIds).toEqual([
        'chatgpt',
        'claude',
        'gemini',
        'google',
        'grok',
        'copilot',
        'deepseek',
        'perplexity',
      ]);
    });

    it('should have required properties for each provider', () => {
      PROVIDERS.forEach((provider) => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('url');
        expect(provider).toHaveProperty('icon');
        expect(provider).toHaveProperty('iconDark');
        expect(provider).toHaveProperty('enabled');
        expect(provider).toHaveProperty('adapter');
        expect(provider.adapter).toBeTruthy();
      });
    });
  });

  describe('getProviderById', () => {
    it('should return provider by id', () => {
      const provider = getProviderById('chatgpt');

      expect(provider).toBeDefined();
      expect(provider.id).toBe('chatgpt');
      expect(provider.name).toBe('ChatGPT');
    });

    it('should return undefined for non-existent provider', () => {
      const provider = getProviderById('nonexistent');

      expect(provider).toBeUndefined();
    });
  });

  describe('getProviderByIdWithSettings', () => {
    it('should return provider with default URL', async () => {
      chrome.storage.sync.get.mockResolvedValue({});

      const provider = await getProviderByIdWithSettings('chatgpt');

      expect(provider).toBeDefined();
      expect(provider.url).toBe('https://chatgpt.com');
    });

    it('should return null for non-existent provider', async () => {
      const provider = await getProviderByIdWithSettings('nonexistent');

      expect(provider).toBeNull();
    });
  });

  describe('custom provider fault isolation', () => {
    it('skips invalid custom provider records without breaking built-in providers', async () => {
      chrome.storage.sync.get.mockImplementation((defaults) => {
        if (Object.hasOwn(defaults, 'customProviders')) {
          return Promise.resolve({
            customProviders: [{
              id: 'custom-broken',
              name: 'Broken AI',
              url: 'https://broken.example.com',
              inputSelectors: []
            }]
          });
        }

        if (Object.hasOwn(defaults, 'enabledProviders')) {
          return Promise.resolve({
            enabledProviders: ['chatgpt', 'custom-broken']
          });
        }

        return Promise.resolve(defaults);
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const providers = await getEnabledProviders();

      expect(providers.map(provider => provider.id)).toEqual(['chatgpt']);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('getEnabledProviders', () => {
    it('should return enabled providers from settings', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        enabledProviders: ['chatgpt', 'claude'],
      });

      const providers = await getEnabledProviders();

      expect(providers).toHaveLength(2);
      expect(providers[0].id).toBe('chatgpt');
      expect(providers[1].id).toBe('claude');
    });

    it('should use default settings when not provided', async () => {
      chrome.storage.sync.get.mockImplementation((defaults) =>
        Promise.resolve(defaults)
      );

      const providers = await getEnabledProviders();

      expect(providers.length).toBeGreaterThan(0);
    });
  });
});
