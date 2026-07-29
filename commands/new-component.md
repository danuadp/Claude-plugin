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
tools: Read, Grep, Glob
model: sonnet
---

<System prompt. Describe the process the agent follows, its checklist, and its
output format.>
```

`tools` is a **comma-separated scalar**, not a YAML array. Grant the narrowest
set that does the job — add `Bash`, `Edit`, or `Write` only when the agent
genuinely needs them.

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
name: <name>
description: <one line, inline scalar - never a block scalar>
license: MIT
---

# <Title>

## When to Use

<Concrete triggers.>

## <Body>
```

`description` must be an inline scalar. A block scalar (`|`, `>`) keeps internal
newlines and breaks the skill picker.

## After writing

Run `npm test` to confirm the new file passes the repo validator, and report the
result. If it fails, fix the file rather than loosening the validator.
