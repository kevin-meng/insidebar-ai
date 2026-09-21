// Enter-behavior content scripts must leave IME key presses alone (issue #15).
// Every handler is loaded exactly as manifest.json loads it, then exercised with the
// keydown events browsers produce when Enter confirms an IME conversion.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HANDLER_FILE = /content-scripts\/enter-behavior-(?!utils)(\w+)\.js$/;

// The setting from issue #15: Enter = newline, Cmd+Enter = send
const ENTER_KEY_CONFIG = {
  enabled: true,
  preset: 'custom',
  newlineModifiers: { shift: false, ctrl: false, alt: false, meta: false },
  sendModifiers: { shift: false, ctrl: false, alt: false, meta: true },
};

// happy-dom has no layout, so offsetParent is always null; handlers use it as a visibility check
function markVisible(el) {
  Object.defineProperty(el, 'offsetParent', { get: () => document.body });
  return el;
}

function element(tag, attributes) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  return el;
}

// A prompt box that each provider's handler recognises as its own
const INPUT_FIXTURES = {
  chatgpt: () => element('div', { id: 'prompt-textarea', class: 'ProseMirror', contenteditable: 'true' }),
  claude: () => element('textarea', {}),
  copilot: () => markVisible(element('textarea', { id: 'userInput' })),
  deepseek: () => element('textarea', { placeholder: 'Message DeepSeek' }),
  gemini: () => element('div', { class: 'ql-editor', contenteditable: 'true' }),
  google: () => markVisible(element('textarea', { 'aria-label': 'Ask anything' })),
  grok: () => element('div', { class: 'tiptap', contenteditable: 'true' }),
  perplexity: () => element('div', {
    id: 'ask-input', contenteditable: 'true', 'data-lexical-editor': 'true', role: 'textbox',
  }),
};

// How the Enter that confirms an IME conversion reaches keydown listeners
const IME_CONFIRM_KEYDOWNS = {
  'during composition (Chrome, Edge, Firefox)': { key: 'Process', keyCode: 229, isComposing: true },
  'after compositionend already fired': { key: 'Enter', keyCode: 229, isComposing: false },
};

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'manifest.json'), 'utf8'));
const handlerEntries = manifest.content_scripts.flatMap((entry) => {
  const handler = entry.js.find((file) => HANDLER_FILE.test(file));
  if (!handler) return [];
  const provider = handler.match(HANDLER_FILE)[1];
  return [{ provider, files: entry.js.slice(0, entry.js.indexOf(handler) + 1) }];
});

// Run the scripts the manifest injects, up to and including the handler, in a fresh
// global scope, the way each content script gets its own isolated world.
function loadHandler(files) {
  const source = files.map((file) => readFileSync(resolve(ROOT, file), 'utf8')).join('\n;\n');
  const world = vm.createContext({ window, document, chrome, KeyboardEvent, Event });
  return vm.runInContext(`${source}\nhandleEnterSwap;`, world);
}

function keydown({ key = 'Enter', keyCode = 13, isComposing = false } = {}) {
  return {
    type: 'keydown',
    key,
    code: 'Enter',
    keyCode,
    isComposing,
    isTrusted: true,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  };
}

describe('enter-behavior handlers', () => {
  it('has an input fixture for every handler in manifest.json', () => {
    expect(handlerEntries.length).toBeGreaterThan(0);
    expect(handlerEntries.map((entry) => entry.provider).sort())
      .toEqual(Object.keys(INPUT_FIXTURES).sort());
  });

  describe.each(handlerEntries)('$provider', ({ provider, files }) => {
    let handleEnterSwap;
    let input;

    beforeEach(() => {
      document.body.innerHTML = '';
      chrome.storage.sync.get.mockImplementation((defaults, callback) => {
        callback?.({ enterKeyBehavior: ENTER_KEY_CONFIG });
        return Promise.resolve({ enterKeyBehavior: ENTER_KEY_CONFIG });
      });
      handleEnterSwap = loadHandler(files);

      input = INPUT_FIXTURES[provider]();
      document.body.appendChild(input);
      input.focus();
      expect(document.activeElement).toBe(input);
      vi.spyOn(input, 'dispatchEvent');
    });

    it('intercepts a plain Enter in its prompt box', () => {
      const event = keydown();
      handleEnterSwap(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it.each(Object.entries(IME_CONFIRM_KEYDOWNS))(
      'leaves an IME-confirming Enter alone: %s',
      (_, init) => {
        const before = input.value ?? input.innerHTML;
        const event = keydown(init);

        handleEnterSwap(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
        expect(input.dispatchEvent).not.toHaveBeenCalled();
        expect(input.value ?? input.innerHTML).toBe(before);
      }
    );
  });
});
