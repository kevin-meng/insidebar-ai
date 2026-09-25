# 01 · Requirements and Baseline

## 1. Product requirement

The original extension supported a fixed set of AI web providers. The new requirement is broader:

- continue supporting existing providers;
- make it inexpensive to add providers such as Kimi, Doubao, Qwen, Tencent Yuanbao and future AI products;
- allow a user to type one prompt once and select multiple AIs to receive the same prompt;
- preserve the current browser-session model instead of requiring every user to configure API keys;
- avoid making the core sidebar aware of every vendor's DOM implementation.

The desired product direction is a **Multi-AI Browser Workspace**, not a collection of hard-coded iframe exceptions.

## 2. Baseline architecture before this stage

The extension already had several useful foundations:

- Chrome Manifest V3 side panel;
- one iframe per provider;
- iframe reuse through `loadedIframes`;
- existing browser login/cookie sessions;
- a Prompt Workspace textarea;
- per-provider content scripts;
- static DNR rules used to remove iframe-blocking response headers;
- provider-specific history extraction.

However, adding a provider required touching multiple unrelated files.

### Coupling points found

A provider name/domain was effectively duplicated across:

- `modules/providers.js`
- `manifest.json`
- `rules/bypass-headers.json`
- `content-scripts/text-injection-all-providers.js`
- settings/default provider lists
- context-menu provider names
- provider-specific Enter/history scripts

This created two maintenance problems:

1. **change amplification** — adding one provider meant editing several subsystems;
2. **configuration drift** — default provider lists were already inconsistent across modules.

## 3. Existing partial Perplexity implementation

The repository already contained Perplexity-specific files and permissions, but Perplexity was not registered as a normal provider and did not load the generic text-injection runtime.

This made Perplexity a useful first integration test: it exposed whether the new architecture could convert a partially integrated provider into a first-class provider without new core branches.

## 4. Existing Prompt Workspace limitation

The Prompt Workspace already had a unified textarea, but it selected exactly one provider.

The previous flow was:

```text
workspace text
    ↓
selectedWorkspaceProvider
    ↓
switchProvider()
    ↓
postMessage(INJECT_TEXT)
```

Two limitations followed:

- it visually switched to each provider;
- postMessage delivery was treated as success even though the provider page might never have found the input or submitted the message.

## 5. Non-goals for this stage

The following are deliberately **not** treated as required for this stage:

- API-based model aggregation;
- extracting all provider answers into one normalized response model;
- synthesizing/auto-ranking answers;
- bypassing provider authentication;
- guaranteeing permanent compatibility with third-party DOMs.

Response extraction is significantly more brittle than prompt delivery and should remain a separate stage.

## 6. Success criteria

This stage is considered code-complete when:

- provider DOM knowledge is isolated behind adapters;
- built-in provider defaults come from one registry;
- Prompt Workspace supports multi-select broadcast;
- broadcast receives provider-runtime acknowledgement;
- runtime custom providers can request per-origin host access;
- dynamic content scripts and dynamic iframe rules can be installed/removed;
- Kimi / Qwen / Doubao / Yuanbao have one-click experimental presets;
- CI validates tests, manifest integrity, provider registry and syntax;
- design and validation documentation is committed.

Final stability still requires browser E2E because third-party login/iframe/DOM behavior cannot be proven in unit tests.
