#!/usr/bin/env bash
#
# PostToolUse hook: after Claude writes or edits a file, check whether the file
# still contains git merge-conflict markers, and tell Claude if it does.
#
# Hook contract:
#   stdin   JSON event payload (tool_name, tool_input, cwd, ...)
#   exit 0  nothing to report
#   exit 2  stderr is fed back to Claude as feedback
#
# Any other exit code is treated as a non-blocking error and shown to the user,
# so this script stays quiet (exit 0) whenever it cannot do its job.

set -uo pipefail

# The payload is JSON. Without jq there is no reliable way to read it, so exit
# quietly rather than emitting noise on every edit.
command -v jq >/dev/null 2>&1 || exit 0

payload=$(cat)
file_path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')

[ -n "$file_path" ] || exit 0
[ -f "$file_path" ] || exit 0

# Require both an opening and a closing marker. Matching "=======" alone would
# fire on ordinary Markdown and reStructuredText underlines.
if grep -qE '^<{7} ' "$file_path" && grep -qE '^>{7} ' "$file_path"; then
  {
    echo "Merge-conflict markers are still present in ${file_path}:"
    grep -nE '^(<{7}|={7}|>{7})' "$file_path" | head -n 20
    echo "Resolve the conflict before continuing."
  } >&2
  exit 2
fi

exit 0
