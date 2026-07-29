---
description: Write a Conventional Commits message for the staged changes and commit them. Use when the user asks to commit, asks for a commit message, or asks to write up their changes.
---

# Conventional commit

Commit the staged changes with a message that follows the
[Conventional Commits](https://www.conventionalcommits.org/) format.

## Steps

1. Run `git status --short` and `git diff --cached` to see what is staged.
   - If nothing is staged, say so and stop. Do not stage files on the user's
     behalf unless they asked you to.
2. Pick the type from what the diff actually does — not from what the branch
   name or issue title claims:

   | Type | Use when |
   | :--- | :--- |
   | `feat` | Adds user-facing capability |
   | `fix` | Corrects broken behavior |
   | `refactor` | Restructures code without changing behavior |
   | `perf` | Improves performance |
   | `docs` | Documentation only |
   | `test` | Tests only |
   | `build` | Build system, dependencies, packaging |
   | `ci` | CI configuration and workflows |
   | `chore` | Everything else (tooling, housekeeping) |

3. Derive the scope from the touched area (a package, module, or directory).
   Omit it rather than inventing one.
4. Write the subject in the imperative mood, lowercase, no trailing period,
   under 72 characters: `type(scope): subject`.
5. Add a body only when the *why* isn't obvious from the diff. Wrap at 72
   columns. Skip it for small, self-evident changes.
6. If the change is breaking, add a `BREAKING CHANGE:` footer explaining what
   breaks and what callers should do instead.
7. Show the user the message, commit it, then report the resulting SHA.

## Extra context

`$ARGUMENTS` may carry a hint from the user — a scope, an issue number, or a
note about intent. Fold it in when present; ignore it when empty.

## Don't

- Don't run `git add -A` or `git commit -a` — commit exactly what is staged.
- Don't amend or force-push unless the user asks for it.
- Don't pad the body with a restatement of the diff. If the body would only say
  what the subject already says, leave it out.
