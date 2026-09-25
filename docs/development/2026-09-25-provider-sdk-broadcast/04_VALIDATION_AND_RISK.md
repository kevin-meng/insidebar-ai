# 04 · Validation and Risk Report

## 1. Validation boundary

There are two different kinds of confidence in a browser extension that automates third-party AI websites.

### A. Repository / architecture validation

Can be automated here:

- syntax;
- module contracts;
- provider registry consistency;
- manifest/file integrity;
- DNR ID consistency;
- permission declarations;
- adapter schema;
- provider install/remove lifecycle;
- broadcast concurrency behavior;
- existing unit tests;
- CI.

### B. Third-party browser E2E

Requires a real local Chrome/Edge profile:

- extension loaded unpacked;
- real provider login cookies;
- provider iframe rendering;
- current personalized/localized DOM;
- real button click/Enter acceptance;
- provider anti-embedding changes;
- CAPTCHA / QR login / account-specific flows.

The second group cannot be truthfully replaced by unit tests.

---

## 2. Automated checks completed

### Unit tests

The existing suite and the new Provider SDK/Broadcast tests have been run through GitHub Actions.

Final automated result for this documented stage:

- **15 test files passed**
- **202 tests passed**
- architecture validator passed
- 8 built-in providers / 4 presets / 11 static DNR rules validated

Coverage added in this stage includes:

- adapter validation/serialization;
- concurrency limit and failure capture;
- provider preset schema;
- runtime custom provider install lifecycle;
- permission-denied behavior;
- HTTPS-only custom provider policy;
- dynamic registration cleanup/repair;
- partial-install rollback;
- invalid custom-provider fault isolation;
- actual shipped content-script append/replace behavior;
- provider registry expectations.

### Architecture validation

`npm run validate` now checks:

- Manifest V3;
- manifest/package/lock version alignment;
- required MV3 permissions;
- optional runtime host scope declaration;
- manifest referenced files exist;
- DNR static rule IDs unique;
- provider IDs unique;
- enabled defaults valid;
- each built-in provider has:
  - HTTPS URL,
  - adapter,
  - host permission,
  - matching content script,
  - generic runtime,
  - iframe DNR rule;
- preset adapter contract;
- JavaScript syntax.

### Current metadata alignment

- `manifest.json`: 1.7.2
- `package.json`: 1.7.2
- `package-lock.json`: 1.7.2

---

## 3. Current known risks

### Risk R1 · Third-party DOM drift

**Probability:** high over long time horizons  
**Impact:** one provider may fail input/submit while the rest continue working

Mitigation:

- adapter isolation;
- selector fallback arrays;
- visible-element preference;
- preset status;
- per-provider failure UI;
- future Adapter Health Check screen.

---

### Risk R2 · iframe policy/login differences

A site can alter:

- X-Frame-Options;
- CSP;
- cookie SameSite behavior;
- QR/login flows;
- bot checks.

DNR can remove some frame-blocking headers but cannot guarantee the provider will behave identically inside an iframe.

Mitigation:

- Experimental status before E2E;
- future `renderMode: tab` fallback is recommended.

---

### Risk R3 · Synthetic submit events

Some frameworks or sites may reject synthetic keyboard events or expose several icon buttons with similar DOM structure.

Mitigation:

- prefer explicit button selectors;
- allow Enter submit strategy only where appropriate;
- Auto send can be disabled;
- request result exposes submit failures.

DeepSeek currently remains a particular item to verify in real-browser E2E because its web UI has historically used icon-based send controls.

---

### Risk R4 · contenteditable framework state

Kimi/Yuanbao and similar apps may use Lexical/Quill/Slate-style editors.

Mitigation implemented:

- focus target;
- prefer visible editor;
- browser editing pipeline via `execCommand('insertText')` where available;
- InputEvent + change events;
- direct DOM fallback.

Final verification still requires provider-specific E2E.

---

### Risk R5 · broad `<all_urls>` content script remains

The existing page content extractor is statically declared on `<all_urls>`.

This means Provider SDK's per-origin optional permission architecture should **not** be described as making the whole extension least-privilege yet.

Recommended follow-up:

- move generic page extraction toward explicit user action / activeTab / runtime scripting where possible;
- then re-evaluate permission warnings.

---

### Risk R6 · dependency audit findings

GitHub Actions installation reported npm audit findings in the existing development dependency tree.

This stage does not modify runtime third-party dependencies and the extension ships source JS rather than the test toolchain, so dependency remediation is kept separate to avoid mixing an unrelated upgrade into Provider SDK.

Recommended follow-up:

- run a dedicated dependency-upgrade PR;
- review Vitest / happy-dom upgrades;
- rerun full tests after lockfile refresh.

---

## 4. Why the PR remains Draft

The code path has automated coverage, but the new third-party presets have not yet been run against the user's logged-in Chrome profile.

Keeping the PR Draft prevents “CI green” from being confused with “every external website is stable”.

Promotion criteria from Draft:

1. existing provider regression smoke test passes;
2. Multi-AI Broadcast succeeds across at least 3 stable providers;
3. each experimental preset is tested for:
   - iframe load,
   - login state,
   - input detection,
   - injection,
   - submit;
4. failed preset selectors are repaired;
5. results are recorded in `05_MANUAL_E2E_CHECKLIST.md`.

---

## 5. Confidence statement

After automated validation, remaining uncertainty is concentrated in **third-party runtime behavior**, not the internal Provider SDK architecture.

That separation is intentional: the core should be testable and stable even when an individual provider changes its webpage tomorrow.
