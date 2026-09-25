import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('provider runtime content script', () => {
  let runtime;

  beforeAll(() => {
    globalThis.__INSIDEBAR_PROVIDER_RUNTIME_TEST__ = true;

    const source = fs.readFileSync(
      path.resolve('content-scripts/text-injection-all-providers.js'),
      'utf8'
    );

    // Execute the actual shipped content script, then access its test-only hook.
    // eslint-disable-next-line no-eval
    eval(source);
    runtime = globalThis.__insidebarProviderRuntimeTest;
  });

  afterAll(() => {
    delete globalThis.__INSIDEBAR_PROVIDER_RUNTIME_TEST__;
    delete globalThis.__insidebarProviderRuntimeTest;
  });

  it('exposes the shipped runtime helpers only under the test flag', () => {
    expect(runtime).toBeDefined();
    expect(typeof runtime.injectTextIntoElement).toBe('function');
  });

  it('appends to textarea in append mode', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'before-';
    document.body.appendChild(textarea);

    expect(runtime.injectTextIntoElement(textarea, 'after', 'append')).toBe(true);
    expect(textarea.value).toBe('before-after');

    textarea.remove();
  });

  it('replaces textarea content in replace mode', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'stale draft';
    document.body.appendChild(textarea);

    expect(runtime.injectTextIntoElement(textarea, 'shared prompt', 'replace')).toBe(true);
    expect(textarea.value).toBe('shared prompt');

    textarea.remove();
  });

  it('appends to contenteditable in append mode', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.textContent = 'before-';
    document.body.appendChild(editor);

    expect(runtime.injectTextIntoElement(editor, 'after', 'append')).toBe(true);
    expect(editor.textContent).toBe('before-after');

    editor.remove();
  });

  it('replaces contenteditable content in replace mode', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.textContent = 'stale draft';
    document.body.appendChild(editor);

    expect(runtime.injectTextIntoElement(editor, 'shared prompt', 'replace')).toBe(true);
    expect(editor.textContent).toBe('shared prompt');

    editor.remove();
  });

  it('dispatches input/change when a textarea is updated', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    let inputCount = 0;
    let changeCount = 0;
    textarea.addEventListener('input', () => inputCount += 1);
    textarea.addEventListener('change', () => changeCount += 1);

    runtime.injectTextIntoElement(textarea, 'hello', 'replace');

    expect(inputCount).toBe(1);
    expect(changeCount).toBe(1);

    textarea.remove();
  });

  it('rejects non-editable targets', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    expect(runtime.injectTextIntoElement(div, 'hello', 'replace')).toBe(false);

    div.remove();
  });
});
