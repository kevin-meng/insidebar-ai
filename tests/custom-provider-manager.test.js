import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installCustomProvider,
  removeCustomProvider,
  repairCustomProviderRegistrations
} from '../modules/custom-provider-manager.js';

describe('custom provider manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    chrome.storage.sync.get.mockImplementation(defaults =>
      Promise.resolve(defaults)
    );
    chrome.storage.sync.set.mockResolvedValue();
    chrome.permissions.request.mockResolvedValue(true);
    chrome.permissions.contains.mockResolvedValue(true);
    chrome.permissions.remove.mockResolvedValue(true);
    chrome.scripting.registerContentScripts.mockResolvedValue();
    chrome.scripting.unregisterContentScripts.mockResolvedValue();
    chrome.declarativeNetRequest.updateDynamicRules.mockResolvedValue();
  });

  it('installs a provider with origin-scoped permission, content script and DNR rule', async () => {
    const provider = await installCustomProvider({
      name: 'Example AI',
      url: 'https://ai.example.com/chat',
      inputSelectors: ['textarea'],
      submitSelectors: ['button[type="submit"]'],
      submitMode: 'button',
      autoSubmit: true
    });

    expect(provider.name).toBe('Example AI');
    expect(provider.originPattern).toBe('https://ai.example.com/*');

    expect(chrome.permissions.request).toHaveBeenCalledWith({
      origins: ['https://ai.example.com/*']
    });

    expect(chrome.scripting.registerContentScripts).toHaveBeenCalledTimes(1);
    const scripts = chrome.scripting.registerContentScripts.mock.calls[0][0];
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toEqual(expect.objectContaining({
      matches: ['https://ai.example.com/*'],
      js: ['content-scripts/text-injection-all-providers.js'],
      allFrames: true,
      persistAcrossSessions: true
    }));

    expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith(
      expect.objectContaining({
        addRules: [
          expect.objectContaining({
            action: expect.objectContaining({ type: 'modifyHeaders' }),
            condition: expect.objectContaining({
              urlFilter: 'https://ai.example.com/*',
              resourceTypes: ['sub_frame']
            })
          })
        ]
      })
    );

    const setCalls = chrome.storage.sync.set.mock.calls.map(call => call[0]);
    expect(setCalls.some(payload =>
      Array.isArray(payload.customProviders) &&
      payload.customProviders.some(item => item.id === provider.id)
    )).toBe(true);
    expect(setCalls.some(payload =>
      Array.isArray(payload.enabledProviders) &&
      payload.enabledProviders.includes(provider.id)
    )).toBe(true);
  });

  it('rejects insecure custom provider URLs before requesting permission', async () => {
    await expect(installCustomProvider({
      name: 'Insecure AI',
      url: 'http://ai.example.com',
      inputSelectors: ['textarea']
    })).rejects.toThrow('https://');

    expect(chrome.permissions.request).not.toHaveBeenCalled();
  });

  it('stops installation when host permission is denied', async () => {
    chrome.permissions.request.mockResolvedValue(false);

    await expect(installCustomProvider({
      name: 'Denied AI',
      url: 'https://denied.example.com',
      inputSelectors: ['textarea']
    })).rejects.toThrow('Permission was not granted');

    expect(chrome.scripting.registerContentScripts).not.toHaveBeenCalled();
    expect(chrome.declarativeNetRequest.updateDynamicRules).not.toHaveBeenCalled();
  });

  it('rolls back a registered content script when DNR installation fails', async () => {
    chrome.declarativeNetRequest.updateDynamicRules.mockRejectedValueOnce(
      new Error('DNR failed')
    );

    await expect(installCustomProvider({
      name: 'Rollback AI',
      url: 'https://rollback.example.com',
      inputSelectors: ['textarea'],
      submitSelectors: ['button[type="submit"]']
    })).rejects.toThrow('DNR failed');

    expect(chrome.scripting.registerContentScripts).toHaveBeenCalledTimes(1);
    expect(chrome.scripting.unregisterContentScripts).toHaveBeenCalledTimes(2);

    const unregisterCalls = chrome.scripting.unregisterContentScripts.mock.calls;
    expect(unregisterCalls[1][0].ids[0]).toContain('insidebar-custom-provider-');

    const setCalls = chrome.storage.sync.set.mock.calls.map(call => call[0]);
    expect(setCalls.some(payload => Array.isArray(payload.customProviders))).toBe(false);
  });

  it('removes runtime registration, storage entry and optional permission', async () => {
    const storedProvider = {
      id: 'custom-example-1234',
      name: 'Example AI',
      url: 'https://ai.example.com/',
      originPattern: 'https://ai.example.com/*',
      inputSelectors: ['textarea'],
      submitSelectors: ['button[type="submit"]'],
      submitMode: 'button',
      autoSubmit: true,
      ruleId: 10003,
      contentScriptId: 'insidebar-custom-provider-custom-example-1234'
    };

    chrome.storage.sync.get.mockImplementation(defaults => {
      if (Object.hasOwn(defaults, 'customProviders')) {
        return Promise.resolve({ customProviders: [storedProvider] });
      }
      if (Object.hasOwn(defaults, 'enabledProviders')) {
        return Promise.resolve({
          enabledProviders: ['chatgpt', storedProvider.id]
        });
      }
      if (Object.hasOwn(defaults, 'defaultProvider')) {
        return Promise.resolve({ defaultProvider: 'chatgpt' });
      }
      return Promise.resolve(defaults);
    });

    await expect(removeCustomProvider(storedProvider.id)).resolves.toBe(true);

    expect(chrome.scripting.unregisterContentScripts).toHaveBeenCalledWith({
      ids: [storedProvider.contentScriptId]
    });
    expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [storedProvider.ruleId]
    });
    expect(chrome.permissions.remove).toHaveBeenCalledWith({
      origins: [storedProvider.originPattern]
    });

    const setCalls = chrome.storage.sync.set.mock.calls.map(call => call[0]);
    expect(setCalls.some(payload =>
      Array.isArray(payload.customProviders) &&
      payload.customProviders.length === 0
    )).toBe(true);
    expect(setCalls.some(payload =>
      Array.isArray(payload.enabledProviders) &&
      !payload.enabledProviders.includes(storedProvider.id)
    )).toBe(true);
  });

  it('repairs persisted registrations only when host permission still exists', async () => {
    const storedProvider = {
      id: 'custom-repair-1234',
      name: 'Repair AI',
      url: 'https://repair.example.com/',
      originPattern: 'https://repair.example.com/*',
      inputSelectors: ['textarea'],
      submitSelectors: [],
      submitMode: 'enter',
      autoSubmit: true,
      ruleId: 10007,
      contentScriptId: 'insidebar-custom-provider-custom-repair-1234'
    };

    chrome.storage.sync.get.mockResolvedValue({
      customProviders: [storedProvider]
    });
    chrome.permissions.contains.mockResolvedValue(true);

    await repairCustomProviderRegistrations();

    expect(chrome.scripting.registerContentScripts).toHaveBeenCalledTimes(1);
    expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(1);
  });
});
