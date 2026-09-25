# 02 · Architecture Decisions

This file records the major decisions and their rationale.

---

## ADR-001 · Provider-specific DOM knowledge belongs in Provider Adapters

### Decision

Introduce `modules/provider-adapters.js` and represent each provider with a common contract:

```js
{
  id,
  inputSelectors,
  submitSelectors,
  submitMode,
  capabilities
}
```

The generic runtime receives the adapter instead of branching on provider hostname.

### Why

Vendor DOM changes are inevitable. Centralizing selectors means a provider can be repaired without editing broadcast/sidebar logic.

### Rejected alternative

Continue adding `if (provider === '...')` branches to the generic injection script.

Rejected because it recreates the original coupling and makes every provider a core release.

---

## ADR-002 · Keep browser-session integration as the primary transport

### Decision

Continue embedding/operating official provider web apps using the user's existing browser session.

### Why

- no API-key onboarding for every provider;
- no inference bill is transferred to this extension;
- user retains access to provider-specific subscriptions/features;
- fits the repository's existing product architecture.

### Trade-off

Web UI automation is more fragile than APIs. DOM compatibility therefore needs explicit health checks and versioned adapters.

---

## ADR-003 · Built-in, Preset and Custom are three different support levels

### Decision

Support three provider tiers:

1. **Built-in** — packaged and maintained in the extension.
2. **Preset / Experimental** — one-click configuration, but not yet promoted to stable built-in support.
3. **Custom Web AI** — advanced user supplies URL/selectors.

### Why

A binary “supported / unsupported” model is too restrictive.

The three-tier model gives common providers a low-friction path while allowing new providers to be tested without immediately expanding permanent manifest coupling.

---

## ADR-004 · Runtime-discovered providers use optional host permissions

### Decision

Declare `https://*/*` under `optional_host_permissions`, but request only the specific provider origin when a user clicks Install/Add.

Example:

```js
chrome.permissions.request({
  origins: ['https://www.kimi.com/*']
})
```

### Why

Chrome's Permissions API is designed for optional capabilities discovered at runtime. It allows permission prompts to be tied to the user's explicit action.

Official reference:
- https://developer.chrome.com/docs/extensions/reference/api/permissions

### Important caveat

The repository still contains a **pre-existing** static `<all_urls>` content script for page-content extraction.

Therefore this stage improves the architecture of provider installation, but it does **not yet** make the whole extension least-privilege. Reducing the existing `<all_urls>` access is recorded as separate security-hardening technical debt.

---

## ADR-005 · Dynamic providers register scripts and DNR rules at runtime

### Decision

A custom/preset provider installation performs:

```text
user clicks Install
    ↓
request provider-origin permission
    ↓
register generic content script
    ↓
add dynamic DNR iframe rule
    ↓
persist provider config
    ↓
enable provider
```

The extension repairs persisted registrations on install/startup.

### Why

Chrome MV3 provides exactly these runtime mechanisms:

- `chrome.scripting.registerContentScripts()`
- `chrome.declarativeNetRequest.updateDynamicRules()`

Official references:
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest

Dynamic DNR rules persist across browser sessions and extension upgrades, which fits provider installation semantics.

---

## ADR-006 · Broadcast loads providers without visually switching the active UI

### Decision

Add `ensureProviderLoaded(providerId)` and separate “iframe readiness” from “active provider selection”.

### Why

The previous `switchProvider()` API mixed two responsibilities:

- make iframe ready;
- change visible UI.

Broadcasting to four AIs should not flicker through four side-panel views.

---

## ADR-007 · Broadcast concurrency is limited to 3

### Decision

Use a small worker pool through `modules/broadcast-manager.js`, default concurrency = 3.

### Why

Each provider is a real web app iframe. Starting many simultaneously can cause:

- memory spikes;
- CPU spikes;
- login/session race conditions;
- slower first response;
- browser instability.

Three is a conservative initial limit. It is intentionally a product-safety default rather than a theoretical maximum.

---

## ADR-008 · Provider runtime must acknowledge success/failure

### Decision

Replace fire-and-forget `INJECT_TEXT` semantics with:

```text
INSIDEBAR_PROVIDER_REQUEST
        ↓
input detection
        ↓
injection
        ↓
optional submit
        ↓
INSIDEBAR_PROVIDER_RESULT
```

The parent validates that the result comes from the expected iframe window.

### Why

“postMessage was delivered” does not mean “the AI received the prompt”.

The UI can now distinguish:

- Waiting
- Sending/Filling
- Sent/Filled
- Failed

with concrete errors such as `input_not_found` or `submit_button_not_found`.

---

## ADR-009 · Broadcast uses replace semantics; contextual injection keeps append semantics

### Decision

Prompt Workspace Broadcast sends the **exact workspace prompt** using `insertionMode: 'replace'`.

Existing context-menu text injection keeps default `append` behavior.

### Why

When comparing multiple AIs, an old unsent draft in one provider must not contaminate the shared prompt.

At the same time, context-menu injection historically appended selected/page text into the current provider composer, so preserving append avoids an unrelated behavior regression.

---

## ADR-010 · Auto-send is explicit and can be disabled

### Decision

Prompt Workspace contains an **Auto send** toggle.

- enabled: inject and submit;
- disabled: only fill provider composers.

### Why

Auto-submit is convenient for parallel comparison but is also the more fragile/destructive action.

Fill-only mode provides a safe fallback when a provider's submit selector breaks or the user wants to review the prompt first.

---

## ADR-011 · Kimi/Qwen/Doubao/Yuanbao remain Experimental until real-browser E2E

### Decision

Ship one-click presets but label them Experimental.

### Evidence used

Selectors were cross-checked against multiple current open-source browser adapters, and official web entry points were re-verified on 2026-09-25.

Official web entry examples:

- Kimi: https://www.kimi.com/
- Qwen Studio: https://chat.qwen.ai/
- Doubao: https://www.doubao.com/
- Tencent Yuanbao: https://yuanbao.tencent.com/

### Why not mark Stable yet

Automated tests can validate the adapter schema and install lifecycle, but cannot prove:

- provider iframe accepts embedding today;
- login cookies are available inside that iframe;
- a specific logged-in account receives the same UI variant;
- dynamic DOM buttons accept synthetic click/keyboard events.

Those require real Chrome/Edge E2E.

---

## ADR-012 · Answer aggregation is postponed

### Decision

Do not couple response extraction to Broadcast V1.

### Why

Sending a prompt requires finding one composer and one send action.

Extracting complete responses must additionally handle:

- streaming state;
- reasoning sections;
- citations;
- tool calls;
- markdown/code blocks;
- regeneration branches;
- DOM virtualization.

Keeping these stages separate prevents a fragile response extractor from blocking the more valuable multi-send workflow.
