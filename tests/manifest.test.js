#!/usr/bin/env node
/**
 * Regression tests for the manifest rules that have historically been
 * reintroduced by contributors testing against an older CLI.
 *
 * See .claude-plugin/PLUGIN_SCHEMA_NOTES.md.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8')
);
const marketplace = JSON.parse(
  fs.readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8')
);

test('plugin.json does NOT declare an "agents" field', () => {
  assert.ok(
    !('agents' in manifest),
    'the validator rejects any "agents" field with `agents: Invalid input`; ' +
      'agents load from agents/ by convention'
  );
});

test('plugin.json does NOT declare hooks/hooks.json', () => {
  const hooks = Array.isArray(manifest.hooks) ? manifest.hooks : [];
  const declaresStandard = hooks.some(entry =>
    typeof entry === 'string' && entry.replace(/^\.\//, '') === 'hooks/hooks.json'
  );
  assert.ok(
    !declaresStandard,
    'hooks/hooks.json is auto-loaded; declaring it causes `Duplicate hooks file detected`'
  );
});

test('component fields are arrays, not strings', () => {
  for (const field of ['commands', 'skills', 'hooks']) {
    if (manifest[field] === undefined) continue;
    assert.ok(Array.isArray(manifest[field]), `"${field}" must be an array`);
  }
});

test('plugin.json has the required fields', () => {
  for (const field of ['name', 'version', 'description']) {
    assert.ok(manifest[field], `"${field}" is required`);
  }
  assert.match(manifest.version, /^\d+\.\d+\.\d+/, 'version must be semver');
});

test('marketplace version matches plugin version', () => {
  const entry = marketplace.plugins.find(p => p.name === manifest.name);
  assert.ok(entry, `marketplace.json has no entry for "${manifest.name}"`);
  assert.strictEqual(
    entry.version,
    manifest.version,
    'a version skew between the manifests ships the wrong version'
  );
});

test('every hook script referenced in hooks.json exists', () => {
  const hooksPath = path.join(ROOT, 'hooks', 'hooks.json');
  if (!fs.existsSync(hooksPath)) return;

  const config = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
  for (const matchers of Object.values(config.hooks || {})) {
    for (const matcher of matchers) {
      for (const hook of matcher.hooks || []) {
        const scripts = (hook.command || '').match(/scripts\/[\w./-]+\.(?:js|sh|py)/g) || [];
        for (const script of scripts) {
          assert.ok(
            fs.existsSync(path.join(ROOT, script)),
            `hook references "${script}", which does not exist`
          );
        }
      }
    }
  }
});
