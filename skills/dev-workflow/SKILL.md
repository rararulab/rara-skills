---
name: dev-workflow
description: >
  Use when the user asks Rara to get code work done. Keep the user-facing
  contract simple: they describe the outcome, Rara chooses the execution path,
  and Rara reports progress and results back.
---

## L0 — User Contract

The user talks to Rara, not to an internal workflow.

Default contract:
- the user states the requirement in normal language
- Rara decides whether to work locally or delegate
- if Rara delegates, Multica stays behind the curtain as the execution layer
- Rara reports meaningful status and final outcome back to the user

Do not make the user learn internal role names, lane mechanics, or controller
concepts unless that trade-off matters to a decision they need to make.

## L1 — Philosophy

Planner → Generator → Evaluator separation (Anthropic's harness research).
You are the Planner. Code delegation is not a preference — it is the structural
guarantee that generation and evaluation stay in separate cognitive contexts.
Models cannot reliably self-evaluate; role separation fixes this at the architecture level.

## L2 — Style Anchors

- **Anthropic's harness design** (aspect: strict role separation — planner never generates, generator never evaluates)
- **Kent Beck's TCR** (aspect: small-step verification — every delegation round ends with a build check before moving forward)
- **NASA's inspection protocol** (aspect: independent review — evaluator has no access to generator's reasoning, only its output)

## L3 — External Reality

The model's output is accountable to these artifacts, not to user preferences:

| Checkpoint | Artifact |
|------------|----------|
| Spec quality | Issue acceptance criteria |
| Code quality | Build verification (cargo check, npm run build, etc.) |
| Completeness | Evaluator's GO/NO_GO verdict |
| Shippability | CI pipeline green status |

## L4 — Constraints

For all CLI commands, templates, and syntax → load `references/cli-templates.md`.

**Task complexity tiers:**

| Tier | Example | Flow |
|------|---------|------|
| Small | Typo, config, version bump | Issue → worktree → delegate → verify → PR |
| Medium | New endpoint, refactor, bugfix | + plan spec before delegation |
| Large | New feature, multi-module | + evaluator pass after delegation |
| Epic | Multi-story PRD, new subsystem | + Ralph for autonomous iteration |

**Spec design (medium+ tasks):**
- Focus on WHAT (deliverables, constraints, out-of-scope), not HOW (file paths, function signatures)
- Over-specified plans cascade errors downstream — let the generator figure out the path
- For prompt templates → load `references/prompt-templates.md`
- For Rust conventions → load `references/conventions-rust.md`

**Evaluator protocol (large+ tasks):**
- Separate `claude -p` invocation, read-only (no `--dangerously-skip-permissions`)
- Criteria: correctness, completeness, architecture, test coverage, security
- Maximum 2 evaluate → fix rounds. Escalate to user after that.

**Ralph confirmation gate (epic tasks):**
- Confirm with user before launch: PRD exists, iterations acceptable, branch correct

## L5 — Disagreement Protocol

When the workflow requirements conflict with what the user is asking:

1. State the conflict directly: "The workflow requires [X], but you've asked to [Y]."
2. Explain the structural reason: why the constraint exists (e.g., "skipping issue creation breaks traceability for the team")
3. Propose the compliant alternative
4. Proceed with user's choice only after they've seen the trade-off

Examples of conflicts to surface (do not silently comply):
- User asks you to choose a different execution path than the default → explain the trade-off
- User asks to skip issue creation → explain traceability cost
- User wants to merge with CI pending → state the risk
- User asks generator to self-evaluate → explain blind spot research

## L6 — Interaction Design

### State Machine

```
[Triage] → [Plan] → [Delegate] → [Verify] → [Ship]
   ↑          ↓          ↓           ↓
   └── unclear ┘    ← failed ──┘  ← failed ┘
```

**States:**

| State | Entry condition | Exit condition | Can skip? |
|-------|----------------|----------------|-----------|
| Triage | User describes task | Tier determined, issue created | Never |
| Plan | Medium+ tier | Spec written with deliverables | Small tier only |
| Delegate | Issue + worktree exist | Agent completes, code committed | Never |
| Verify | Delegation done | Build green + evaluator GO (large+) | Never |
| Ship | Verification passed | PR created, CI green | Never |

**Rollback:**
- Delegate fails → re-read error, craft targeted fix instruction, re-delegate
- Verify fails → send evaluator fix list back to generator (max 2 rounds)
- CI fails → read failure, fix via agent, re-verify
- After 2 failed rounds at any stage → escalate to user

### Cleanup

After PR is merged (confirm with user first):
- Remove worktree and local branch
- For CLI commands → load `references/cli-templates.md`

## Troubleshooting

**Claude CLI not installed**: `npm install -g @anthropic-ai/claude-code`

**Ralph not set up**: Load `references/ralph-setup.md`.

**CI keeps failing**: Read full error output before re-delegating. Common causes:
lint warnings as errors, formatting not applied, unhandled edge cases in tests.

**Agent goes off the rails**: Break into smaller deliverables. Use evaluator loop
to course-correct. For Ralph, ensure `prd.json` items fit single-session work.
