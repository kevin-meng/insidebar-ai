/**
 * One-click provider presets.
 *
 * These selectors are intentionally kept outside the core runtime so they can
 * evolve independently as provider web UIs change.
 */
export const PROVIDER_PRESETS = Object.freeze([
  Object.freeze({
    id: 'kimi',
    name: 'Kimi',
    url: 'https://www.kimi.com/',
    status: 'experimental',
    inputSelectors: [
      'div[data-testid="chat_input_input"][contenteditable="true"]',
      '.chat-input-editor[contenteditable="true"]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
      '.chat-input-editor',
      'textarea[placeholder*="Ask"]'
    ],
    submitMode: 'button',
    submitSelectors: [
      '.send-button-container:not(.disabled) .send-button',
      '.send-button-container:not(.disabled)',
      '.send-button',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]'
    ],
    notes: 'Candidate selectors cross-checked against current open-source Kimi web adapters.'
  }),

  Object.freeze({
    id: 'qwen',
    name: 'Qwen',
    url: 'https://chat.qwen.ai/',
    status: 'experimental',
    inputSelectors: [
      'textarea.message-input-textarea',
      '#chat-input',
      'textarea.chat-input',
      'textarea[data-testid="yuntu-textarea"]',
      'textarea[placeholder]',
      'div[contenteditable="true"]'
    ],
    submitMode: 'button',
    submitSelectors: [
      'button.omni-button-content-btn',
      'div.message-input-right-button-send button',
      'button.send-button',
      'div.chat-prompt-send-button button',
      '#send-message-button',
      'button[type="submit"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="Send"]'
    ],
    notes: 'Candidate selectors cross-checked against current open-source Qwen web adapters.'
  }),

  Object.freeze({
    id: 'doubao',
    name: 'Doubao',
    url: 'https://www.doubao.com/chat/',
    status: 'experimental',
    inputSelectors: [
      'textarea.semi-input-textarea',
      'textarea[placeholder="发消息..."]',
      'textarea.semi-input-textarea-autosize',
      '.semi-input-wrapper textarea',
      'textarea.semi-input',
      '[data-slate-editor="true"]',
      'div[contenteditable="true"]',
      'textarea'
    ],
    submitMode: 'button',
    submitSelectors: [
      '[data-testid="chat_input_send"]',
      '.semi-input-wrapper .semi-button[aria-label*="send" i]',
      '.semi-input-wrapper button[semi-icon]',
      '.semi-input-wrapper button[class*="send"]',
      'button[aria-label*="send" i]',
      'button[aria-label*="发送"]',
      '[data-testid="send-button"]',
      'button[class*="send"]'
    ],
    notes: 'Candidate selectors cross-checked against current open-source Doubao web adapters.'
  }),

  Object.freeze({
    id: 'yuanbao',
    name: 'Tencent Yuanbao',
    url: 'https://yuanbao.tencent.com/',
    status: 'experimental',
    inputSelectors: [
      '.chat-command-editor-specail .ql-editor[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      '.ql-editor',
      '[contenteditable="true"]',
      'textarea'
    ],
    submitMode: 'button',
    submitSelectors: [
      '#yuanbao-send-btn',
      'a[class*="send-btn"]',
      'button[class*="send-btn"]',
      'button[class*="submit"]',
      'span.icon-send'
    ],
    notes: 'Candidate selectors cross-checked against current open-source Yuanbao web adapters.'
  })
]);

export function getProviderPreset(id) {
  return PROVIDER_PRESETS.find(preset => preset.id === id) || null;
}
