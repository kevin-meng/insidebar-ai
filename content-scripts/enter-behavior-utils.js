// Shared utilities for Enter key behavior modification
// Supports customizable key combinations for newline and send actions

let enterKeyConfig = null;

function enableEnterSwap() {
  window.addEventListener("keydown", handleEnterSwap, { capture: true });
}

function disableEnterSwap() {
  window.removeEventListener("keydown", handleEnterSwap, { capture: true });
}

// Check if the key press belongs to an IME (e.g., Enter confirming a Japanese or
// Chinese conversion). isComposing alone is not enough: compositionend can fire
// *before* the confirming keydown, leaving isComposing false. keyCode is still 229
// in that case. See https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
function isImeKeyEvent(event) {
  return event.isComposing || event.keyCode === 229;
}

// Check if event matches the configured modifiers
function matchesModifiers(event, modifiers) {
  return event.shiftKey === (modifiers.shift || false) &&
         event.ctrlKey === (modifiers.ctrl || false) &&
         event.altKey === (modifiers.alt || false) &&
         event.metaKey === (modifiers.meta || false);
}

// Get target event modifiers based on action type
function getTargetModifiers(actionType) {
  if (!enterKeyConfig) return null;

  if (actionType === 'newline') {
    return enterKeyConfig.newlineModifiers;
  } else if (actionType === 'send') {
    return enterKeyConfig.sendModifiers;
  }
  return null;
}

function applyEnterSwapSetting() {
  chrome.storage.sync.get({
    enterKeyBehavior: {
      enabled: true,
      preset: 'swapped',
      newlineModifiers: { shift: false, ctrl: false, alt: false, meta: false },
      sendModifiers: { shift: true, ctrl: false, alt: false, meta: false }
    }
  }, (data) => {
    enterKeyConfig = data.enterKeyBehavior;

    if (enterKeyConfig.enabled) {
      enableEnterSwap();
    } else {
      disableEnterSwap();
    }
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enterKeyBehavior) {
    applyEnterSwapSetting();
  }
});
