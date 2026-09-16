#!/usr/bin/env bash
#
# Launcher for the bundled "markitdown" MCP server (stdio transport).
#
# The server is a Python program, and the plugin cannot assume how — or whether —
# it was installed on the machine running Claude. So resolve it at startup,
# cheapest option first, and only fall back to fetching it:
#
#   1. $MARKITDOWN_MCP_BIN          explicit override, wins over everything
#   2. markitdown-mcp on PATH       `pip install markitdown-mcp`
#   3. python3 -m markitdown_mcp    installed, but its console script is not on PATH
#   4. uvx markitdown-mcp           no install at all; uv fetches and caches it
#
# stdout carries the MCP protocol, so every diagnostic here goes to stderr.
# `exec` hands the process over, keeping stdio and signals wired straight through.

set -uo pipefail

fail() {
  echo "$*" >&2
  exit 1
}

if [ -n "${MARKITDOWN_MCP_BIN:-}" ]; then
  command -v "$MARKITDOWN_MCP_BIN" >/dev/null 2>&1 \
    || fail "MARKITDOWN_MCP_BIN is set to '${MARKITDOWN_MCP_BIN}', which is not executable."
  exec "$MARKITDOWN_MCP_BIN" "$@"
fi

if command -v markitdown-mcp >/dev/null 2>&1; then
  exec markitdown-mcp "$@"
fi

for py in python3 python; do
  if command -v "$py" >/dev/null 2>&1 && "$py" -c 'import markitdown_mcp' >/dev/null 2>&1; then
    exec "$py" -m markitdown_mcp "$@"
  fi
done

if command -v uvx >/dev/null 2>&1; then
  exec uvx --quiet markitdown-mcp "$@"
fi

if command -v uv >/dev/null 2>&1; then
  exec uv tool run --quiet markitdown-mcp "$@"
fi

fail "Could not start the markitdown MCP server: neither 'markitdown-mcp',
an importable 'markitdown_mcp' module, nor 'uv'/'uvx' was found.

Install one of them, then restart Claude Code:

  pip install markitdown-mcp        # or: pipx install markitdown-mcp
  uv tool install markitdown-mcp    # if you prefer uv

Set MARKITDOWN_MCP_BIN to an absolute path to point at a specific install
(for example one inside a virtualenv)."
