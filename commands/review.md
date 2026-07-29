---
description: Review uncommitted changes for security, correctness, and maintainability issues
argument-hint: [path or glob to narrow the review, blank for all changes]
---

# Review

**Scope**: $ARGUMENTS

## Phase 1 — Gather

```bash
git diff --name-only HEAD
```

If `$ARGUMENTS` is non-empty, narrow the file list to paths matching it.

If nothing changed, stop and say: `Nothing to review.`

## Phase 2 — Review

Delegate to the `code-reviewer` agent, passing the file list. If that agent is
unavailable, read each changed file in full yourself and apply the same
checklist: security first (injection, secrets, authz, unvalidated input,
destructive ops), then correctness (boundaries, error paths, null derefs, races,
untested behavior change), then maintainability.

Read whole files, not just the diff hunks. Check the call sites of anything whose
signature or behavior changed.

## Phase 3 — Verify

Before reporting, confirm each finding is real:

- Re-read the surrounding code to rule out a guard you missed
- Where a test would settle it, run the test
- Drop anything you are less than 80% confident in

## Phase 4 — Report

Group findings by severity (CRITICAL / HIGH / MEDIUM / LOW), each with file,
line, the concrete failure case, and a suggested fix. Skip empty severities.

Close with the single highest-priority fix, or `No blocking issues found.`

Do not modify any files — this command reports only. If the user wants the fixes
applied, they will ask.
