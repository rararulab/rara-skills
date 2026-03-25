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

## Architecture: Planner → Generator → Evaluator

Inspired by Anthropic's harness design research. Three specialized roles:

- **Planner** (you): Expand requirements into a clear spec with deliverables.
  Focus on *product context* and *high-level technical design* — NOT granular
  implementation details. Errors in over-specified plans cascade downstream.
- **Generator** (`claude -p` / Ralph): Implements code. Let it figure out the path.
- **Evaluator** (`claude -p` read-only): Grades output against concrete criteria.
  Models cannot reliably self-evaluate — a separate evaluation pass catches
  what the generator misses.

**When to use the evaluator**: The evaluator is not always needed. Use it when
the task is at the *edge of model capability* — complex features, multi-module
changes, unfamiliar domains. Skip it for simple, well-understood changes where
build verification alone is sufficient.

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

## Task Complexity Tiers

Match the workflow to the task. Not every change needs the full pipeline.

| Tier | Example | Workflow |
|------|---------|---------|
| **Small** | Fix typo, bump version, config change | Issue → worktree → delegate → verify build → PR |
| **Medium** | New endpoint, refactor module, fix bug | Issue → worktree → **plan spec** → delegate → verify build → PR |
| **Large** | New feature, multi-module change | Issue → worktree → **plan spec** → delegate → **evaluate** → fix → PR |
| **Epic** | Multi-story PRD, new subsystem | Issue → worktree → **plan spec** → Ralph → **evaluate** → fix → PR |

## Workflow Checklist

Copy and track progress:

```
- [ ] 1. Create issue ⚠️ REQUIRED
- [ ] 2. Create worktree
- [ ] 3. Plan spec (medium+ tasks)
- [ ] 4. Delegate work ⛔ BLOCKING on steps 1-2
- [ ] 5. Evaluate output (large+ tasks)
- [ ] 6. Verify build ⚠️ REQUIRED
- [ ] 7. Push & create PR
- [ ] 8. CI green ⚠️ REQUIRED — do NOT report done until green
- [ ] 9. Cleanup (after merge)
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

### Step 3: Plan Spec (Medium+ Tasks)

Before delegating, expand the requirements into a concrete spec. This is the
**planner** role. Focus on WHAT to deliver, not HOW to implement it.

A good spec includes:
- **Product context**: Why this change matters, who it serves
- **Deliverables**: Concrete, verifiable outcomes (not implementation steps)
- **Constraints**: Non-negotiable requirements (API contracts, perf bounds, etc.)
- **Out of scope**: What to explicitly NOT do

A bad spec includes: file-by-file implementation instructions, exact function
signatures, or line-level changes. Over-specifying causes cascading errors
when the plan gets something wrong. Let the generator figure out the path.

For simple tasks (small tier), skip this step — the issue description is enough.

### Step 4: Delegate Work ⛔ BLOCKING on steps 1-2

Navigate into the worktree, then delegate:

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

### Step 5: Evaluate Output (Large+ Tasks)

**Why**: Models cannot reliably grade their own work. A separate evaluation
pass — using a fresh context — catches issues the generator is blind to.

Delegate evaluation to a **separate** `claude -p` invocation (read-only, no
`--dangerously-skip-permissions`):

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

If NO_GO, feed the fix list back to the generator:

```bash
claude -p --dangerously-skip-permissions \
  "Fix these issues found during evaluation:
<paste evaluator's prioritized fix list>

Do NOT re-implement working code. Only fix the identified issues."
```

Repeat evaluate → fix at most **2 rounds**. If still NO_GO after 2 rounds,
escalate to user rather than looping indefinitely.

**Skip this step** for small/medium tasks where build verification is sufficient.

### Step 6: Verify Build ⚠️ REQUIRED

Always verify in the worktree after the agent finishes:

```bash
cd .worktrees/issue-{N}-{short-name}
# Run project-appropriate checks (cargo check, npm run build, etc.)
```

If verification fails, send the agent back:

```bash
claude -p --dangerously-skip-permissions "Build failed with: <error>. Fix the issue."
```

### Step 7: Push & Create PR

```bash
cd .worktrees/issue-{N}-{short-name}
git push -u origin issue-{N}-{short-name}

gh pr create \
  --title "<type>(<scope>): <description> (#N)" \
  --body "Closes #{N}" \
  --label "<type-label>" \
  --label "<component-label>"
```

### Step 8: Wait for CI Green ⚠️ REQUIRED

Non-negotiable. Never report a PR as complete while CI is pending or failing.

```bash
gh pr checks {PR-number} --watch
```

If a check fails:
1. Read the failure: `gh pr checks {PR-number}`
2. Fix via agent: `cd .worktrees/... && claude -p --dangerously-skip-permissions "CI failed: <error>. Fix it."`
3. Re-verify: `gh pr checks {PR-number} --watch`

### Step 9: Cleanup (After Merge)

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
- **Over-specify implementation in prompts** — define deliverables, not file-level steps. Errors in over-specified plans cascade downstream
- **Let the generator self-evaluate** — models have a blind spot for their own work. Use a separate evaluation pass for complex tasks
- **Loop evaluator indefinitely** — max 2 evaluate→fix rounds, then escalate to user

## Troubleshooting

**Claude CLI not installed**: `npm install -g @anthropic-ai/claude-code`

**Ralph not set up**: Load `references/ralph-setup.md` for installation options.

**Permission errors with `claude -p`**: Add `--dangerously-skip-permissions` for
tasks that modify files. Only use in trusted directories.

**CI keeps failing**: Read full error output before re-delegating. Common causes:
- Lint warnings treated as errors
- Formatting not applied
- Failing tests from unhandled edge cases

**Agent goes off the rails on long tasks**: Break into smaller deliverables.
For tasks exceeding model capability, use the evaluator loop to course-correct.
If using Ralph, ensure `prd.json` items are small enough for single-session work.
