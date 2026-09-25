import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  PROVIDERS,
  DEFAULT_ENABLED_PROVIDER_IDS
} from '../modules/providers.js';
import { validateProviderAdapter } from '../modules/provider-adapters.js';
import { PROVIDER_PRESETS } from '../modules/provider-presets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function collectJsFiles(relativeDir) {
  const base = path.join(ROOT, relativeDir);
  if (!fs.existsSync(base)) return [];

  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const relative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJsFiles(relative));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(relative);
    }
  }
  return out;
}

const manifest = readJson('manifest.json');
const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const rules = readJson('rules/bypass-headers.json');

assert(manifest.manifest_version === 3, 'manifest.json must use Manifest V3');
assert(
  packageJson.version === manifest.version,
  `package.json version ${packageJson.version} must match manifest version ${manifest.version}`
);
assert(
  packageLock.version === manifest.version,
  `package-lock.json version ${packageLock.version} must match manifest version ${manifest.version}`
);
assert(
  packageLock.packages?.['']?.version === manifest.version,
  'package-lock root package version must match manifest version'
);

for (const permission of [
  'storage',
  'sidePanel',
  'contextMenus',
  'declarativeNetRequest',
  'declarativeNetRequestWithHostAccess',
  'scripting'
]) {
  assert(
    manifest.permissions?.includes(permission),
    `manifest is missing required permission: ${permission}`
  );
}

assert(
  manifest.optional_host_permissions?.includes('https://*/*'),
  'custom providers require optional_host_permissions to include https://*/*'
);

const referencedFiles = new Set();
if (manifest.background?.service_worker) referencedFiles.add(manifest.background.service_worker);
if (manifest.side_panel?.default_path) referencedFiles.add(manifest.side_panel.default_path);
if (manifest.options_page) referencedFiles.add(manifest.options_page);

for (const iconPath of Object.values(manifest.icons || {})) referencedFiles.add(iconPath);
for (const iconPath of Object.values(manifest.action?.default_icon || {})) referencedFiles.add(iconPath);

for (const contentScript of manifest.content_scripts || []) {
  for (const file of contentScript.js || []) referencedFiles.add(file);
  for (const file of contentScript.css || []) referencedFiles.add(file);
}

for (const resource of manifest.declarative_net_request?.rule_resources || []) {
  referencedFiles.add(resource.path);
}

for (const block of manifest.web_accessible_resources || []) {
  for (const resource of block.resources || []) {
    if (!resource.includes('*')) referencedFiles.add(resource);
  }
}

for (const file of referencedFiles) {
  assert(exists(file), `manifest references missing file: ${file}`);
}

const staticRuleIds = rules.map(rule => rule.id);
assert(
  staticRuleIds.every(Number.isInteger),
  'all static DNR rule IDs must be integers'
);
assert(
  new Set(staticRuleIds).size === staticRuleIds.length,
  'static DNR rule IDs must be unique'
);

const providerIds = PROVIDERS.map(provider => provider.id);
assert(
  new Set(providerIds).size === providerIds.length,
  'built-in provider IDs must be unique'
);

for (const providerId of DEFAULT_ENABLED_PROVIDER_IDS) {
  assert(
    providerIds.includes(providerId),
    `default enabled provider is missing from registry: ${providerId}`
  );
}

for (const provider of PROVIDERS) {
  let parsedUrl = null;
  try {
    parsedUrl = new URL(provider.url);
    assert(parsedUrl.protocol === 'https:', `${provider.id} provider URL must use https`);
  } catch {
    errors.push(`${provider.id} provider URL is invalid: ${provider.url}`);
  }

  const adapterValidation = validateProviderAdapter(provider.adapter);
  assert(
    adapterValidation.valid,
    `${provider.id} has invalid adapter: ${adapterValidation.errors.join('; ')}`
  );

  if (!parsedUrl) continue;

  const host = parsedUrl.hostname;
  const hasHostPermission = (manifest.host_permissions || [])
    .some(pattern => pattern.includes(host));
  assert(
    hasHostPermission,
    `${provider.id} is missing static host permission for ${host}`
  );

  const providerScripts = (manifest.content_scripts || []).filter(script =>
    (script.matches || []).some(pattern => pattern.includes(host))
  );
  assert(
    providerScripts.length > 0,
    `${provider.id} has no matching static content script entry for ${host}`
  );
  assert(
    providerScripts.some(script =>
      (script.js || []).includes('content-scripts/text-injection-all-providers.js')
    ),
    `${provider.id} does not load the generic provider runtime`
  );

  assert(
    rules.some(rule => String(rule.condition?.urlFilter || '').includes(host)),
    `${provider.id} has no iframe DNR rule for ${host}`
  );
}

for (const preset of PROVIDER_PRESETS) {
  const validation = validateProviderAdapter({
    id: preset.id,
    inputSelectors: preset.inputSelectors,
    submitSelectors: preset.submitSelectors,
    submitMode: preset.submitMode,
    capabilities: { autoSubmit: true }
  });
  assert(validation.valid, `preset ${preset.id} adapter is invalid`);

  try {
    const url = new URL(preset.url);
    assert(url.protocol === 'https:', `preset ${preset.id} URL must use https`);
  } catch {
    errors.push(`preset ${preset.id} URL is invalid`);
  }
}

const syntaxDirs = [
  'background',
  'content-scripts',
  'modules',
  'options',
  'sidebar',
  'scripts',
  'tests'
];

for (const jsFile of syntaxDirs.flatMap(collectJsFiles)) {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, jsFile)], {
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    errors.push(`JavaScript syntax check failed: ${jsFile}\n${result.stderr.trim()}`);
  }
}

const hasAllUrlsContentScript = (manifest.content_scripts || []).some(script =>
  (script.matches || []).includes('<all_urls>')
);
warn(
  !hasAllUrlsContentScript,
  'manifest still contains a <all_urls> page-content extractor; this is pre-existing broad access and should be reduced in a later security-hardening stage'
);

if (warnings.length) {
  console.warn('\nExtension validation warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error('\nExtension validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Extension validation passed: ${PROVIDERS.length} built-in providers, ${PROVIDER_PRESETS.length} presets, ${rules.length} static DNR rules.`
);
