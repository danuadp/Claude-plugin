# Claude-plugin

A starter [Claude Code](https://claude.com/claude-code) plugin: one agent, two
commands, one skill, one hook — plus a validator that enforces the manifest
rules the CLI actually applies.

The scaffold exists because most plugin failures are not logic bugs. They are
manifest shape problems that surface as `agents: Invalid input` at install time
on someone else's machine. `npm test` catches those here instead.

## Layout

```
.claude-plugin/
  plugin.json              # manifest
  marketplace.json         # marketplace entry
  PLUGIN_SCHEMA_NOTES.md   # validator rules that are not in the public docs
agents/
  code-reviewer.md         # loaded by convention, NOT declared in the manifest
commands/
  review.md                # /review — review uncommitted changes
  new-component.md         # /new-component — scaffold an agent, command, or skill
skills/
  plugin-authoring/        # how to build a plugin that installs
hooks/
  hooks.json               # loaded by convention, NOT declared in the manifest
scripts/
  ci/validate-plugin.js    # the validator
  hooks/block-no-verify.js # PreToolUse hook
tests/                     # node --test
```

## Install

From a local checkout:

```bash
claude plugin install /path/to/Claude-plugin
```

Or add the marketplace and install by name:

```bash
claude plugin marketplace add danuadp/Claude-plugin
claude plugin install claude-plugin@claude-plugin
```

## What's included

**`/review`** — reviews uncommitted changes for security, correctness, and
maintainability. Delegates to the `code-reviewer` agent, reports only, never
edits.

**`/new-component <agent|command|skill> <name>`** — scaffolds a new component
with frontmatter that passes the validator, then runs the tests.

**`code-reviewer` agent** — read-only reviewer with an explicit tool allowlist
and an 80%-confidence filter, so it reports defects rather than speculation.

**`plugin-authoring` skill** — the manifest rules, frontmatter shapes, hook
wiring, and a symptom-to-cause table for install failures.

**`block-no-verify` hook** — a `PreToolUse` hook on `Bash` that blocks
`--no-verify` and `core.hooksPath` overrides. It parses the command rather than
grepping it, so `git commit -m "document --no-verify policy"` still works.

## Development

```bash
npm test          # validator + unit tests
npm run validate  # manifest and frontmatter rules only
npm run test:unit # unit tests only
```

No dependencies — Node 18+ and its built-in test runner.

The validator enforces, among other things:

- `commands` / `skills` / `hooks` must be arrays, never bare strings
- no `agents` field in the manifest (it fails the install)
- no `hooks/hooks.json` in the manifest (it is auto-loaded; declaring it
  duplicates)
- agent `tools` is a comma-separated scalar, not a YAML array
- skill `description` is an inline scalar, never a block scalar
- the two manifests do not drift out of version sync
- every script a hook references actually exists

Each rule and the failure it prevents is documented in
[`.claude-plugin/PLUGIN_SCHEMA_NOTES.md`](.claude-plugin/PLUGIN_SCHEMA_NOTES.md).

## Adding a component

Use `/new-component`, or by hand:

- **Agent** → `agents/<name>.md`. Do **not** add it to `plugin.json`.
- **Command** → `commands/<name>.md`.
- **Skill** → `skills/<name>/SKILL.md`.
- **Hook** → add to `hooks/hooks.json` and put the script in `scripts/hooks/`.

Then run `npm test`.

## Credits

The manifest and directory conventions, and the validator-quirk documentation in
`PLUGIN_SCHEMA_NOTES.md`, are adapted from
[affaan-m/ECC](https://github.com/affaan-m/ECC) (MIT), which catalogued these
rules the expensive way. The code here is original.

## License

MIT — see [LICENSE](LICENSE).
