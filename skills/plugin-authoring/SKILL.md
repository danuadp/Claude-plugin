---
name: plugin-authoring
description: Author and debug Claude Code plugins - manifest shape, agent/command/skill frontmatter, hook wiring, and the validator rules that cause vague install failures
license: MIT
---

# Plugin Authoring

How to build a Claude Code plugin that actually installs. Most plugin failures
are manifest shape problems reported as vague errors like `agents: Invalid
input`, so the rules below matter more than they look.

## When to Use

- Creating a new Claude Code plugin or adding a component to an existing one
- A plugin fails to install, or its agents / skills / hooks do not load
- Reviewing a change to `.claude-plugin/plugin.json`
- Publishing a plugin to a marketplace

## Layout

```
.claude-plugin/
  plugin.json          # manifest (required)
  marketplace.json     # only if you publish a marketplace
agents/<name>.md       # loaded by convention
commands/<name>.md     # declared in manifest
skills/<name>/SKILL.md # declared in manifest
hooks/hooks.json       # loaded by convention
```

## The manifest

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "What it does",
  "commands": ["./commands/"],
  "skills": ["./skills/"]
}
```

Four rules that cause most install failures:

1. **`commands`, `skills`, and `hooks` must be arrays.** A bare string is
   rejected even for a single entry.
2. **Never add an `agents` field.** It is not in the schema. Agents under
   `agents/` are discovered automatically. Declaring them fails the install with
   `agents: Invalid input`.
3. **Never declare `hooks/hooks.json` in `hooks`.** Claude Code v2.1+ auto-loads
   it; declaring it too gives `Duplicate hooks file detected`. Additional hook
   files at other paths *can* be declared.
4. **`version` is required.** Missing it fails at install, not at authoring.

If your plugin root has a `.mcp.json` you do not want bundled, add
`"mcpServers": {}` to opt out — otherwise generated MCP tool names
(`mcp__plugin_<plugin>_<server>__<tool>`) can blow past the 64-character limit
that strict gateways enforce.

## Frontmatter

**Agent** — tool fields are comma-separated **scalars**, not arrays. The array
rule applies to `plugin.json` only.

```yaml
---
name: code-reviewer
description: Reviews a diff for correctness and security. Use before opening a PR.
model: sonnet
disallowedTools: Write, Edit, NotebookEdit
---
```

Bound every agent with `tools` (allowlist) or `disallowedTools` (denylist) —
declaring neither grants every tool. Prefer the denylist when the constraint is
the point: an agent with `disallowedTools: Write, Edit` is structurally
read-only, and stays that way when someone later widens an allowlist without
thinking it through.

**Command** — `description` is what shows in the command list; `argument-hint`
tells the user what to type. `$ARGUMENTS` interpolates their input.

```yaml
---
description: Review uncommitted changes
argument-hint: [path to narrow the review]
---
```

**Skill** — the directory name is the invocation name, so `name:` is optional.
`description` must be an **inline scalar**; a block scalar (`|`, `|-`, `>`)
preserves newlines and breaks renderers that key off it.

```yaml
---
description: One line stating what it covers and when to use it.
disable-model-invocation: true   # optional: makes the skill user-only
---
```

The description is how the model decides whether to load the skill, so state the
trigger conditions, not just the topic.

Skills are namespaced by the plugin name — `skills/hello/` is invoked as
`/my-plugin:hello`, not `/hello`.

## Hooks

`hooks/hooks.json` maps events to commands:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node scripts/hooks/my-check.js" }
        ]
      }
    ]
  }
}
```

Hook scripts read the tool call as JSON on stdin and signal via exit code:

- `0` — allow
- `2` — block, with the reason written to **stderr** (that text is what the model
  sees and reacts to)

Keep hooks fast and dependency-free. They run on every matching tool call, and a
hook that needs `npm install` to work will fail in half the repos it lands in.

Resolve paths from `CLAUDE_PLUGIN_ROOT` when the plugin is installed rather than
run from its own checkout — the process cwd is the user's project, not yours.

## Debugging install failures

| Symptom | Cause |
|---|---|
| `agents: Invalid input` | An `agents` field in `plugin.json` |
| `Duplicate hooks file detected` | `hooks/hooks.json` declared in the manifest |
| Install fails, no clear message | Missing `version`, or a string where an array is required |
| Skill never loads | `description` is a block scalar, or too vague to match on |
| Skill not found at `/name` | Skills are namespaced — invoke `/plugin-name:skill-name` |
| Agent has no tool access | `tools` written as a YAML array instead of a scalar |
| MCP tools rejected by gateway | Generated tool name over 64 chars — shorten the plugin name or set `"mcpServers": {}` |

Validate before pushing:

```bash
claude plugin validate .claude-plugin/plugin.json
```

The validator is stricter than marketplace previews, and its errors are generic.
Treat it as literal and hostile — be explicit rather than clever.
