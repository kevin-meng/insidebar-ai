/**
 * Provider Adapter SDK
 *
 * Provider-specific DOM knowledge lives here so the sidebar and generic
 * content-script runtime do not need vendor-specific branches.
 */

function freezeAdapter(adapter) {
  return Object.freeze({
    ...adapter,
    inputSelectors: Object.freeze([...(adapter.inputSelectors || [])]),
    submitSelectors: Object.freeze([...(adapter.submitSelectors || [])]),
    submitMode: adapter.submitMode || 'button',
    capabilities: Object.freeze({
      inject: true,
      autoSubmit: false,
      history: false,
      ...(adapter.capabilities || {})
    })
  });
}

export function validateProviderAdapter(adapter) {
  const errors = [];

  if (!adapter || typeof adapter !== 'object') {
    return { valid: false, errors: ['Adapter must be an object'] };
  }

  if (!adapter.id || typeof adapter.id !== 'string') {
    errors.push('Adapter id is required');
  }

  if (!Array.isArray(adapter.inputSelectors) || adapter.inputSelectors.length === 0) {
    errors.push('At least one input selector is required');
  }

  if (adapter.inputSelectors?.some(selector => typeof selector !== 'string' || !selector.trim())) {
    errors.push('Input selectors must be non-empty strings');
  }

  if (adapter.submitSelectors && !Array.isArray(adapter.submitSelectors)) {
    errors.push('Submit selectors must be an array');
  }

  if (adapter.submitSelectors?.some(selector => typeof selector !== 'string' || !selector.trim())) {
    errors.push('Submit selectors must be non-empty strings');
  }

  if (adapter.submitMode && !['button', 'enter'].includes(adapter.submitMode)) {
    errors.push('Submit mode must be "button" or "enter"');
  }

  return { valid: errors.length === 0, errors };
}

export function createProviderAdapter(config) {
  const validation = validateProviderAdapter(config);
  if (!validation.valid) {
    throw new Error(`Invalid provider adapter: ${validation.errors.join('; ')}`);
  }
  return freezeAdapter(config);
}

export const PROVIDER_ADAPTERS = Object.freeze({
  chatgpt: createProviderAdapter({
    id: 'chatgpt',
    inputSelectors: ['#prompt-textarea'],
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[data-testid="fruitjuice-send-button"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]'
    ],
    capabilities: { autoSubmit: true, history: true }
  }),

  claude: createProviderAdapter({
    id: 'claude',
    inputSelectors: [
      '.ProseMirror[role="textbox"]',
      '.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"]'
    ],
    submitSelectors: [
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      '[data-testid="send-button"]',
      'button[type="submit"]'
    ],
    capabilities: { autoSubmit: true, history: true }
  }),

  gemini: createProviderAdapter({
    id: 'gemini',
    inputSelectors: ['.ql-editor', 'div[contenteditable="true"][role="textbox"]'],
    submitSelectors: [
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button.send-button',
      'button.submit'
    ],
    capabilities: { autoSubmit: true, history: true }
  }),

  google: createProviderAdapter({
    id: 'google',
    inputSelectors: [
      'textarea.ITIRGe',
      'textarea[aria-label="Ask anything"]',
      'textarea[maxlength="8192"]'
    ],
    submitSelectors: [
      'button[data-xid="input-plate-send-button"]',
      'button[aria-label="Send"]',
      'button.OEueve'
    ],
    capabilities: { autoSubmit: true, history: true }
  }),

  grok: createProviderAdapter({
    id: 'grok',
    inputSelectors: ['textarea', '.tiptap', '.ProseMirror'],
    submitSelectors: [
      'button[type="submit"]',
      'button[aria-label*="Submit"]',
      'button[aria-label*="Send"]'
    ],
    capabilities: { autoSubmit: true, history: true }
  }),

  copilot: createProviderAdapter({
    id: 'copilot',
    inputSelectors: [
      'textarea#userInput',
      'textarea[data-testid="composer-input"]',
      'textarea[placeholder*="Message Copilot"]'
    ],
    submitSelectors: [
      'button[data-testid="submit-button"]',
      'button[aria-label="Submit message"]',
      'button[aria-label*="Submit"]'
    ],
    capabilities: { autoSubmit: true, history: true }
  }),

  deepseek: createProviderAdapter({
    id: 'deepseek',
    inputSelectors: ['textarea.ds-scroll-area', 'textarea'],
    submitSelectors: [],
    submitMode: 'enter',
    capabilities: { autoSubmit: true, history: true }
  }),

  perplexity: createProviderAdapter({
    id: 'perplexity',
    inputSelectors: [
      '#ask-input',
      '[data-lexical-editor="true"][role="textbox"]',
      'div[contenteditable="true"][role="textbox"]'
    ],
    submitSelectors: [
      'button[data-testid="submit-button"]',
      'button[aria-label="Submit"]',
      'button[aria-label*="Submit"]'
    ],
    capabilities: { autoSubmit: true, history: true }
  })
});

export function getProviderAdapter(id) {
  return PROVIDER_ADAPTERS[id] || null;
}

export function toRuntimeAdapter(adapter) {
  if (!adapter) return null;
  return {
    id: adapter.id,
    inputSelectors: [...adapter.inputSelectors],
    submitSelectors: [...adapter.submitSelectors],
    submitMode: adapter.submitMode,
    capabilities: { ...adapter.capabilities }
  };
}
