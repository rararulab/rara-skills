#!/usr/bin/env bash
# Branch guard hook for rara-skills plugin
# Enforces dev-workflow rules:
#   1. No direct edits on main/master — use a worktree
#   2. No edits on branches with merged/closed PRs — start fresh

set -euo pipefail

# Only run inside a git repo
git rev-parse --git-dir &>/dev/null || exit 0

branch=$(git branch --show-current 2>/dev/null || echo "")

# Guard 1: Block edits on main/master
if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  cat >&2 <<'MSG'
BLOCKED: You are on the main branch. Direct edits on main are not allowed.

Create a worktree first:
  gh issue create --title "<type>(<scope>): <description>" --label "created-by:claude"
  git worktree add .worktrees/issue-{N}-{name} -b issue-{N}-{name}
  cd .worktrees/issue-{N}-{name}

Or use: claude --worktree "<instruction>"
MSG
  exit 2
fi

# Guard 2: Block edits on branches with merged/closed PRs
if [[ -n "$branch" ]] && command -v gh &>/dev/null; then
  pr_state=$(gh pr view "$branch" --json state -q '.state' 2>/dev/null || echo "")
  if [[ "$pr_state" == "MERGED" ]]; then
    cat >&2 <<MSG
BLOCKED: PR for branch '$branch' is already MERGED.

Start fresh from main:
  git worktree add .worktrees/issue-{N}-{name} -b issue-{N}-{name}
  cd .worktrees/issue-{N}-{name}

Or cleanup this branch:
  git worktree remove .worktrees/$branch 2>/dev/null
  git branch -d $branch
MSG
    exit 2
  fi
  if [[ "$pr_state" == "CLOSED" ]]; then
    cat >&2 <<MSG
BLOCKED: PR for branch '$branch' is CLOSED.

Create a new worktree from main:
  git worktree add .worktrees/issue-{N}-{name} -b issue-{N}-{name}
  cd .worktrees/issue-{N}-{name}
MSG
    exit 2
  fi
fi

exit 0
