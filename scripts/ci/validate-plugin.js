#!/usr/bin/env node
/**
 * Validate this plugin against the rules the Claude Code plugin validator
 * actually enforces, plus this repo's own conventions.
 *
 * The CLI validator reports failures generically (`agents: Invalid input`), and
 * some failures only surface at install time on someone else's machine. This
 * catches them here instead.
 *
 * See .claude-plugin/PLUGIN_SCHEMA_NOTES.md for why each rule exists.
 *
 * Exit 0 if clean, 1 if any error was found.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const errors = [];
const warnings = [];

/** @param {string} file @param {string} message */
function error(file, message) {
  errors.push(`${file}: ${message}`);
}

/** @param {string} file @param {string} message */
function warn(file, message) {
  warnings.push(`${file}: ${message}`);
}

/** @param {string} relative @returns {string|null} */
function read(relative) {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8').replace(/^﻿/, '');
}

/** @param {string} relative @returns {string[]} */
function listFiles(relative, extension) {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter(name => name.endsWith(extension))
    .sort();
}

/**
 * Parse leading YAML frontmatter. Returns the raw lines so callers can inspect
 * block-scalar indicators, which a value-only parse would hide.
 *
 * @param {string} content
 * @returns {{present: boolean, lines: string[]}}
 */
function frontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { present: false, lines: [] };
  return { present: true, lines: match[1].split(/\r?\n/) };
}

/**
 * Extract top-level keys from frontmatter lines, recording the raw value so
 * block-scalar indicators (`|`, `>`) remain visible.
 *
 * @param {string[]} lines
 * @returns {Record<string, string>}
 */
function frontmatterKeys(lines) {
  const values = Object.create(null);
  let inBlockScalar = false;

  for (const line of lines) {
    if (/^\s/.test(line)) continue; // nested key or block-scalar continuation
    if (!line.trim()) continue;

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      inBlockScalar = false;
      continue;
    }

    const [, key, rawValue] = match;
    values[key] = rawValue.trim();
    inBlockScalar = /^[|>]/.test(rawValue.trim());
    if (inBlockScalar) continue;
  }

  return values;
}

// --------------------------------------------------------------------------
// plugin.json
// --------------------------------------------------------------------------

function validateManifest() {
  const file = '.claude-plugin/plugin.json';
  const raw = read(file);
  if (raw === null) {
    error(file, 'missing - every plugin needs a manifest');
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    error(file, `invalid JSON: ${err.message}`);
    return;
  }

  for (const field of ['name', 'version', 'description']) {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) {
      error(file, `"${field}" is required and must be a non-empty string`);
    }
  }

  if (manifest.name && !/^[a-z0-9][a-z0-9-]*$/.test(manifest.name)) {
    error(file, `"name" must be a lowercase slug, got "${manifest.name}"`);
  }

  if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    error(file, `"version" must be semver, got "${manifest.version}"`);
  }

  // Array-shape rule: strings are rejected by the validator even for one entry.
  for (const field of ['commands', 'skills', 'hooks']) {
    if (manifest[field] === undefined) continue;
    if (!Array.isArray(manifest[field])) {
      error(file, `"${field}" must be an array, got ${typeof manifest[field]}`);
    }
  }

  // `agents` is not in the schema. Any form fails with `agents: Invalid input`.
  if ('agents' in manifest) {
    error(
      file,
      'must NOT declare "agents" - the field is not in the schema and fails the ' +
        'install with `agents: Invalid input`. Agents load from agents/ by convention.'
    );
  }

  // hooks/hooks.json is auto-loaded; declaring it too is a duplicate error.
  if (Array.isArray(manifest.hooks)) {
    for (const entry of manifest.hooks) {
      if (typeof entry === 'string' && /(^|\/)hooks\/hooks\.json$/.test(entry.replace(/^\.\//, ''))) {
        error(
          file,
          'must NOT declare hooks/hooks.json - it is auto-loaded by convention ' +
            'and declaring it causes `Duplicate hooks file detected`.'
        );
      }
    }
  }

  // Root .mcp.json is auto-discovered; the empty object opts out.
  if (fs.existsSync(path.join(ROOT, '.mcp.json')) && manifest.mcpServers === undefined) {
    warn(
      file,
      'a root .mcp.json exists but "mcpServers" is not set - those servers will ' +
        'be bundled into the install. Set "mcpServers": {} to opt out.'
    );
  }

  // Declared component paths must exist.
  for (const field of ['commands', 'skills']) {
    if (!Array.isArray(manifest[field])) continue;
    for (const entry of manifest[field]) {
      if (typeof entry !== 'string') {
        error(file, `"${field}" entries must be strings, got ${typeof entry}`);
        continue;
      }
      if (!fs.existsSync(path.join(ROOT, entry))) {
        error(file, `"${field}" references "${entry}", which does not exist`);
      }
    }
  }

  return manifest;
}

// --------------------------------------------------------------------------
// marketplace.json
// --------------------------------------------------------------------------

function validateMarketplace(manifest) {
  const file = '.claude-plugin/marketplace.json';
  const raw = read(file);
  if (raw === null) return; // optional

  let marketplace;
  try {
    marketplace = JSON.parse(raw);
  } catch (err) {
    error(file, `invalid JSON: ${err.message}`);
    return;
  }

  if (!marketplace.owner || typeof marketplace.owner.name !== 'string') {
    error(file, '"owner.name" is required');
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    error(file, '"plugins" must be a non-empty array');
    return;
  }

  for (const entry of marketplace.plugins) {
    const label = `${file} → plugins[${entry.name || '?'}]`;
    for (const field of ['name', 'source', 'description', 'version']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        error(label, `"${field}" is required`);
      }
    }

    // A version skew between the two manifests ships the wrong version.
    if (manifest && entry.name === manifest.name && entry.version !== manifest.version) {
      error(
        label,
        `version "${entry.version}" does not match plugin.json version "${manifest.version}"`
      );
    }
  }
}

