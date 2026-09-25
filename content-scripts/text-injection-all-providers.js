// Generic provider runtime for text injection + optional submit.
// Provider-specific selectors are supplied by the extension's Provider Adapter SDK.

(function() {
  'use strict';

  const MAX_TEXT_BYTES = 1048576;

  function isValidSelectorList(value) {
    return Array.isArray(value) &&
      value.length > 0 &&
      value.every(selector => typeof selector === 'string' && selector.trim().length > 0);
  }

  function isVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  }

  function findFirst(selectors) {
    if (!Array.isArray(selectors)) return null;

    for (const selector of selectors) {
      try {
        const matches = Array.from(document.querySelectorAll(selector));
        const visible = matches.find(isVisible);
        if (visible) return visible;
        if (matches[0]) return matches[0];
      } catch (error) {
        console.warn('[Provider Runtime] Invalid selector:', selector, error);
      }
    }

    return null;
  }

  function setNativeTextareaValue(element, value) {
    const proto = element.tagName === 'INPUT'
      ? window.HTMLInputElement?.prototype
      : window.HTMLTextAreaElement?.prototype;

    const descriptor = proto
      ? Object.getOwnPropertyDescriptor(proto, 'value')
      : null;

    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  function injectTextIntoElement(element, text) {
    if (!element || typeof text !== 'string' || !text.trim()) {
      return false;
    }

    try {
      const isInput = element.tagName === 'TEXTAREA' || element.tagName === 'INPUT';
      const isContentEditable = element.isContentEditable ||
        element.getAttribute('contenteditable') === 'true';

      if (!isInput && !isContentEditable) {
        return false;
      }

      if (isInput) {
        const currentValue = element.value || '';
        setNativeTextareaValue(element, currentValue + text);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        try {
          element.selectionStart = element.selectionEnd = element.value.length;
        } catch (_) {
          // Some inputs do not expose selection APIs.
        }
      } else {
        element.focus();

        try {
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(element);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (_) {
          // Selection is non-critical.
        }

        // execCommand is deprecated as a general API but remains useful for
        // contenteditable editors because it drives the same browser editing
        // pipeline that Lexical/Quill/Slate listen to. Fall back to direct DOM
        // mutation when a provider does not accept it.
        let inserted = false;
        try {
          inserted = document.execCommand?.('insertText', false, text) === true;
        } catch (_) {
          inserted = false;
        }

        if (!inserted) {
          const currentText = element.textContent || '';
          element.textContent = currentText + text;
        }

        element.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: text
        }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return true;
    } catch (error) {
      console.error('[Provider Runtime] Injection failed:', error);
      return false;
    }
  }

  function isClickable(element) {
    if (!element) return false;
    if (element.disabled) return false;
    if (element.getAttribute('aria-disabled') === 'true') return false;
    return true;
  }

  async function submitPrompt(adapter, input) {
    // Let React/Vue/Lexical update button state after the input event.
    await new Promise(resolve => setTimeout(resolve, 120));

    if (adapter.submitMode === 'enter') {
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      }));
      return { submitted: true };
    }

    const selectors = adapter.submitSelectors || [];
    if (!Array.isArray(selectors) || selectors.length === 0) {
      return { submitted: false, reason: 'submit_not_configured' };
    }

    let button = findFirst(selectors);

    if (!button) {
      // One short retry helps providers that render their send button lazily.
      await new Promise(resolve => setTimeout(resolve, 450));
      button = findFirst(selectors);
    }

    if (!button) {
      return { submitted: false, reason: 'submit_button_not_found' };
    }

    if (!isClickable(button)) {
      return { submitted: false, reason: 'submit_button_disabled' };
    }

    button.click();
    return { submitted: true };
  }

  function reply(requestId, payload) {
    if (!requestId || window === window.top) return;

    window.parent.postMessage({
      type: 'INSIDEBAR_PROVIDER_RESULT',
      requestId,
      ...payload
    }, '*');
  }

  async function handleProviderRequest(event) {
    if (!event?.data || typeof event.data !== 'object') return;
    if (event.data.type !== 'INSIDEBAR_PROVIDER_REQUEST') return;

    // Only accept commands from the iframe parent (the extension side panel).
    if (window === window.top || event.source !== window.parent) return;

    const { requestId, text, adapter, submit = false } = event.data;

    if (!text || typeof text !== 'string' || text.length > MAX_TEXT_BYTES) {
      reply(requestId, {
        success: false,
        injected: false,
        submitted: false,
        error: 'invalid_text'
      });
      return;
    }

    if (!adapter || !isValidSelectorList(adapter.inputSelectors)) {
      reply(requestId, {
        success: false,
        injected: false,
        submitted: false,
        error: 'invalid_adapter'
      });
      return;
    }

    let input = findFirst(adapter.inputSelectors);

    if (!input) {
      await new Promise(resolve => setTimeout(resolve, 800));
      input = findFirst(adapter.inputSelectors);
    }

    if (!input) {
      reply(requestId, {
        success: false,
        injected: false,
        submitted: false,
        error: 'input_not_found'
      });
      return;
    }

    const injected = injectTextIntoElement(input, text);

    if (!injected) {
      reply(requestId, {
        success: false,
        injected: false,
        submitted: false,
        error: 'injection_failed'
      });
      return;
    }

    if (!submit) {
      reply(requestId, {
        success: true,
        injected: true,
        submitted: false
      });
      return;
    }

    const submitResult = await submitPrompt(adapter, input);

    reply(requestId, {
      success: submitResult.submitted,
      injected: true,
      submitted: submitResult.submitted,
      error: submitResult.submitted ? null : submitResult.reason
    });
  }

  window.addEventListener('message', event => {
    handleProviderRequest(event).catch(error => {
      console.error('[Provider Runtime] Request failed:', error);
      reply(event?.data?.requestId, {
        success: false,
        injected: false,
        submitted: false,
        error: 'runtime_error'
      });
    });
  });
})();