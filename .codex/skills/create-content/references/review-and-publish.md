# Review and Publish

When the user requests changes, update the relevant content and restart or reuse the `bun dev` preview from `site/` so the user can verify the result.

Only publish when the user explicitly says “send it.” Before publishing:

1. Inspect the worktree and isolate files created or changed for the approved request. Do not include unrelated work unless the user explicitly asks to send all changes.
2. Create `content/<slug>` from `main` without discarding or overwriting existing work.
3. Commit the approved files with a conventional content-focused message, push the branch to `origin`, and create a pull request targeting `main`.
4. Give the user the pull-request URL.

Use GitHub CLI to create the pull request. If GitHub authentication, remote access, or safe change isolation prevents publication, report the exact blocker and do not claim that a branch, push, or PR was completed.
