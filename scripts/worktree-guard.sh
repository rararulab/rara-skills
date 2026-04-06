#!/usr/bin/env bash
# Worktree guard hook for rara-skills plugin
# Ensures main/master is up-to-date before creating a worktree
# Triggered on Bash commands containing "worktree add"

set -euo pipefail

# Only act on worktree add commands
INPUT=$(cat)
echo "$INPUT" | grep -q "worktree add" || exit 0

# Only run inside a git repo
git rev-parse --git-dir &>/dev/null || exit 0

# Determine default branch
default_branch="main"
if git show-ref --verify --quiet refs/heads/master && ! git show-ref --verify --quiet refs/heads/main; then
  default_branch="master"
fi

# Fetch latest from remote
git fetch origin "$default_branch" --quiet 2>/dev/null || exit 0

local_sha=$(git rev-parse "$default_branch" 2>/dev/null || echo "")
remote_sha=$(git rev-parse "origin/$default_branch" 2>/dev/null || echo "")

if [[ -n "$local_sha" && -n "$remote_sha" && "$local_sha" != "$remote_sha" ]]; then
  behind=$(git rev-list --count "$default_branch..origin/$default_branch" 2>/dev/null || echo "0")
  cat >&2 <<MSG
BLOCKED: Local '$default_branch' is $behind commit(s) behind origin/$default_branch.

Update before creating a worktree:
  git checkout $default_branch && git pull origin $default_branch
MSG
  exit 2
fi

exit 0
