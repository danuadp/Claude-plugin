# claude-plugin

A starter [Claude Code](https://code.claude.com/docs) plugin. It ships one of
each major component type — a skill, an agent, a hook, and a bundled MCP server
— wired up and working, so you can see how the pieces fit and then replace them
with your own.

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
| `.claude-plugin/plugin.json` | Manifest | Name, version, metadata, and the bundled `markitdown` MCP server. |
| `.claude-plugin/marketplace.json` | Marketplace | Makes the plugin installable with `/plugin marketplace add danuadp/Claude-plugin`. |
| `skills/hello/` | Skill | Minimal `$ARGUMENTS` example. Delete it once you've read it. |
| `skills/conventional-commit/` | Skill | Writes a Conventional Commits message for staged changes. |
| `skills/read-document/` | Skill | Reads a PDF, Word, PowerPoint, or Excel file as Markdown. |
| `scripts/markitdown-mcp.sh` | Launcher | Finds a `markitdown-mcp` to run, or fetches one with `uvx`. |
| `bin/doc2md` | Executable | Converts legacy `.doc`/`.ppt` and OCRs scanned PDFs, then converts. |
| `agents/code-reviewer.md` | Agent | Read-only reviewer subagent, available as `@claude-plugin:code-reviewer`. |
| `hooks/hooks.json` | Hook | Runs the script below after every `Write` or `Edit`. |
| `scripts/check-conflict-markers.sh` | Hook script | Flags leftover merge-conflict markers back to Claude. |

### Reading documents

`Read` and `cat` see the raw bytes of a `.pdf` or `.xlsx`, not its text. The
bundled `markitdown` MCP server converts binary documents to Markdown so Claude
can actually read them — PDF, Word `.docx`, PowerPoint `.pptx`, Excel
`.xlsx`/`.xls`, CSV, EPUB, Outlook `.msg`/`.eml`, HTML, `.ipynb`, and ZIP
archives. Tables survive as Markdown tables; each worksheet gets its own
heading.

The server exposes one tool, `convert_to_markdown`, which takes a `uri` — an
absolute `file://` path (percent-encode spaces) or an `http(s)://` URL it
fetches for you.

Two kinds of document defeat it, and `bin/doc2md` covers both. It is on the Bash
tool's `PATH` while the plugin is enabled, takes plain paths, and writes Markdown
to stdout:

```bash
doc2md "Laporan Akhir.doc"               # legacy format: LibreOffice first
doc2md --ocr force --lang ind scan.pdf   # scanned PDF: OCR, then convert
```

- **Legacy binary Office formats** — `.doc`, `.ppt`, `.odt`, `.odp`, `.ods`,
  `.rtf` — make markitdown raise *"the filetype is simply not supported"*.
  `doc2md` converts them with LibreOffice first.
- **Scanned PDFs** have no text layer and convert to nothing. `doc2md` notices
  (under ~50 characters per page), OCRs, and converts again.

Anything else is passed straight through, so `doc2md` is safe as a single entry
point when the format is unknown.

`skills/read-document/` is what tells Claude to reach for all of this instead of
`Read`, and records the limits — OCR output needs checking before it is quoted,
legacy conversion is a lossy round trip, and `.pages`/`.numbers`/`.key` are not
supported by either route.

#### Dependencies

The MCP server is resolved at startup by `scripts/markitdown-mcp.sh` —
`$MARKITDOWN_MCP_BIN`, then `markitdown-mcp` on `PATH`, then
`python3 -m markitdown_mcp`, then `uvx markitdown-mcp`. So it works with nothing
installed as long as [uv](https://docs.astral.sh/uv/) is present; installing it
makes startup faster and removes the network dependency:

```bash
pip install markitdown-mcp      # or: uv tool install markitdown-mcp
```

`doc2md` degrades one feature at a time — it only needs LibreOffice for legacy
formats and an OCR tool for scans, and tells you which one is missing:

```bash
# Debian/Ubuntu. libreoffice-core alone ships no import filters and fails with
# "source file could not be loaded", so install the document components too.
apt install libreoffice-writer libreoffice-impress libreoffice-calc \
            ocrmypdf tesseract-ocr tesseract-ocr-ind poppler-utils

# macOS
brew install --cask libreoffice && brew install ocrmypdf tesseract-lang poppler
```

`ocrmypdf` is preferred because it writes the text back into the PDF and keeps
the layout; if it is missing or broken, `doc2md` falls back to `pdftoppm` +
`tesseract`, which yields plain text only. Set `MARKITDOWN_ENABLE_PLUGINS=true`
in the manifest to load third-party markitdown converters; it is `false` here.
Audio transcription additionally needs `ffmpeg`.

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
| `.lsp.json` | Language servers for code intelligence. |
| `settings.json` | Default settings (`agent`, `subagentStatusLine` only). |

Reference any bundled file by absolute path with `${CLAUDE_PLUGIN_ROOT}` — the
plugin's install directory differs from this repo once someone installs it, and
it changes again on every update.

MCP servers can live either in an `.mcp.json` at the plugin root or under
`mcpServers` in `plugin.json`. This plugin uses the manifest, because a root
`.mcp.json` is *also* what Claude Code reads as project-level MCP config when
this repo is the working directory — and in that context `${CLAUDE_PLUGIN_ROOT}`
is undefined, so the server fails to spawn with `ENOENT`.

One cosmetic consequence: `claude plugin details claude-plugin` reports
`MCP servers (0)`, because it counts `.mcp.json` and does not look at the
manifest. The server does load — `mcp__plugin_claude-plugin_markitdown__convert_to_markdown`
is there in a session.

## Validate

```bash
claude plugin validate .
```

This checks `plugin.json`, skill and agent frontmatter, and `hooks/hooks.json`
for schema errors. Add `--strict` in CI to turn warnings — a typo'd field name,
a leftover key from another tool's manifest — into failures.

## Distribute

`.claude-plugin/marketplace.json` is already here, so anyone can install this
with:

```
/plugin marketplace add danuadp/Claude-plugin
/plugin install claude-plugin@danuadp
```

The marketplace is named `danuadp` and lists this repository root as its single
plugin. `strict` defaults to true, so `plugin.json` stays the authority on what
the plugin actually contains; the marketplace entry only adds listing metadata.
Bump `version` in `plugin.json` on each release — that is what update detection
reads.

Full details: [plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces).

## Docs

- [Create plugins](https://code.claude.com/docs/en/plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Hooks](https://code.claude.com/docs/en/hooks)

## License

MIT — see [LICENSE](LICENSE).
