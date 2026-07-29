---
name: merge-parallel-plugin-scaffolds
description: Workflow command scaffold for merge-parallel-plugin-scaffolds in Claude-plugin.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /merge-parallel-plugin-scaffolds

Use this workflow when working on **merge-parallel-plugin-scaffolds** in `Claude-plugin`.

## Goal

Combines two parallel plugin scaffolds or branches into a unified codebase, resolving file overlaps and updating documentation and configuration to reflect the merged state.

## Common Files

- `.claude-plugin/PLUGIN_SCHEMA_NOTES.md`
- `.claude-plugin/plugin.json`
- `.gitignore`
- `README.md`
- `agents/code-reviewer.md`
- `commands/new-component.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Identify overlapping files between scaffolds (e.g., agent definitions, README, plugin.json, hooks).
- For each overlap, select the stronger or more complete version, sometimes merging content.
- Update documentation (README.md, PLUGIN_SCHEMA_NOTES.md) to reflect merged features and conventions.
- Update configuration files (plugin.json, hooks.json, .gitignore) to include all relevant entries from both scaffolds.
- Relax or adjust validation rules in scripts/ci/validate-plugin.js as needed to accommodate merged conventions.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.