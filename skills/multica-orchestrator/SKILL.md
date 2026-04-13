---
name: multica-orchestrator
description: >
  Use when rara needs Multica issue stages to advance autonomously. This skill
  defines a controller-owned workflow contract that parses canonical stage
  artifacts, validates plan/build/review gates, emits authoritative handoff
  comments, and stops automatic transition when evidence is incomplete.
---

Use this skill after work has already been represented in Multica issues and the
next problem is no longer just "is the task still running?" but "is the stage
ready to hand off automatically and audibly?"

This skill sits above `multica-team` and `multica-polling`.
- `multica-team` decides the issue tree, issue bodies, dispatch contract, and ownership model
- `multica-polling` tells rara whether a specific dispatched issue is still running, terminal, timed out, or unobservable
- this skill is the workflow controller: it decides whether a terminal stage result is good enough to advance the workflow, and it produces the authoritative handoff record

## Files

- Skill instructions: `skills/multica-orchestrator/SKILL.md`
- Workflow controller script: `scripts/multica-orchestrate.ts`

## Core rule

Autonomy is not the same as blind reassignment.

Never advance to the next stage just because:
- the task completed
- the issue says `in_review`
- the latest comment sounds confident
- an agent recommends a next assignee in free-form prose

Advance only when all four are true:
1. the current stage reached a terminal execution result
2. the controller found a canonical `STAGE_RESULT` artifact
3. the stage validator passed
4. the controller emitted an authoritative transition decision

If any of those fail, stop the handoff and choose one of:
- `reschedule` for the same stage with a corrective follow-up
- `blocked`
- `needs_human`

## Workflow shape

This skill targets a simple staged coding pipeline:
- `plan`
- `build`
- `review`

Default forward path:
- `plan -> build -> review -> done`

Non-forward outcomes:
- `reschedule` for same-stage correction or continued waiting
- `blocked`
- `needs_human`
- `done`

Do not treat issue status alone as the stage machine.
The workflow controller owns the stage decision.

## Operating model

The controller keeps a workflow state object that can be persisted in the
scheduled message and echoed into issue comments for auditability.

Minimum context shape:

```json
{
  "workflow": "multica_orchestrator",
  "schema_version": 2,
  "root_issue_id": "ISSUE-100",
  "workflow_graph": {
    "plan": { "issue_id": "ISSUE-101", "assignee_label": "Planner" },
    "build": { "issue_id": "ISSUE-102", "assignee_label": "Builder" },
    "review": { "issue_id": "ISSUE-103", "assignee_label": "Reviewer" }
  },
  "current_stage": "plan",
  "current_issue_id": "ISSUE-101",
  "next_stage": "build",
  "attempt": 1,
  "last_task_id": null,
  "last_observed_status": null,
  "validator_status": "pending",
  "handoff_ready": false,
  "escalation_count": 0,
  "max_stage_attempts": 2,
  "expected_delivery_mode": "commit+push",
  "history": [],
  "last_transition_audit": null
}
```

The meaning should remain stable:
- the controller owns the workflow graph
- stage-to-issue mapping is explicit, not inferred from current comments
- the latest observed task identity/status is persisted
- validation state and retry budget are persisted
- automatic handoff is gated by audit output, not by status labels

## Canonical stage result contract

Automatic handoff only works if stage outputs are machine-checkable.
Require the assigned agent to produce a canonical JSON artifact in the final
issue comment or artifact attachment.

Preferred canonical format:

```md
## STAGE_RESULT

```json
{
  "schema_version": 1,
  "stage": "plan",
  "status": "ready_for_handoff",
  "summary": "Problem and fix direction are clear.",
  "comment_id": "comment-123",
  "fields": {
    "observed_problem": "...",
    "evidence": "...",
    "root_cause": "...",
    "affected_surface": "...",
    "implementation_shape": "...",
    "acceptance_criteria": "...",
    "risks": "..."
  },
  "next_recommendation": "handoff"
}
```
```

The controller should parse only the JSON artifact.
Do not trust surrounding prose as the source of truth.

## Validator requirements

### Plan stage must include
- observed problem
- supporting evidence
- root cause
- affected files, functions, or surface area
- implementation shape / proposed fix direction
- acceptance criteria
- risks or open questions

### Build stage must include
- branch name
- commit SHA or explicit fallback artifact path
- changed files summary
- commands/tests run
- result of those commands/tests
- residual risks or known gaps
- delivery evidence matching the declared dispatch contract

### Review stage must include
- verdict: `GO` or `NO_GO`
- evidence for the verdict
- blocking issues if `NO_GO`
- residual risks if `GO`
- next action recommendation

If a stage result misses any mandatory field, validation fails even if the task
itself completed successfully.

## Delivery-mode gate

`build -> review` is not allowed on code changes alone.

The controller must verify that the declared delivery mode was satisfied:
- `commit+push`
- `commit+push+pr`
- `local-artifact`
- `issue-comment`
- `artifact+comment`

Build artifacts must therefore include delivery evidence, for example:

```json
{
  "delivery": {
    "mode": "commit+push",
    "status": "satisfied",
    "branch": "feat/fix-x",
    "commit_sha": "abc123",
    "pr_url": null,
    "artifact_path": null,
    "comment_ref": "comment-456"
  }
}
```

If `expected_delivery_mode` is missing from controller context, build validation
must fail. The controller is not allowed to guess what “done” meant.

## Transition policy

### `plan -> build`
Advance only when:
- the plan task is terminal success
- the plan validator passes
- the next build issue is already known in `workflow_graph`