// --------------------------------------------------------------------------
// agents/
// --------------------------------------------------------------------------

function validateAgents() {
  for (const name of listFiles('agents', '.md')) {
    const file = `agents/${name}`;
    const content = read(file);

    if (!content.trim()) {
      error(file, 'is empty');
      continue;
    }

    const fm = frontmatter(content);
    if (!fm.present) {
      error(file, 'missing YAML frontmatter');
      continue;
    }

    const keys = frontmatterKeys(fm.lines);

    if (!keys.name) {
      error(file, 'frontmatter is missing "name"');
    } else if (keys.name !== name.replace(/\.md$/, '')) {
      error(file, `frontmatter name "${keys.name}" does not match filename "${name}"`);
    }

    if (!keys.description) {
      error(file, 'frontmatter is missing "description"');
    } else if (/^[|>]/.test(keys.description)) {
      error(file, '"description" must be an inline scalar, not a block scalar');
    }

    // An agent should bound its own blast radius, via either an allowlist
    // (`tools`) or a denylist (`disallowedTools`). Declaring neither grants
    // every tool, which is rarely what a reviewer expects.
    if (keys.tools === undefined && keys.disallowedTools === undefined) {
      error(
        file,
        'frontmatter declares neither "tools" nor "disallowedTools" - the agent ' +
          'would get every tool. Bound it explicitly.'
      );
    }

    for (const field of ['tools', 'disallowedTools']) {
      if (keys[field] !== undefined && keys[field].startsWith('[')) {
        error(
          file,
          `"${field}" must be a comma-separated scalar (Read, Grep, Glob), not a YAML array`
        );
      }
    }
  }
}

// --------------------------------------------------------------------------
// commands/
// --------------------------------------------------------------------------

function validateCommands() {
  for (const name of listFiles('commands', '.md')) {
    const file = `commands/${name}`;
    const content = read(file);

    if (!content.trim()) {
      error(file, 'is empty');
      continue;
    }

    const fm = frontmatter(content);
    if (!fm.present) {
      error(file, 'missing YAML frontmatter');
      continue;
    }

    const keys = frontmatterKeys(fm.lines);

    if (!keys.description) {
      error(file, 'frontmatter is missing "description"');
    } else if (/^[|>]/.test(keys.description)) {
      error(file, '"description" must be an inline scalar, not a block scalar');
    }

    // A command that declares an argument hint should actually use the argument.
    if (keys['argument-hint'] && !content.includes('$ARGUMENTS')) {
      warn(file, 'declares "argument-hint" but never references $ARGUMENTS');
    }
  }
}

