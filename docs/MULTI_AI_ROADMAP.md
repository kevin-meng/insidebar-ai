# Multi-AI Workspace Roadmap

## Implemented in `feat/provider-sdk-broadcast`

- Provider Adapter SDK
- Adapter-driven generic injection runtime
- Perplexity promoted into the provider registry
- Multi-provider selection in Prompt Workspace
- Broadcast worker pool with concurrency limit
- Provider request acknowledgement and status reporting
- Auto-send / fill-only modes
- Runtime custom provider installation
- Per-origin optional host permission
- Dynamic content-script registration
- Dynamic iframe DNR rules
- Custom provider settings UI
- GitHub Actions unit-test workflow

## Next implementation targets

### 1. Preset adapter catalog

Ship verified one-click presets for:

- Kimi
- Doubao
- Qwen
- Tencent Yuanbao

A preset should contain URL, selectors, submit strategy, icon, and compatibility
metadata. Users should not need to enter selectors for common providers.

### 2. Adapter health checks

Add a provider diagnostics screen:

```text
Kimi
  iframe ........ OK
  login ......... OK
  input ......... OK
  inject ........ OK
  submit ........ OK
```

This will make DOM breakage easy to detect after providers update their sites.

### 3. Result comparison

Keep response extraction separate from sending. Sending is relatively stable;
reading responses is more DOM-sensitive.

Recommended sequence:

- response-ready detection
- provider-specific response extractors
- side-by-side result view
- optional synthesis after the user explicitly chooses results to compare

### 4. Adapter versioning

Store:

- adapter version
- last verified date
- provider web-app version/signature when observable
- selector fallback count
- last compatibility result

This makes it possible to update an adapter without changing the core.
