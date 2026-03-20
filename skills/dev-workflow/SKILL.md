---
name: dev-workflow
description: >
  Orchestrates software development tasks by delegating work to Claude Code CLI
  and Ralph (autonomous agent loop). Use this skill whenever rara needs to implement
  features, fix bugs, review code, analyze requirements, create pull requests, or
  perform any code-related development task. This includes writing code, reviewing
  changes, managing issues, running CI checks, and handling the full development
  lifecycle — even if the user just says "fix this bug" or "add a feature" without
  mentioning agents or workflows explicitly.
---

IRON LAW: You never write code directly. Every code change — implementation,
fix, refactor — is delegated to `claude -p` or Ralph. Your job is planning,
coordination, and verification. If you catch yourself editing a file, stop.

## Tools

### Claude Code CLI (`claude`)

Single-task delegation. Use `-p` (print mode) for non-interactive execution.

```bash
# Analysis (read-only) — no special permissions needed
claude -p "<instruction>"

# Implementation (writes files) — needs permission bypass
claude -p --dangerously-skip-permissions "<instruction>"

# Work in a specific worktree — cd into it first
cd .worktrees/issue-{N}-{name} && claude -p --dangerously-skip-permissions "<instruction>"

# Auto-create isolated worktree
claude --worktree "<instruction>"

# Use a faster model for quick tasks
claude -p --model sonnet "<instruction>"
```

**Rule of thumb**: tasks that *modify code* need `--dangerously-skip-permissions`.
Tasks that only *analyze* use plain `claude -p`.

### Ralph (Autonomous Agent Loop)

For multi-story features. Ralph runs Claude Code repeatedly in fresh contexts
until all PRD items are complete. Memory persists via git history, `progress.txt`,
and `prd.json`.

If Ralph is not installed → load `references/ralph-setup.md` for installation options.

```bash
./scripts/ralph/ralph.sh --tool claude [max_iterations]  # default: 10
```

**When to use**: Single task → `claude -p`. Multi-story PRD → Ralph.

## Workflow Checklist

Copy and track progress:

```
- [ ] 1. Create issue ⚠️ REQUIRED
- [ ] 2. Create worktree
- [ ] 3. Delegate work ⛔ BLOCKING on steps 1-2
- [ ] 4. Verify build ⚠️ REQUIRED
- [ ] 5. Push & create PR
- [ ] 6. CI green ⚠️ REQUIRED — do NOT report done until green
- [ ] 7. Cleanup (after merge)
```

## The Development Lifecycle

### Step 1: Create Issue ⚠️ REQUIRED

Every change starts with a GitHub issue — even one-line fixes.

```bash
gh issue create \
  --title "<type>(<scope>): <description>" \
  --label "created-by:claude" \
  --label "<type-label>" \
  --label "<component-label>" \
  --body "<context and acceptance criteria>"
```

**Labels are mandatory.** Every issue needs three:
- `created-by:claude` — always
- **Type**: `bug`, `enhancement`, `refactor`, `chore`, `documentation`
- **Component**: `core`, `backend`, `ui`, `extension`, `ci`

### Step 2: Create Worktree

```bash
git worktree add .worktrees/issue-{N}-{short-name} -b issue-{N}-{short-name}
```

### Step 3: Delegate Work ⛔ BLOCKING on steps 1-2

Navigate into the worktree, then delegate:

```bash
cd .worktrees/issue-{N}-{short-name}

claude -p --dangerously-skip-permissions \
  "Implement <description>. Issue #{N}, branch issue-{N}-{short-name}.
<requirements and constraints>"
```

For prompt templates (implementation, review, analysis) → load `references/prompt-templates.md`.

For Rust project conventions to include in prompts → load `references/conventions-rust.md`.

#### Multi-Story Features (→ Ralph)

**⛔ CONFIRMATION GATE**: Before launching Ralph, confirm with user:
- PRD exists and is converted to `prd.json`
- Max iterations count is acceptable
- Feature branch is correct

```bash
./scripts/ralph/ralph.sh --tool claude [max_iterations]
```

#### Parallel Workstreams

For independent tasks in separate worktrees:

```bash
cd .worktrees/issue-{A}-{name-a} && claude -p --dangerously-skip-permissions "<task A>" &
cd .worktrees/issue-{B}-{name-b} && claude -p --dangerously-skip-permissions "<task B>" &
wait
```

### Step 4: Verify Build ⚠️ REQUIRED

Always verify in the worktree after the agent finishes:

```bash
cd .worktrees/issue-{N}-{short-name}
# Run project-appropriate checks (cargo check, npm run build, etc.)
```

If verification fails, send the agent back:

```bash
claude -p --dangerously-skip-permissions "Build failed with: <error>. Fix the issue."
```

### Step 5: Push & Create PR

```bash
cd .worktrees/issue-{N}-{short-name}
git push -u origin issue-{N}-{short-name}

gh pr create \
  --title "<type>(<scope>): <description> (#N)" \
  --body "Closes #{N}" \
  --label "<type-label>" \
  --label "<component-label>"
```

### Step 6: Wait for CI Green ⚠️ REQUIRED

Non-negotiable. Never report a PR as complete while CI is pending or failing.

```bash
gh pr checks {PR-number} --watch
```

If a check fails:
1. Read the failure: `gh pr checks {PR-number}`
2. Fix via agent: `cd .worktrees/... && claude -p --dangerously-skip-permissions "CI failed: <error>. Fix it."`
3. Re-verify: `gh pr checks {PR-number} --watch`

### Step 7: Cleanup (After Merge)

**⛔ CONFIRMATION GATE**: Confirm the PR is merged before cleanup.

```bash
git worktree remove .worktrees/issue-{N}-{short-name}
git branch -d issue-{N}-{short-name}
```

## Code Review

Delegate all reviews to Claude in read-only mode (no `--dangerously-skip-permissions`):

```bash
claude -p "Review PR #{N}. Focus on:
- Breaking changes or API contract violations
- Error handling gaps
- Test coverage for new code paths
- Performance implications
Provide findings as: [CRITICAL|WARNING|INFO] file:line — description"
```

For detailed review prompt templates → load `references/prompt-templates.md`.

## Anti-Patterns

Do NOT:
- **Write code directly** — always delegate, even for "just one line"
- **Skip issue creation** for "quick fixes" — every change needs traceability
- **Merge without CI green** — "it's probably fine" is never acceptable
- **Delegate without specifying the worktree** — agent will edit wrong directory
- **Launch Ralph without user confirmation** — it runs autonomously and costs tokens
- **Use `--dangerously-skip-permissions` for read-only tasks** — principle of least privilege
- **Re-delegate blindly on failure** — read the error output first, then craft a targeted fix instruction

## Troubleshooting

**Claude CLI not installed**: `npm install -g @anthropic-ai/claude-code`

**Ralph not set up**: Load `references/ralph-setup.md` for installation options.

**Permission errors with `claude -p`**: Add `--dangerously-skip-permissions` for
tasks that modify files. Only use in trusted directories.

**CI keeps failing**: Read full error output before re-delegating. Common causes:
- Lint warnings treated as errors
- Formatting not applied
- Failing tests from unhandled edge cases
