# 05 · Manual Chrome / Edge E2E Checklist

This is the only part of this stage that requires a real browser profile.

## 1. Load the branch

```bash
git checkout feat/provider-sdk-broadcast
git pull
```

Open:

```text
chrome://extensions
```

Then:

1. enable Developer mode;
2. choose **Load unpacked**;
3. select the repository directory;
4. open the extension side panel.

Record browser version here:

- Browser:
- Version:
- OS:
- Test date:

---

## 2. Existing provider regression

| Provider | iframe | login | fill | auto-send | notes |
|---|---:|---:|---:|---:|---|
| ChatGPT | ☐ | ☐ | ☐ | ☐ | |
| Claude | ☐ | ☐ | ☐ | ☐ | |
| Gemini | ☐ | ☐ | ☐ | ☐ | |
| Google AI Mode | ☐ | ☐ | ☐ | ☐ | |
| Grok | ☐ | ☐ | ☐ | ☐ | |
| Copilot | ☐ | ☐ | ☐ | ☐ | |
| DeepSeek | ☐ | ☐ | ☐ | ☐ | |
| Perplexity | ☐ | ☐ | ☐ | ☐ | |

Test prompt:

```text
Reply with exactly: insidebar-e2e-ok
```

---

## 3. Multi-AI Broadcast

Select at least:

- ChatGPT
- Claude
- Gemini

Prompt:

```text
Reply with exactly: broadcast-e2e-ok
```

Expected:

- all selected providers show Waiting → Sending → Sent;
- no provider tab visibly steals focus during background loading;
- each provider receives the same exact prompt;
- a pre-existing draft is replaced, not concatenated;
- active provider remains usable.

Results:

| Check | Result | Notes |
|---|---|---|
| exact prompt | ☐ | |
| 3-provider broadcast | ☐ | |
| statuses correct | ☐ | |
| no visual switching | ☐ | |
| replace old draft | ☐ | |

---

## 4. Fill-only mode

Disable **Auto send**.

Prompt:

```text
fill-only-e2e-ok
```

Expected:

- selected providers are filled;
- messages are not submitted;
- status says Filled.

Result:

- ☐ pass
- Notes:

---

## 5. Provider preset installation

Open Settings → Provider Presets.

### Kimi

- ☐ permission prompt names Kimi origin
- ☐ iframe loads
- ☐ login works / existing session visible
- ☐ input detected
- ☐ fill works
- ☐ auto-send works
- Error code / console output:

### Qwen

- ☐ permission prompt names Qwen origin
- ☐ iframe loads
- ☐ login works / existing session visible
- ☐ input detected
- ☐ fill works
- ☐ auto-send works
- Error code / console output:

### Doubao

- ☐ permission prompt names Doubao origin
- ☐ iframe loads
- ☐ login works / existing session visible
- ☐ input detected
- ☐ fill works
- ☐ auto-send works
- Error code / console output:

### Tencent Yuanbao

- ☐ permission prompt names Yuanbao origin
- ☐ iframe loads
- ☐ login works / existing session visible
- ☐ input detected
- ☐ fill works
- ☐ auto-send works
- Error code / console output:

---

## 6. Custom Provider lifecycle

Use an expendable/known provider URL for this test.

- ☐ Add custom provider
- ☐ origin permission requested
- ☐ provider appears in sidebar selector
- ☐ fill/submit behavior works
- ☐ browser restart preserves provider
- ☐ Remove custom provider
- ☐ provider disappears
- ☐ re-install works

---

## 7. Failure behavior

Temporarily use an intentionally invalid selector in Custom Web AI.

Expected:

- request does not hang forever;
- provider status becomes Failed;
- error is observable;
- other selected providers still complete successfully.

- ☐ pass

---

## 8. Acceptance decision

### Promote to stable

A preset can move from Experimental to Stable only when its:

- iframe;
- login;
- input;
- injection;
- submit

all pass in a real browser.

### PR merge

- ☐ existing providers regression pass
- ☐ Broadcast pass
- ☐ critical presets repaired or explicitly left Experimental
- ☐ no new blocking console errors
- ☐ final CI green
- ☐ PR converted from Draft
