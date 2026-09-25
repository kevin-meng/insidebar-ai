# Provider Adapter Architecture

insidebar.ai now separates provider-specific DOM knowledge from the sidebar core.

## Goals

- Add new AI web apps without adding vendor branches to the sidebar.
- Broadcast one prompt to multiple selected providers.
- Reuse the user's existing logged-in web sessions instead of model API keys.
- Support built-in adapters and runtime-installed custom web providers.
- Keep host access least-privilege: custom providers request only the origin the user adds.

## Runtime flow

```text
Prompt Workspace
    |
    v
Broadcast Manager (concurrency = 3)
    |
    +--> Provider Registry
    |       |
    |       +--> Built-in Adapter
    |       +--> Custom Adapter
    |
    v
ensureProviderLoaded()
    |
    v
Provider iframe
    |
    v
INSIDEBAR_PROVIDER_REQUEST
    |
    v
Generic provider runtime
    |       |
    |       +--> find input
    |       +--> inject text
    |       +--> click send / press Enter
    |
    v
INSIDEBAR_PROVIDER_RESULT
```

## Built-in adapter

Built-in DOM selectors live in:

`modules/provider-adapters.js`

A provider adapter contains:

```js
createProviderAdapter({
  id: 'example',
  inputSelectors: [
    'textarea',
    'div[contenteditable="true"]'
  ],
  submitSelectors: [
    'button[type="submit"]'
  ],
  submitMode: 'button', // or "enter"
  capabilities: {
    inject: true,
    autoSubmit: true,
    history: false
  }
});
```

The generic content script does not contain provider IDs. The sidebar sends the
serializable adapter to the iframe with each request.

## Adding a built-in provider

For providers such as Kimi, Doubao, Qwen, or Yuanbao:

1. Verify the official web-app URL.
2. Confirm it can render in the side panel.
3. Identify stable input selectors.
4. Identify stable send-button selectors, or use `submitMode: 'enter'`.
5. Add the adapter in `modules/provider-adapters.js`.
6. Add provider metadata in `modules/providers.js`.
7. Add provider icons.
8. If shipping it as a built-in provider, add its host/content-script entry and
   frame rule to the packaged manifest/rules.
9. Add/update tests.

Prefer stable attributes in this order:

1. `data-testid`
2. stable `aria-label`
3. stable element ID
4. semantic role / contenteditable attributes
5. CSS class only as a fallback

Avoid hashed/generated CSS classes when possible.

## Custom Web AI providers

Settings now includes an advanced **Custom Web AI** form.

A custom provider supplies:

- name
- HTTPS web-app URL
- input selectors
- submit mode
- optional send-button selectors

On install, insidebar.ai:

1. requests host permission for that origin only;
2. dynamically registers the generic provider runtime;
3. creates a dynamic DNR rule so the site can be rendered in an iframe;
4. stores the adapter configuration;
5. adds the provider to the enabled provider list.

Dynamic providers are managed by:

`modules/custom-provider-manager.js`

## Multi-AI Broadcast

The Prompt Workspace provider picker is multi-select.

The sender:

- keeps up to three provider jobs active at once;
- lazy-loads provider iframes;
- waits for a provider runtime acknowledgement;
- reports Waiting / Sending / Sent / Failed per provider;
- supports fill-only or Auto send mode.

The concurrency helper is:

`modules/broadcast-manager.js`

## Provider compatibility checklist

Before marking an adapter stable, validate:

- iframe loads
- login session is available inside iframe
- home screen input is detected
- conversation-screen input is detected
- text injection updates the framework state
- send action works
- switching providers preserves session
- Broadcast does not visually switch the active provider
- selectors still work in light/dark and localized UI where relevant

## Planned built-in adapters

Recommended order:

1. Perplexity (existing partial implementation; now registered)
2. Kimi
3. Doubao
4. Qwen
5. Tencent Yuanbao

Custom Web AI can be used for early compatibility experiments before promoting a
provider to the built-in registry.
