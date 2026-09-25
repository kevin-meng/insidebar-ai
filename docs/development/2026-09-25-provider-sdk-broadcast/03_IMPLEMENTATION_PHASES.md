# 03 · Implementation Phases

This is the chronological engineering record for the stage.

## Phase 0 · Repository audit

### Work

Inspected:

- provider registry;
- side-panel iframe lifecycle;
- Prompt Workspace;
- generic injection content script;
- provider-specific Enter/history scripts;
- manifest host/content-script declarations;
- static DNR rules;
- settings/options defaults;
- service-worker context menus.

### Findings

- seven providers were registered initially;
- Perplexity existed only partially;
- provider defaults were duplicated/inconsistent;
- Prompt Workspace was already a useful foundation but single-provider only;
- generic injection still contained provider-specific selector branches;
- injection was fire-and-forget.

### Outcome

Chose an Adapter SDK refactor rather than extending hard-coded branches.

---

## Phase 1 · Provider Adapter SDK

### Added

- `modules/provider-adapters.js`

### Changed

- `modules/providers.js`
- settings defaults
- options defaults
- service-worker context menus

### Outcome

Provider metadata/defaults now originate from the registry, and DOM-specific input/submit knowledge is isolated.

Perplexity was promoted into the registered built-in provider list.

---

## Phase 2 · Generic provider runtime

### Changed

- `content-scripts/text-injection-all-providers.js`

### New behavior

The runtime:

- receives adapter configuration;
- searches selector fallbacks;
- prefers visible elements;
- supports textarea/input and contenteditable editors;
- drives native setters/input events;
- uses browser editing behavior for complex contenteditable editors when possible;
- supports button and Enter submit strategies;
- returns explicit success/failure acknowledgements;
- rejects oversized/invalid requests;
- only accepts provider commands from its iframe parent.

### Outcome

The runtime no longer contains vendor IDs.

---

## Phase 3 · Multi-AI Broadcast

### Added

- `modules/broadcast-manager.js`

### Changed

- `sidebar/sidebar.js`
- `sidebar/sidebar.html`
- `sidebar/sidebar.css`

### New behavior

- provider picker is multi-select;
- Prompt Workspace can send to multiple providers;
- worker pool concurrency = 3;
- provider iframes load lazily;
- background provider loading does not visually switch tabs;
- each provider has Waiting/Sending/Sent/Failed status;
- request and iframe waits have timeouts;
- Auto send can be disabled;
- Broadcast uses replace semantics for deterministic comparisons.

---

## Phase 4 · Perplexity completion

### Changed

- `manifest.json`
- `rules/bypass-headers.json`
- Provider Registry / Adapter SDK

### Outcome

The repository's pre-existing Perplexity scripts are now connected to the same runtime path as other built-ins.

---

## Phase 5 · Dynamic Custom Provider installation

### Added

- `modules/custom-provider-manager.js`

### Changed

- `manifest.json`
- service worker
- provider registry

### Runtime lifecycle

Install:

1. validate HTTPS URL + adapter;
2. request provider-origin permission;
3. register generic provider content script;
4. add dynamic iframe DNR rule;
5. persist provider record;
6. add provider ID to enabled providers.

Remove:

1. unregister dynamic script;
2. remove DNR rule;
3. remove provider from storage/enabled list;
4. repair default provider if necessary;
5. remove optional host permission if no other custom provider uses that origin.

Startup/install:

- repair persisted registrations when permission still exists.

---

## Phase 6 · Settings UI for Custom Web AI

### Changed

- `options/options.html`
- `options/options.css`
- `options/options.js`

### New advanced form

Supports:

- provider name;
- HTTPS web-app URL;
- input selectors;
- submit mode;
- send selectors;
- Auto-send capability.

### Design note

Selectors are intentionally an advanced escape hatch, not the expected flow for mainstream users.

---

## Phase 7 · One-click China AI presets

### Added

- `modules/provider-presets.js`

### Presets

- Kimi
- Qwen
- Doubao
- Tencent Yuanbao

### Status

All are **Experimental** until real-browser E2E.

### Selector strategy

Prefer in order:

1. stable test IDs;
2. stable aria labels;
3. element IDs;
4. semantic role/contenteditable attributes;
5. stable CSS classes;
6. generic textarea/contenteditable fallback.

---

## Phase 8 · Testing and CI

### Added tests

- `tests/provider-adapters.test.js`
- `tests/broadcast-manager.test.js`
- `tests/provider-presets.test.js`
- `tests/custom-provider-manager.test.js`

### Updated tests

- provider registry expectations;
- Chrome API mocks for dynamic provider lifecycle.

### CI

Added `.github/workflows/test.yml`.

The first CI run caught a stale expected object in the new Adapter test (`submitMode` was missing from the expected value). The test was corrected and later runs passed.

This failure is intentionally recorded because it demonstrates the value of adding CI before merge.

---

## Phase 9 · Static architecture validator

### Added

- `scripts/validate-extension.mjs`

### Validates

- Manifest V3;
- package/manifest/lockfile version alignment;
- required permissions;
- optional host capability;
- existence of files referenced by the manifest;
- unique static DNR IDs;
- unique provider IDs;
- default provider IDs exist;
- provider URLs use HTTPS;
- every built-in provider has a valid adapter;
- built-ins have host/content-script/runtime/DNR wiring;
- presets have valid adapter contracts;
- JavaScript syntax across source/test directories.

### Warning surfaced

The validator intentionally warns about the pre-existing `<all_urls>` page-content extractor.

That broad permission is not caused by Provider SDK, but it weakens the extension's overall least-privilege posture and should be addressed in a dedicated security-hardening stage.

---

## Phase 10 · Documentation

Durable records added under:

`docs/development/2026-09-25-provider-sdk-broadcast/`

Permanent architecture docs remain in:

- `docs/PROVIDER_ADAPTERS.md`
- `docs/MULTI_AI_ROADMAP.md`

Future implementation stages should follow the same pattern rather than relying on chat history.
