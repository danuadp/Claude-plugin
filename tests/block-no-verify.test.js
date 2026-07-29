#!/usr/bin/env node
/**
 * Tests for the block-no-verify PreToolUse hook.
 *
 * The interesting cases are the false positives: a commit message that merely
 * mentions --no-verify must not be blocked, or the hook becomes noise and gets
 * disabled.
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { checkCommand, extractCommand } = require('../scripts/hooks/block-no-verify.js');

const BLOCKED = [
  ['git commit --no-verify -m "x"', 'plain --no-verify'],
  ['git commit -n -m "x"', '-n shorthand'],
  ['git push --no-verify', 'push'],
  ['git merge --no-verify main', 'merge'],
  ['git rebase --no-verify main', 'rebase'],
  ['git cherry-pick --no-verify abc123', 'cherry-pick'],
  ['git am --no-verify patch.diff', 'am'],
  ['git status && git commit --no-verify -m "x"', 'second segment of a chain'],
  ['git status; git push --no-verify', 'semicolon chain'],
  ['git -c core.hooksPath=/dev/null commit -m "x"', 'hooksPath override'],
  ['git -c core.HooksPath=/dev/null commit -m "x"', 'hooksPath override, mixed case'],
  ['git -ccore.hooksPath=/dev/null commit -m "x"', 'inline -c form'],
  ['/usr/bin/git commit --no-verify -m "x"', 'absolute path to git'],
  ['GIT_AUTHOR_NAME=x git commit --no-verify -m "y"', 'leading env assignment'],
];

const ALLOWED = [
  ['git commit -m "x"', 'ordinary commit'],
  ['git push origin main', 'ordinary push'],
  ['git commit -m "document --no-verify policy"', '--no-verify inside a message'],
  ['git commit -m "use -n sparingly"', '-n inside a message'],
  ['git commit --message="mentions --no-verify"', 'inline --message='],
  ['git commit -F notes.txt', '-F takes a value'],
  ['git log --oneline -n 5', '-n on a command that has no hooks'],
  ['npm test', 'not a git command'],
  ['echo "git commit --no-verify"', 'echo, not git'],
  ['git commit -m "x" -- --no-verify', 'after the -- pathspec separator'],
  ['# git commit --no-verify', 'shell comment'],
  ['git config --get core.hooksPath', 'reading the config, not overriding it'],
];

test('blocks hook bypasses', () => {
  for (const [command, label] of BLOCKED) {
    const result = checkCommand(command);
    assert.strictEqual(result.blocked, true, `should block (${label}): ${command}`);
    assert.ok(result.reason, `should give a reason (${label})`);
  }
});

test('allows everything else', () => {
  for (const [command, label] of ALLOWED) {
    const result = checkCommand(command);
    assert.strictEqual(result.blocked, false, `should allow (${label}): ${command}`);
  }
});

test('extracts the command from a Claude Code hook payload', () => {
  const payload = JSON.stringify({
    tool_name: 'Bash',
    tool_input: { command: 'git commit --no-verify -m "x"' },
  });
  assert.strictEqual(extractCommand(payload), 'git commit --no-verify -m "x"');
  assert.strictEqual(checkCommand(extractCommand(payload)).blocked, true);
});

test('falls back to raw text for non-JSON input', () => {
  assert.strictEqual(extractCommand('git status'), 'git status');
});

test('tolerates malformed JSON without throwing', () => {
  assert.doesNotThrow(() => extractCommand('{"tool_input": '));
});
