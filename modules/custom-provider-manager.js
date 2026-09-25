import { createProviderAdapter } from './provider-adapters.js';

export const CUSTOM_PROVIDER_STORAGE_KEY = 'customProviders';
const CUSTOM_RULE_ID_START = 10000;
const CUSTOM_SCRIPT_PREFIX = 'insidebar-custom-provider-';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'provider';
}

function parseHttpsUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Custom providers currently require an https:// URL');
  }
  return url;
}

function normalizeSelectorList(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

async function getEnabledProviderIds() {
  const { enabledProviders = [] } = await chrome.storage.sync.get({ enabledProviders: [] });
  return Array.isArray(enabledProviders) ? enabledProviders : [];
}

async function setEnabledProviderIds(ids) {
  await chrome.storage.sync.set({ enabledProviders: [...new Set(ids)] });
}

export async function getStoredCustomProviders() {
  const result = await chrome.storage.sync.get({ [CUSTOM_PROVIDER_STORAGE_KEY]: [] });
  const providers = result[CUSTOM_PROVIDER_STORAGE_KEY];
  return Array.isArray(providers) ? providers : [];
}

async function saveStoredCustomProviders(providers) {
  await chrome.storage.sync.set({ [CUSTOM_PROVIDER_STORAGE_KEY]: providers });
}

function materializeAdapterConfig(provider) {
  return createProviderAdapter({
    id: provider.id,
    inputSelectors: provider.inputSelectors,
    submitSelectors: provider.submitSelectors || [],
    submitMode: provider.submitMode || 'button',
    capabilities: {
      inject: true,
      autoSubmit: provider.autoSubmit !== false,
      history: false
    }
  });
}

export function customProviderRecordToDefinition(provider) {
  const adapter = materializeAdapterConfig(provider);

  return {
    id: provider.id,
    name: provider.name,
    url: provider.url,
    icon: '/icons/icon-32.png',
    iconDark: '/icons/icon-32.png',
    enabled: true,
    custom: true,
    originPattern: provider.originPattern,
    adapter
  };
}

async function allocateRuleId(existingProviders) {
  const used = new Set(
    existingProviders
      .map(provider => Number(provider.ruleId))
      .filter(Number.isInteger)
  );

  let candidate = CUSTOM_RULE_ID_START;
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

function buildContentScriptId(providerId) {
  return `${CUSTOM_SCRIPT_PREFIX}${providerId}`;
}

async function registerProviderContentScript(provider) {
  if (!chrome.scripting?.registerContentScripts) {
    throw new Error('Dynamic content scripts are not supported by this browser');
  }

  const scriptId = provider.contentScriptId || buildContentScriptId(provider.id);

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
  } catch (_) {
    // It is fine if the script was not registered yet.
  }

  await chrome.scripting.registerContentScripts([{
    id: scriptId,
    matches: [provider.originPattern],
    js: ['content-scripts/text-injection-all-providers.js'],
    runAt: 'document_end',
    allFrames: true,
    persistAcrossSessions: true
  }]);
}

async function registerProviderFrameRule(provider) {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [provider.ruleId],
    addRules: [{
      id: provider.ruleId,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'X-Frame-Options', operation: 'remove' },
          { header: 'Content-Security-Policy', operation: 'remove' }
        ]
      },
      condition: {
        urlFilter: provider.originPattern,
        resourceTypes: ['sub_frame']
      }
    }]
  });
}

async function hasHostPermission(originPattern) {
  return chrome.permissions.contains({ origins: [originPattern] });
}

async function requestHostPermission(originPattern) {
  // Keep request() directly in the user-initiated install flow. Calling it for
  // an already granted origin simply resolves true without another prompt.
  return chrome.permissions.request({
    origins: [originPattern]
  });
}

export async function installCustomProvider(config) {
  const name = String(config?.name || '').trim();
  if (!name) {
    throw new Error('Provider name is required');
  }

  const url = parseHttpsUrl(String(config?.url || '').trim());
  const originPattern = `${url.origin}/*`;
  const inputSelectors = normalizeSelectorList(config.inputSelectors);
  const submitSelectors = normalizeSelectorList(config.submitSelectors);
  const submitMode = config.submitMode === 'enter' ? 'enter' : 'button';
  const autoSubmit = config.autoSubmit !== false;

  // Validate the adapter before prompting the user for host access.
  materializeAdapterConfig({
    id: 'custom-validation',
    inputSelectors,
    submitSelectors,
    submitMode,
    autoSubmit
  });

  const granted = await requestHostPermission(originPattern);
  if (!granted) {
    throw new Error(`Permission was not granted for ${url.origin}`);
  }

  const existing = await getStoredCustomProviders();
  const duplicate = existing.find(provider => provider.url === url.toString() || provider.name === name);
  if (duplicate) {
    throw new Error('A custom provider with the same name or URL already exists');
  }

  const suffix = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

  const id = `custom-${slugify(name)}-${suffix}`;
  const ruleId = await allocateRuleId(existing);
  const contentScriptId = buildContentScriptId(id);

  const provider = {
    id,
    name,
    url: url.toString(),
    originPattern,
    inputSelectors,
    submitSelectors,
    submitMode,
    autoSubmit,
    ruleId,
    contentScriptId,
    createdAt: Date.now()
  };

  await registerProviderContentScript(provider);
  await registerProviderFrameRule(provider);

  await saveStoredCustomProviders([...existing, provider]);

  const enabledProviders = await getEnabledProviderIds();
  await setEnabledProviderIds([...enabledProviders, id]);

  return provider;
}

export async function removeCustomProvider(providerId) {
  const existing = await getStoredCustomProviders();
  const provider = existing.find(item => item.id === providerId);
  if (!provider) return false;

  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [provider.contentScriptId || buildContentScriptId(provider.id)]
    });
  } catch (_) {
    // Ignore missing registrations.
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [provider.ruleId]
    });
  } catch (_) {
    // Ignore missing rules.
  }

  const remaining = existing.filter(item => item.id !== providerId);
  await saveStoredCustomProviders(remaining);

  const enabledProviders = await getEnabledProviderIds();
  await setEnabledProviderIds(enabledProviders.filter(id => id !== providerId));

  const { defaultProvider } = await chrome.storage.sync.get({ defaultProvider: 'chatgpt' });
  if (defaultProvider === providerId) {
    await chrome.storage.sync.set({ defaultProvider: 'chatgpt' });
  }

  const sameOriginStillUsed = remaining.some(item => item.originPattern === provider.originPattern);
  if (!sameOriginStillUsed) {
    try {
      await chrome.permissions.remove({ origins: [provider.originPattern] });
    } catch (_) {
      // Removing optional permission is best-effort.
    }
  }

  return true;
}

export async function repairCustomProviderRegistrations() {
  const providers = await getStoredCustomProviders();

  for (const provider of providers) {
    try {
      const granted = await hasHostPermission(provider.originPattern);
      if (!granted) continue;

      await registerProviderContentScript(provider);
      await registerProviderFrameRule(provider);
    } catch (error) {
      console.warn('[Custom Provider] Registration repair failed:', provider.id, error);
    }
  }
}
