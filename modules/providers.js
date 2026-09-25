import { getProviderAdapter } from './provider-adapters.js';

export const DEFAULT_ENABLED_PROVIDER_IDS = Object.freeze([
  'chatgpt',
  'claude',
  'gemini',
  'google',
  'grok',
  'copilot',
  'deepseek',
  'perplexity'
]);

const providerDefinitions = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    icon: '/icons/providers/chatgpt.png',
    iconDark: '/icons/providers/dark/chatgpt.png'
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    icon: '/icons/providers/claude.png',
    iconDark: '/icons/providers/dark/claude.png'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    icon: '/icons/providers/gemini.png',
    iconDark: '/icons/providers/dark/gemini.png'
  },
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?udm=50',
    icon: '/icons/providers/google.png',
    iconDark: '/icons/providers/dark/google.png'
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com',
    icon: '/icons/providers/grok.png',
    iconDark: '/icons/providers/dark/grok.png'
  },
  {
    id: 'copilot',
    name: 'Microsoft Copilot',
    url: 'https://copilot.microsoft.com',
    icon: '/icons/providers/copilot.png',
    iconDark: '/icons/providers/dark/copilot.png'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: '/icons/providers/deepseek.png',
    iconDark: '/icons/providers/dark/deepseek.png'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    url: 'https://www.perplexity.ai',
    icon: '/icons/providers/perplexity.png',
    iconDark: '/icons/providers/dark/perplexity.png'
  }
];

export const PROVIDERS = Object.freeze(providerDefinitions.map(provider => Object.freeze({
  ...provider,
  enabled: true,
  adapter: getProviderAdapter(provider.id)
})));

export function getProviderById(id) {
  return PROVIDERS.find(provider => provider.id === id);
}

export async function getProviderByIdWithSettings(id) {
  return getProviderById(id) || null;
}

export async function getEnabledProviders() {
  const settings = await chrome.storage.sync.get({
    enabledProviders: [...DEFAULT_ENABLED_PROVIDER_IDS]
  });

  return PROVIDERS.filter(provider => settings.enabledProviders.includes(provider.id));
}