// --------------------------------------------------------------------------
// skills/
// --------------------------------------------------------------------------

function validateSkills() {
  const skillsDir = path.join(ROOT, 'skills');
  if (!fs.existsSync(skillsDir)) return;

  const entries = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  for (const name of entries) {
    const file = `skills/${name}/SKILL.md`;
    const content = read(file);

    if (content === null) {
      error(`skills/${name}`, 'missing SKILL.md');
      continue;
    }

    if (!content.trim()) {
      error(file, 'is empty');
      continue;
    }

    const fm = frontmatter(content);
    if (!fm.present) {
      error(file, 'missing YAML frontmatter');
      continue;
    }

    const keys = frontmatterKeys(fm.lines);

    // `name` is optional: the directory name is the invocation name. When it is
    // present and disagrees with the directory, one of the two is a typo.
    if (keys.name && keys.name !== name) {
      error(file, `frontmatter name "${keys.name}" does not match directory "${name}"`);
    }

    if (!keys.description) {
      error(file, 'frontmatter is missing "description" - it is the only thing the ' +
        'model sees when deciding whether to load the skill');
    } else if (/^[|>]/.test(keys.description)) {
      error(
        file,
        '"description" must be an inline scalar - a block scalar keeps internal ' +
          'newlines and breaks the skill picker'
      );
    }
  }
}

// --------------------------------------------------------------------------
// hooks/
// --------------------------------------------------------------------------

const HOOK_EVENTS = new Set([
  'PreToolUse',
  'PostToolUse',
  'UserPromptSubmit',
  'Notification',
  'Stop',
  'SubagentStop',
  'SessionStart',
  'SessionEnd',
  'PreCompact',
]);

function validateHooks() {
  const file = 'hooks/hooks.json';
  const raw = read(file);
  if (raw === null) return; // optional

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    error(file, `invalid JSON: ${err.message}`);
    return;
  }

  if (!config.hooks || typeof config.hooks !== 'object') {
    error(file, 'missing top-level "hooks" object');
    return;
  }

  for (const [event, matchers] of Object.entries(config.hooks)) {
    if (!HOOK_EVENTS.has(event)) {
      warn(file, `unknown hook event "${event}"`);
    }

    if (!Array.isArray(matchers)) {
      error(file, `"${event}" must be an array`);
      continue;
    }

    for (const matcher of matchers) {
      if (!Array.isArray(matcher.hooks)) {
        error(file, `"${event}" entry is missing a "hooks" array`);
        continue;
      }

      for (const hook of matcher.hooks) {
        if (hook.type !== 'command') {
          error(file, `"${event}" hook has unsupported type "${hook.type}"`);
          continue;
        }
        if (typeof hook.command !== 'string' || !hook.command.trim()) {
          error(file, `"${event}" hook is missing a "command" string`);
          continue;
        }

        // Any script the hook invokes must exist, or the hook fails silently
        // on every matching tool call.
        const scripts = hook.command.match(/[\w./$}{:-]*scripts\/[\w./-]+\.(?:js|sh|py)/g) || [];
        for (const script of scripts) {
          const relative = script.replace(/^.*?(scripts\/)/, '$1');
          if (!fs.existsSync(path.join(ROOT, relative))) {
            error(file, `hook references "${relative}", which does not exist`);
          }
        }
      }
    }
  }
}

// --------------------------------------------------------------------------

const manifest = validateManifest();
validateMarketplace(manifest);
validateAgents();
validateCommands();
validateSkills();
validateHooks();

for (const message of warnings) {
  process.stdout.write(`warn  ${message}\n`);
}

if (errors.length) {
  for (const message of errors) {
    process.stderr.write(`error ${message}\n`);
  }
  process.stderr.write(`\n${errors.length} error(s). See .claude-plugin/PLUGIN_SCHEMA_NOTES.md\n`);
  process.exit(1);
}

process.stdout.write(
  `Plugin validation passed${warnings.length ? ` (${warnings.length} warning(s))` : ''}.\n`
);
