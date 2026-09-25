# 06 · Follow-up Backlog

This file separates follow-up work from the Provider SDK feature so the current PR does not silently grow without bounds.

## P0 · Real-browser E2E

Required before merging this Draft PR.

Use:

`05_MANUAL_E2E_CHECKLIST.md`

Focus:

- existing built-in provider regression;
- 3+ provider Broadcast;
- Perplexity;
- Kimi;
- Qwen;
- Doubao;
- Tencent Yuanbao.

## P1 · Reduce broad `<all_urls>` access

The repository still contains a pre-existing page-content extractor registered on `<all_urls>`.

Goal:

- investigate moving extraction to explicit user action;
- use `activeTab` / runtime scripting where feasible;
- reduce install-time host-access warnings;
- document any sites that genuinely require persistent access.

This should be a dedicated security-hardening stage because it touches existing page-extraction behavior beyond Provider SDK.

## P1 · Test dependency security refresh

As of 2026-09-25, CI reports:

- 11 npm audit findings;
- 2 moderate;
- 7 high;
- 2 critical.

These are in the development/test toolchain, not bundled runtime AI-provider code, but they should still be remediated.

Current direct dev dependencies include:

- `vitest 3.2.4`
- `@vitest/ui 3.2.4`
- `happy-dom 20.0.2`

Security research on 2026-09-25 indicates later patch releases are available without known direct issues, including Vitest 3.2.7 and happy-dom versions >= 20.8.9.

Do this in a dedicated dependency PR:

1. regenerate lockfile with npm;
2. keep Vitest and @vitest/ui aligned;
3. upgrade happy-dom;
4. run full CI;
5. re-run `npm audit`;
6. record remaining transitive findings.

References:

- https://github.com/vitest-dev/vitest/security/advisories
- https://github.com/capricorn86/happy-dom/security/advisories

## P1 · Provider Health Check screen

Add diagnostics per provider:

```text
iframe ........ OK
runtime ....... OK
input ......... OK
inject ........ OK
submit ........ OK
login ......... UNKNOWN / OK
```

This should become the first troubleshooting surface when a provider updates its DOM.

## P1 · Promote verified presets to Stable

After E2E, move individual presets from Experimental to Stable only when:

- iframe passes;
- login passes;
- input detection passes;
- injection passes;
- auto-submit passes.

Promotion should be per-provider, not all-or-nothing.

## P2 · Tab render fallback

Some providers may become hostile to iframe embedding.

Introduce:

```js
renderMode: 'iframe' | 'tab'
```

A tab-based provider can still use the same Adapter/Broadcast contract while avoiding iframe policy problems.

## P2 · Broadcast presets

Examples:

- Work: ChatGPT + Claude + Gemini
- China AI: Kimi + Qwen + Doubao + Yuanbao
- Research: ChatGPT + Perplexity + Gemini

Keep presets user-editable.

## P2 · Persist Broadcast selections

Store selected Broadcast providers so users do not need to re-select common combinations every session.

## P2 · Response comparison

Treat result extraction as a separate architecture stage:

1. response-ready detection;
2. provider extractors;
3. side-by-side compare;
4. optional synthesis.

Do not couple response extraction failures to prompt sending.
