---
name: commit-push
description: Stage changed files, create a clean git commit, and push to origin/master. Invoke with /commit-push or let Claude call it automatically after changes.
disable-model-invocation: false
---

Stage, commit, and push all meaningful changes to GitHub.

Steps:
1. Run `git status` to see what's changed.
2. Stage the relevant files (prefer specific file names over `git add .`).
3. Compose a concise, descriptive commit message (imperative mood, e.g. "Add enemy spawning to shooter game").
4. Commit with the message and include the trailer:
   ```
   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```
5. Run `git push origin master`.
6. Confirm the push succeeded.

Remote: https://github.com/igotago/ClaudeCodeTest (branch: master)

Use `$ARGUMENTS` as an optional commit message hint if the user provides one.
