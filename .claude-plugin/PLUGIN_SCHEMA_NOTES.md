# Plugin Manifest Schema Notes

Constraints the Claude Code plugin validator enforces that are **not obvious from
the public schema docs**. Read this before editing `.claude-plugin/plugin.json`.

> Adapted from the schema notes in [affaan-m/ECC](https://github.com/affaan-m/ECC)
> (MIT), which documented these rules after repeated real-world install failures.

The common failure mode: the manifest looks fine, and the validator rejects it
with something vague like `agents: Invalid input`. The rules below explain why.

---

## Required fields

`name`, `version`, and `description` are all required. `version` in particular is
easy to omit — some published examples leave it out — and a missing `version`
fails at marketplace install time rather than at authoring time.

---

## Component fields must be arrays

`commands`, `skills`, and `hooks` (when present) must be **arrays**, even with a
single entry. A bare string is rejected.

```json
{ "commands": ["./commands/"] }   // correct
{ "commands": "./commands/" }     // rejected
```

---

## Do NOT add an `agents` field

`agents` is not part of the manifest schema. Any form of it — string path, array
of paths, array of directories — produces:

```
agents: Invalid input
```

Agent `.md` files under `agents/` are discovered by convention. They do not need
to be declared, and declaring them breaks the install.

---

## Do NOT add a `hooks` field for `hooks/hooks.json`

Claude Code v2.1+ auto-loads `hooks/hooks.json` from any installed plugin. If you
also declare it in the manifest you get:

```
Duplicate hooks file detected: ./hooks/hooks.json resolves to already-loaded file.
```

*Additional* hook files (anything that is not the standard `hooks/hooks.json`)
can be declared. The standard one must not be.

This rule has flip-flopped across CLI versions — pre-v2.1 required the explicit
declaration, v2.1+ errors on it. `npm test` enforces the current rule so it does
not get reintroduced by someone testing against an old CLI.

---

## Keep `"mcpServers": {}` if you have a root `.mcp.json`

Claude Code auto-discovers a plugin-root `.mcp.json` and bundles those servers
into the plugin install. An explicit empty `mcpServers` object opts out.

This matters because bundled MCP tool names are generated as
`mcp__plugin_<plugin-name>_<server>__<tool>`. With a long plugin name that can
exceed the 64-character limit strict OpenAI-compatible gateways enforce, and the
whole tool list gets rejected.

This repo has no root `.mcp.json`, so the opt-out is defensive — but it costs
nothing and prevents a surprise if one is added later.

---

## Agent frontmatter: `tools` is a scalar, not an array

The array rule above applies to `plugin.json`, **not** to agent markdown
frontmatter. Agent files use a comma-separated scalar:

```yaml
tools: Read, Grep, Glob, Bash    # correct
tools: [Read, Grep, Glob, Bash]  # wrong shape for agent frontmatter
```

Omitting `tools` grants access to every tool. This repo's validator requires the
field so that each agent's blast radius is explicit and reviewable.

---

## Skill frontmatter: `description` must be an inline scalar

Do not use a YAML block scalar (`|`, `|-`, `|+`, `>`) for `description`. Block
scalars preserve internal newlines, which breaks any renderer that treats the
description as a single line — including the skill picker.

```yaml
description: One line, no newlines, states when to use the skill.   # correct
description: |                                                      # rejected
  Multi
  line
```

---

## Known anti-patterns

These look correct and are rejected:

- String values where an array is required
- `"agents": [...]` in any form
- `"hooks": "./hooks/hooks.json"` (auto-loaded; causes a duplicate error)
- Missing `version`
- Removing `"mcpServers": {}` while a root `.mcp.json` exists
- Relying on inferred or ambiguous paths — cross-platform installs, Windows
  especially, are unforgiving here

---

## Minimal known-good manifest

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "What this plugin does",
  "commands": ["./commands/"],
  "skills": ["./skills/"]
}
```

No `agents` field. No `hooks` field. Both load by convention.

---

## Before you push a manifest change

1. All component fields are arrays
2. `version` is present and bumped
3. No `agents` or `hooks` field
4. `npm test` passes
5. If the CLI is available: `claude plugin validate .claude-plugin/plugin.json`

Assume the validator is hostile and literal. Choose verbosity over cleverness.
