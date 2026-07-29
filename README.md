# Claude-plugin

Claude Code configuration for this workspace.

## ECC plugin

The [ECC](https://github.com/affaan-m/ECC) plugin (`ecc@ecc`, v2.1.0) is enabled
declaratively in [`.claude/settings.json`](.claude/settings.json). This is the
equivalent of running these two commands inside an interactive Claude Code session:

```text
/plugin marketplace add https://github.com/affaan-m/ECC
/plugin install ecc@ecc
```

The declarative form is used because `/plugin` is unavailable in non-interactive
environments (Claude Code on the web, CI, hooks). Anyone who clones this repo picks
up the marketplace and the enabled plugin automatically — Claude Code fetches
`affaan-m/ECC` on startup and loads its skills, agents, commands, and hooks.

Restart Claude Code after cloning for the plugin to be fetched and loaded.

### Not included

- **Rules.** Claude Code plugins cannot distribute `rules/`, so ECC's rule packs are
  not installed by this repo. To add them, clone ECC and copy the packs you want:

  ```bash
  git clone https://github.com/affaan-m/ECC.git
  cd ECC
  mkdir -p ~/.claude/rules/ecc
  cp -R rules/common ~/.claude/rules/ecc/
  cp -R rules/typescript ~/.claude/rules/ecc/  # swap for your stack
  ```

- **MCP servers.** ECC plugin installs intentionally do not auto-enable its bundled
  MCP server definitions. Use `/mcp`, or copy entries from ECC's
  `mcp-configs/mcp-servers.json` into a project-scoped `.mcp.json`.

### Do not stack install methods

Do not also run ECC's `./install.sh --profile full` against Claude Code. Combining
the plugin install with the manual installer duplicates skills, commands, and hooks.
Installing ECC once per harness (e.g. Claude Code plugin + Codex sync) is fine.
