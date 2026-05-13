# Replit prompt generator audit

Date: 2026-05-12

## Repository sync / worktree findings

- `git remote -v` returned no configured remotes, so there was no remote URL available in this checkout to pull Replit's latest changes from.
- `git worktree list --porcelain` reported a single worktree at `/workspace/PRD-LIVE` on branch `work`; there were no sibling Git worktrees to merge.
- `git branch --all --verbose --no-abbrev` reported only the local `work` branch, so there were no remote-tracking branches available in this checkout.

## Standalone prompt generator audit

Searches for `standalone`, `prompt generator`, `Prompt Generator`, `generator`, `rewrite`, `Improve prompt`, and `prompt` showed prompt-related code in `ChatPanel.tsx` and session copy helpers, but no routed standalone prompt generator page was present before this patch.

`artifacts/focusflow/src/App.tsx` only routed `/` to `Home` and then fell through to `NotFound`, so there was no URL path that could open a standalone prompt generator.

## Fix applied in this patch

- Added `/prompt-generator` as a first-class route.
- Added header navigation from the main FocusFlow screen to the standalone prompt generator on desktop and mobile.
- Moved prompt rewrite model metadata and rewrite logic into `src/lib/prompt-rewriter.ts` so both the chat composer and standalone prompt generator use the same implementation.
