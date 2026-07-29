# claude-plugin

A starter [Claude Code](https://code.claude.com/docs) plugin. It ships one of
each major component type — skills, an agent, commands, and hooks — wired up and
working, so you can see how the pieces fit and then replace them with your own.

It also ships a validator, so the manifest mistakes that only surface at install
time on someone else's machine fail here instead.

## Try it

```bash
claude --plugin-dir /path/to/Claude-plugin
```

Then, in the session:

```
/claude-plugin:hello Alex
```

Plugin skills are always namespaced with the plugin's `name`, which is why it's
`/claude-plugin:hello` and not `/hello`. After editing any file here, run
`/reload-plugins` to pick up the change without restarting.

## What's in the box

| Path | Component | What it does |
| :--- | :--- | :--- |
| `.claude-plugin/plugin.json` | Manifest | Name, version, and metadata. |
| `.claude-plugin/PLUGIN_SCHEMA_NOTES.md` | Docs | Manifest rules that fail with unhelpful errors, and why. |
| `skills/hello/` | Skill | Minimal `$ARGUMENTS` example. Delete it once you've read it. |
| `skills/conventional-commit/` | Skill | Writes a Conventional Commits message for staged changes. |
| `skills/plugin-authoring/` | Skill | Manifest shape, frontmatter, hook wiring, and install-failure triage. |
| `agents/code-reviewer.md` | Agent | Read-only reviewer subagent, available as `@claude-plugin:code-reviewer`. |
| `commands/review.md` | Command | `/claude-plugin:review` — reviews uncommitted changes, reports only. |
| `commands/new-component.md` | Command | `/claude-plugin:new-component` — scaffolds a component with valid frontmatter. |
| `hooks/hooks.json` | Hooks | Conflict-marker check after edits; git-bypass block before Bash. |
| `scripts/check-conflict-markers.sh` | Hook script | Flags leftover merge-conflict markers back to Claude. |
| `scripts/hooks/block-no-verify.js` | Hook script | Blocks `--no-verify` and `core.hooksPath` overrides. |
| `scripts/ci/validate-plugin.js` | Tooling | Validates manifest, frontmatter, and hook wiring. |

### Skills vs. agents vs. hooks

- **Skills** are instructions loaded into the current conversation. Claude
  invokes them on its own when the `description` matches the task, and you can
  invoke them directly as `/plugin-name:skill-name`. Set
  `disable-model-invocation: true` to make one user-only.
- **Agents** run in their own context with their own tools and system prompt.
  Use one when the work is better done in isolation — a broad search, a review
  pass — and only the conclusion needs to come back.
- **Hooks** are shell commands the harness runs on lifecycle events. They fire
  deterministically, without the model deciding to. That's the point: use a hook
  for anything that must happen every time.

## Make it yours

1. **Rename it.** Change `name` in `.claude-plugin/plugin.json` — that string is
   the namespace for every skill and agent in the plugin. Update `displayName`,
   `description`, and `author` while you're there. Rename the repo directory to
   match if you like; the manifest is what actually decides the name.
2. **Delete `skills/hello/`.** It exists to be read once.
3. **Add your own skills.** One directory per skill under `skills/`, each with a
   `SKILL.md`. The directory name becomes the invocation name. Write the
   `description` for the model: say what the skill does *and* when to use it,
   since that text is the only thing Claude sees when deciding whether to reach
   for it.
4. **Bump `version`** on each release. If you omit `version` entirely, Claude
   Code falls back to the git commit SHA and treats every commit as a new
   version.

Or run `/claude-plugin:new-component <agent|command|skill> <name>`, which
scaffolds the file with frontmatter that passes the validator.

### Adding other component types

Everything except `plugin.json` lives at the plugin root, never inside
`.claude-plugin/`:

| Directory | Purpose |
| :--- | :--- |
| `commands/` | Skills as flat `.md` files. Prefer `skills/` for new plugins. |
| `workflows/` | Workflow scripts. |
| `output-styles/` | Output style definitions. |
| `monitors/monitors.json` | Background monitors that watch logs or files. |
| `bin/` | Executables added to the Bash tool's `PATH` while enabled. |
| `.mcp.json` | Bundled MCP servers. |
| `.lsp.json` | Language servers for code intelligence. |
| `settings.json` | Default settings (`agent`, `subagentStatusLine` only). |

Reference any bundled file by absolute path with `${CLAUDE_PLUGIN_ROOT}` — the
plugin's install directory differs from this repo once someone installs it, and
it changes again on every update.

## Validate

The official validator checks `plugin.json`, skill and agent frontmatter, and
`hooks/hooks.json` for schema errors:

```bash
claude plugin validate .
```

Add `--strict` in CI to turn warnings — a typo'd field name, a leftover key from
another tool's manifest — into failures.

This repo also ships its own checks, which run without the CLI and cover rules
the schema alone does not express:

```bash
npm test          # validator + unit tests
npm run validate  # manifest, frontmatter, and hook wiring only
npm run test:unit # unit tests only
```

No dependencies — Node 18+ and its built-in test runner. Among other things it
enforces that `commands` / `skills` / `hooks` are arrays rather than bare
strings, that the manifest declares no `agents` field and does not re-declare
`hooks/hooks.json` (both are loaded by convention, and declaring them breaks the
install), that agent `tools` is a comma-separated scalar rather than a YAML
array, that skill `description` is an inline scalar, that the two manifests stay
in version sync, and that every script a hook references actually exists.

Each rule and the failure it prevents is documented in
[`.claude-plugin/PLUGIN_SCHEMA_NOTES.md`](.claude-plugin/PLUGIN_SCHEMA_NOTES.md).

## Distribute

`.claude-plugin/marketplace.json` is already set up, so others can install this
with:

```bash
/plugin marketplace add danuadp/Claude-plugin
```

Keep its `version` in sync with `plugin.json` — the validator fails the build if
they drift.

Full details: [plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces).

## Docs

- [Create plugins](https://code.claude.com/docs/en/plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Hooks](https://code.claude.com/docs/en/hooks)

## Credits

`PLUGIN_SCHEMA_NOTES.md` and the validator's rule set are adapted from
[affaan-m/ECC](https://github.com/affaan-m/ECC) (MIT), which catalogued these
validator quirks the expensive way. The code here is original.

## License

MIT — see [LICENSE](LICENSE).