Then:
- produce an authoritative handoff summary
- post the controller-generated handoff note
- assign the build issue to the build agent
- continue tracking on the build stage

### `build -> review`
Advance only when:
- the build task is terminal success
- the build validator passes
- the delivery mode in the dispatch contract was actually satisfied

Then:
- produce an authoritative review handoff summary
- include commit/branch/test/delivery evidence
- assign the review issue to the review agent
- continue tracking on the review stage

### `review -> done`
Advance only when:
- the review task is terminal success
- the review validator returns `GO`
- no blocking gaps remain in the issue tree

Then:
- mark the workflow complete
- summarize the final outcome
- close or advance issues according to the higher-level workflow

## Failure and correction policy

### Missing canonical artifact
If the stage completed but the canonical JSON result is missing:
- keep the stage where it is
- issue a corrective follow-up comment
- request the missing artifact explicitly
- count this as same-stage correction, not stage success

### Canonical artifact exists but fails validation
If the artifact is present but incomplete or contradictory:
- keep the stage where it is
- report the exact missing/invalid fields
- request a corrective follow-up from the same agent when appropriate
- only reassign if the blocker is genuinely ownership-related

### Task failure
If the task itself failed or was cancelled:
- do not hand off
- record `blocked`
- separate execution failure from validation failure

### Poller failure
If observability failed:
- do not infer task failure
- record `needs_human` if bounded retries are exhausted
- repair observation before making workflow claims

### Repeated validator failure
If the same stage fails validation repeatedly:
- stop repeating broad instructions
- escalate after the configured attempt budget
- report `needs_human` with the exact reason automatic transition stopped

## Scheduler contract

Use `schedule-once` chaining, not free-running intervals.

A typical loop is:
1. inspect the current issue/task state
2. if execution is non-terminal, reschedule
3. if execution is terminal, parse the canonical stage artifact
4. validate the artifact
5. either hand off, retry same stage, or escalate
6. persist the updated orchestrator context plus transition audit in the next scheduled message

## Script contract

The bundled controller script exposes five commands.

### 1. Initialize workflow context

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-orchestrate.ts" init \
  --root-issue-id ISSUE-100 \
  --plan-issue-id ISSUE-101 \
  --build-issue-id ISSUE-102 \
  --review-issue-id ISSUE-103 \
  --expected-delivery-mode commit+push
```

### 2. Evaluate one stage observation

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-orchestrate.ts" evaluate \
  --context-json '<json>' \
  --observed-state completed \
  --task-id TASK-123 \
  --artifact-json '{"schema_version":1,"stage":"build","status":"ready_for_handoff","summary":"Build is ready.","comment_id":"comment-22","fields":{"branch":"feat/x","commit_sha":"abc123","changed_files":"src/a.ts","commands_run":"bun test","test_results":"pass","risks":"low"},"delivery":{"mode":"commit+push","status":"satisfied","branch":"feat/x","commit_sha":"abc123"}}'
```

Output now includes:
- `transition_audit`
- `authoritative_comment`
- `validation.delivery_check`

### 3. Parse a canonical artifact from comment text

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-orchestrate.ts" parse-artifact \
  --text-file ./comment.md
```

This extracts the fenced JSON `STAGE_RESULT` block.

### 4. Render the authoritative handoff / verdict comment

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-orchestrate.ts" render-handoff-comment \
  --context-json '<json>' \
  --decision-json '<evaluate-result-json>'
```

### 5. Rebuild the future scheduled message

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-orchestrate.ts" schedule-message \
  --context-json '<json>'
```

## Result meanings

The controller distinguishes these outcomes:
- `reschedule` — still waiting on execution or a bounded correction round
- `handoff` — current stage passed and the next stage should be dispatched by the controller
- `done` — workflow is complete
- `blocked` — stage failed in a way that should stop autonomous progress
- `needs_human` — ambiguity, repeated validator failure, or observation failure requires rara to intervene

Do not collapse these into a generic success/failure boolean.

## Transition audit

Every terminal controller decision should be explainable with machine-readable
audit data.

Persist at least:
- observed task state
- current stage / issue / task identity
- source artifact comment ID
- artifact SHA-256
- validator status
- controller decision
- next stage
- summary

This audit is part of the workflow contract, not optional debugging metadata.

## Recommended implementation pattern

Keep responsibilities separate:
- `multica-polling` handles task lifecycle observation
- this skill handles stage lifecycle interpretation and controller verdicts

In code terms, the controller should usually consume a normalized execution state:
- `no_run_yet`
- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`
- `poll_error`

Then layer canonical parsing, validation, delivery verification, and transition
comment generation on top.

## Anti-patterns

Do not:
- auto-advance on `completed` alone
- auto-advance on issue status alone
- trust free-form prose instead of canonical JSON
- let an agent’s own next-step suggestion become the stage authority
- hide the handoff reason in private scheduler state only
- retry indefinitely without a stage attempt budget
- merge task failure and poller failure into one vague error bucket
- reassign to a different agent just because the previous output was under-specified

## Pre-flight checklist

Before using this skill, verify:
- [ ] the issue tree and stage ownership are already defined
- [ ] `workflow_graph` explicitly maps plan/build/review to issue IDs
- [ ] each stage is instructed to emit canonical JSON `STAGE_RESULT`
- [ ] polling or equivalent observation exists for the current issue
- [ ] `expected_delivery_mode` is known before automatic `build -> review` handoff
- [ ] retry and escalation budgets are bounded
- [ ] every automatic transition can be explained in an issue comment and in `transition_audit`
