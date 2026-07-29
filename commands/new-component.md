---
description: Scaffold a new agent, command, or skill in this plugin with valid frontmatter
argument-hint: <agent|command|skill> <name>
---

# New Component

**Input**: $ARGUMENTS

Parse `$ARGUMENTS` as `<kind> <name>` where kind is `agent`, `command`, or
`skill`. If either is missing, ask for it — do not guess a name.

Validate `<name>` is a lowercase slug (`[a-z0-9-]+`). If not, propose a slugified
version and confirm before writing.

If the target file already exists, stop and say so. Never overwrite.

## agent → `agents/<name>.md`

```markdown
---
name: <name>
description: <one line: what it does and when to use it>
model: sonnet
tools: Read, Grep, Glob
---

<System prompt. Describe the process the agent follows, its checklist, and its
output format.>
```

Tool fields are **comma-separated scalars**, not YAML arrays. Bound the agent
with `tools` (allowlist) or `disallowedTools` (denylist) — declaring neither
grants every tool. For a read-only agent prefer
`disallowedTools: Write, Edit, NotebookEdit`, which stays read-only even if
someone later widens an allowlist.

Do **not** add the agent to `plugin.json`. Agents load by convention; an `agents`
field breaks the manifest. See `.claude-plugin/PLUGIN_SCHEMA_NOTES.md`.

## command → `commands/<name>.md`

```markdown
---
description: <one line, imperative>
argument-hint: <what the user should type, or omit if the command takes none>
---

# <Title>

**Input**: $ARGUMENTS

<Numbered phases. Be explicit about what to read, what to run, and what not to
touch.>
```

## skill → `skills/<name>/SKILL.md`

```markdown
---
description: <one line, inline scalar - never a block scalar>
---

# <Title>

## When to Use

<Concrete triggers.>

## <Body>
```

The directory name is the invocation name, so `name:` is optional — omit it
rather than risk it drifting from the directory. The skill will be invoked as
`/claude-plugin:<name>`.

`description` must be an inline scalar. A block scalar (`|`, `>`) keeps internal
newlines and breaks the skill picker. Add `disable-model-invocation: true` if the
skill should be user-invoked only.

## After writing

Run `npm test` to confirm the new file passes the repo validator, and report the
result. If it fails, fix the file rather than loosening the validator.
