# CLI Templates

## Claude Code CLI (`claude`)

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

## Ralph (Autonomous Agent Loop)

For multi-story features. Ralph runs Claude Code repeatedly in fresh contexts
until all PRD items are complete. Memory persists via git history, `progress.txt`,
and `prd.json`.

If Ralph is not installed → load `references/ralph-setup.md` for installation options.

```bash
./scripts/ralph/ralph.sh --tool claude [max_iterations]  # default: 10
```

**When to use**: Single task → `claude -p`. Multi-story PRD → Ralph.

## Delegation Template

```bash
cd .worktrees/issue-{N}-{short-name}

claude -p --dangerously-skip-permissions \
  "Implement <description>. Issue #{N}, branch issue-{N}-{short-name}.

Product context: <why this matters>

Deliverables:
- <concrete outcome 1>
- <concrete outcome 2>

Constraints:
- <non-negotiable requirement>

Out of scope:
- <what NOT to do>"
```

## Evaluation Template

```bash
cd .worktrees/issue-{N}-{short-name}

claude -p "Evaluate the changes on this branch against these criteria:

1. **Correctness**: Does it handle edge cases? Are there logic errors?
2. **Completeness**: Are all deliverables from the spec implemented?
   Missing features are the #1 failure mode in long-running agent work.
3. **Architecture**: Does it follow existing codebase patterns?
4. **Test coverage**: What scenarios lack tests?
5. **Security**: Any injection, overflow, or unsafe patterns?

For each criterion, rate: PASS / NEEDS_WORK / FAIL
Provide specific file:line references for any issues found.
End with a GO / NO_GO verdict and a prioritized fix list if NO_GO."
```

## Parallel Workstreams

```bash
cd .worktrees/issue-{A}-{name-a} && claude -p --dangerously-skip-permissions "<task A>" &
cd .worktrees/issue-{B}-{name-b} && claude -p --dangerously-skip-permissions "<task B>" &
wait
```

## Issue Creation

```bash
gh issue create \
  --title "<type>(<scope>): <description>" \
  --label "created-by:claude" \
  --label "<type-label>" \
  --label "<component-label>" \
  --body "<context and acceptance criteria>"
```

Labels are mandatory. Every issue needs three:
- `created-by:claude` — always
- **Type**: `bug`, `enhancement`, `refactor`, `chore`, `documentation`
- **Component**: `core`, `backend`, `ui`, `extension`, `ci`

## Worktree

```bash
git worktree add .worktrees/issue-{N}-{short-name} -b issue-{N}-{short-name}
```

## PR Creation

```bash
cd .worktrees/issue-{N}-{short-name}
git push -u origin issue-{N}-{short-name}

gh pr create \
  --title "<type>(<scope>): <description> (#N)" \
  --body "Closes #{N}" \
  --label "<type-label>" \
  --label "<component-label>"
```

## CI Watch

```bash
gh pr checks {PR-number} --watch
```

## Cleanup (after merge confirmed)

```bash
git worktree remove .worktrees/issue-{N}-{short-name}
git branch -d issue-{N}-{short-name}
```
