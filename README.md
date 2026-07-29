# claude-plugin

A starter [Claude Code](https://code.claude.com/docs) plugin. It ships one of
each major component type — a skill, an agent, and a hook — wired up and
working, so you can see how the pieces fit and then replace them with your own.

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
| `.claude-plugin/plugin.json` | Manifest | Name, version, and metadata. `name` is the only required field. |
| `skills/hello/` | Skill | Minimal `$ARGUMENTS` example. Delete it once you've read it. |
| `skills/conventional-commit/` | Skill | Writes a Conventional Commits message for staged changes. |
| `agents/code-reviewer.md` | Agent | Read-only reviewer subagent, available as `@claude-plugin:code-reviewer`. |
| `hooks/hooks.json` | Hook | Runs the script below after every `Write` or `Edit`. |
| `scripts/check-conflict-markers.sh` | Hook script | Flags leftover merge-conflict markers back to Claude. |

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

```bash
claude plugin validate .
```

This checks `plugin.json`, skill and agent frontmatter, and `hooks/hooks.json`
for schema errors. Add `--strict` in CI to turn warnings — a typo'd field name,
a leftover key from another tool's manifest — into failures.

## Distribute

To let others install this with `/plugin marketplace add danuadp/Claude-plugin`,
add `.claude-plugin/marketplace.json`:

```json
{
  "name": "danuadp",
  "owner": { "name": "danuadp" },
  "plugins": [{ "source": "./", "name": "claude-plugin" }]
}
```

Full details: [plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces).

## Docs

- [Create plugins](https://code.claude.com/docs/en/plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Hooks](https://code.claude.com/docs/en/hooks)

## License

MIT — see [LICENSE](LICENSE).
