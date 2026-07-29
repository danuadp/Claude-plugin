#!/usr/bin/env node
/**
 * PreToolUse hook: block git hook-bypass flags.
 *
 * Pre-commit, commit-msg, and pre-push hooks exist to catch problems before they
 * land. An agent that reaches for `--no-verify` when a hook fails is routing
 * around the check rather than fixing it, so we block it and say why.
 *
 * Blocks:
 *   - `--no-verify` on commit / push / merge / cherry-pick / rebase / am
 *   - `-n` on `git commit` (shorthand for --no-verify)
 *   - `-c core.hooksPath=...` overrides (case-insensitive; git config keys are)
 *
 * Reads the tool call as JSON on stdin. Exit 0 to allow, exit 2 to block with
 * the reason on stderr.
 */

'use strict';

const MAX_STDIN = 1024 * 1024;

const GIT_COMMANDS_WITH_NO_VERIFY = new Set([
  'commit',
  'push',
  'merge',
  'cherry-pick',
  'rebase',
  'am',
]);

// Git global flags that consume the following token as their argument. Needed so
// `git -c foo=bar commit` still resolves `commit` as the subcommand.
const GIT_GLOBAL_FLAGS_WITH_VALUE = new Set([
  '-c',
  '-C',
  '--work-tree',
  '--git-dir',
  '--namespace',
]);

// `git commit` options that take a value. Their values must not be scanned for
// flags, so that `git commit -m "use --no-verify sparingly"` is not blocked.
const COMMIT_OPTIONS_WITH_VALUE = new Set([
  '-m', '--message',
  '-F', '--file',
  '-C', '--reuse-message',
  '-c', '--reedit-message',
  '-t', '--template',
  '--author',
  '--date',
  '--fixup',
  '--squash',
  '--pathspec-from-file',
]);

const HOOKS_PATH_KEY = 'core.hookspath=';

/**
 * Split a command string into shell-ish words, honoring quotes and backslash
 * escapes, and splitting on unquoted command separators.
 *
 * Returns an array of segments, each an array of tokens, so that a chained
 * command like `git status && git commit --no-verify` is checked per segment.
 *
 * @param {string} input
 * @returns {string[][]}
 */
function tokenize(input) {
  const segments = [];
  let tokens = [];
  let value = '';
  let hasValue = false;
  let quote = null;
  let escaped = false;

  const endToken = () => {
    if (hasValue) {
      tokens.push(value);
      value = '';
      hasValue = false;
    }
  };

  const endSegment = () => {
    endToken();
    if (tokens.length) {
      segments.push(tokens);
      tokens = [];
    }
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escaped) {
      value += char;
      hasValue = true;
      escaped = false;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (quote === '"' && char === '\\') {
        escaped = true;
      } else {
        value += char;
        hasValue = true;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      hasValue = true;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '#' && !hasValue) {
      // Comment runs to end of line.
      const nl = input.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
      endSegment();
      continue;
    }

    if (char === ';' || char === '|' || char === '&' || char === '\n') {
      endSegment();
      continue;
    }

    if (/\s/.test(char)) {
      endToken();
      continue;
    }

    value += char;
    hasValue = true;
  }

  endSegment();
  return segments;
}

/**
 * Locate the git invocation in a token list.
 *
 * Returns the index of the `git` token, or -1. Skips leading environment
 * assignments (`FOO=bar git ...`) and common wrappers.
 *
 * @param {string[]} tokens
 * @returns {number}
 */
function findGitIndex(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Leading VAR=value assignments precede the command.
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) continue;

    const base = token.split(/[\\/]/).pop().toLowerCase();
    if (base === 'git' || base === 'git.exe') return i;

    // Wrappers that take the real command as their argument.
    if (base === 'env' || base === 'sudo' || base === 'nice' || base === 'time') continue;

    return -1;
  }
  return -1;
}

/**
 * Check one command segment for a git hook bypass.
 *
 * @param {string[]} tokens
 * @returns {{blocked: boolean, reason?: string}}
 */
function checkSegment(tokens) {
  const gitIndex = findGitIndex(tokens);
  if (gitIndex === -1) return { blocked: false };

  // Walk the global-flag region between `git` and the subcommand.
  let i = gitIndex + 1;
  for (; i < tokens.length; i++) {
    const token = tokens[i];
    const lowered = token.toLowerCase();

    if (lowered.startsWith(`-c${HOOKS_PATH_KEY}`)) {
      return { blocked: true, reason: 'core.hooksPath override' };
    }

    if (token === '-c') {
      const next = (tokens[i + 1] || '').toLowerCase();
      if (next.startsWith(HOOKS_PATH_KEY)) {
        return { blocked: true, reason: 'core.hooksPath override' };
      }
      i++;
      continue;
    }

    if (GIT_GLOBAL_FLAGS_WITH_VALUE.has(token)) {
      i++;
      continue;
    }

    if (token.startsWith('-')) continue;

    break;
  }

  const subcommand = tokens[i];
  if (!subcommand || !GIT_COMMANDS_WITH_NO_VERIFY.has(subcommand)) {
    return { blocked: false };
  }

  // Scan the subcommand's own arguments.
  for (let j = i + 1; j < tokens.length; j++) {
    const token = tokens[j];

    // Everything after `--` is a pathspec, not a flag.
    if (token === '--') break;

    if (token === '--no-verify') {
      return { blocked: true, reason: `--no-verify on git ${subcommand}` };
    }

    if (subcommand === 'commit') {
      // `-n` alone, or bundled as the first short option (`-na`).
      if (token === '-n' || /^-n[A-Za-z]*$/.test(token)) {
        return { blocked: true, reason: '-n (--no-verify) on git commit' };
      }

      if (COMMIT_OPTIONS_WITH_VALUE.has(token)) {
        j++;
        continue;
      }

      // Inline forms: --message=..., -mfoo
      if (/^--[a-z-]+=/.test(token)) continue;
      if (/^-[mFCct]./.test(token)) continue;
    }
  }

  return { blocked: false };
}

/**
 * @param {string} command
 * @returns {{blocked: boolean, reason?: string}}
 */
function checkCommand(command) {
  for (const segment of tokenize(command)) {
    const result = checkSegment(segment);
    if (result.blocked) return result;
  }
  return { blocked: false };
}

/**
 * Pull the command string out of the hook payload. Accepts the Claude Code
 * shape `{ tool_input: { command } }` and falls back to raw text.
 *
 * @param {string} raw
 * @returns {string}
 */
function extractCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return trimmed;

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return trimmed;

    if (parsed.tool_input && typeof parsed.tool_input.command === 'string') {
      return parsed.tool_input.command;
    }
    if (typeof parsed.command === 'string') return parsed.command;

    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * @param {string} raw
 * @returns {{exitCode: number, stderr?: string}}
 */
function run(raw) {
  const result = checkCommand(extractCommand(raw));
  if (!result.blocked) return { exitCode: 0 };

  return {
    exitCode: 2,
    stderr:
      `BLOCKED: ${result.reason}. Git hooks must not be bypassed.\n` +
      'Fix what the hook is reporting instead. If the hook itself is wrong, ' +
      'say so and let the user decide.',
  };
}

module.exports = { run, checkCommand, extractCommand, tokenize };

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (raw.length < MAX_STDIN) raw += chunk.slice(0, MAX_STDIN - raw.length);
  });
  process.stdin.on('end', () => {
    const result = run(raw);
    if (result.exitCode === 0) {
      process.stdout.write(raw);
      return;
    }
    process.stderr.write(`${result.stderr}\n`);
    process.exit(result.exitCode);
  });
}
