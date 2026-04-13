---
name: multica-orchestrator
description: >
  Use when rara needs Multica issue stages to advance autonomously. This skill
  defines the workflow controller contract that evaluates stage artifacts,
  gates plan/build/review handoffs, triggers corrective follow-up, and escalates
  when automatic transition is unsafe.
---

Use this skill after work has already been represented in Multica issues and the
next problem is no longer just "is the task still running?" but "is the stage
ready to hand off automatically?"

This skill sits above `multica-team` and `multica-polling`.
- `multica-team` decides the issue tree, issue bodies, dispatch contract, and ownership model
- `multica-polling` tells rara whether a specific dispatched issue is still running, terminal, timed out, or unobservable
- this skill decides whether a terminal stage result is good enough to advance the workflow without manual intervention

## Files

- Skill instructions: `skills/multica-orchestrator/SKILL.md`
- Workflow controller script: `scripts/multica-orchestrate.ts`

## Core rule

Autonomy is not the same as blind reassignment.

Never advance to the next stage just because:
- the task completed
- the issue says `in_review`
- the latest comment sounds confident

Advance only when all three are true:
1. the current stage reached a terminal execution result
2. the stage artifact exists in the expected structure
3. the stage validator passes

If any of those fail, stop the handoff and choose one of:
- `reschedule` for the same stage with a corrective follow-up
- `blocked`
- `needs_human`

## Workflow shape

This skill currently targets a simple staged coding pipeline:
- `plan`
- `build`
- `review`

Default forward path:
- `plan -> build -> review`

Non-forward outcomes:
- `reschedule` for same-stage correction or continued waiting
- `blocked`
- `needs_human`
- `done`

Do not treat issue status alone as the stage machine.
The workflow controller owns the stage decision.

## Operating model

The orchestrator keeps a workflow state object that can be persisted in the
scheduled message and echoed into issue comments for auditability.

Minimum context shape:

```json
{
  "workflow": "multica_orchestrator",
  "root_issue_id": "ISSUE-100",
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
  "history": []
}
```

The exact implementation may evolve, but the meaning should remain stable:
- identify the root issue tree
- identify the current stage and issue
- record the latest observed task identity/status
- record whether validation passed
- bound automatic retries
- preserve a compact stage history

## Stage result contract

Automatic handoff only works if stage outputs are machine-checkable.
Require the assigned agent to produce a final structured block in the issue
comment or artifact.

Preferred minimal format:

```md
## STAGE_RESULT
stage: plan
status: ready_for_handoff

## SUMMARY
<short summary>

## ARTIFACTS
- observed_problem: ...
- evidence: ...
- root_cause: ...
- acceptance_criteria: ...
- risks: ...

## NEXT_RECOMMENDATION
assign: Devkit Build
```

The exact markdown prose around it may vary.
The controller should parse by section headers / key-value markers rather than
trusting free-form text.

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

### Review stage must include
- verdict: `GO` or `NO_GO`
- evidence for the verdict
- blocking issues if `NO_GO`
- residual risks if `GO`
- next action recommendation

If a stage result misses any mandatory field, validation fails even if the task
itself completed successfully.

## Transition policy

### `plan -> build`
Advance only when:
- the plan task is terminal success
- the plan validator passes
- the next build issue/owner is already known or can be derived safely

Then:
- produce a handoff summary
- attach or post the authoritative plan result
- assign the build issue to the build agent
- start polling / orchestration for the build stage

### `build -> review`
Advance only when:
- the build task is terminal success
- the build validator passes
- the delivery mode in the dispatch contract was actually satisfied

Then:
- produce a review handoff summary
- include commit/branch/test evidence
- assign the review issue to the review agent
- start polling / orchestration for the review stage

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

### Missing structured artifact
If the stage completed but the expected structured result is missing:
- keep the stage where it is
- issue a corrective follow-up comment
- request the missing fields explicitly
- count this as `retry_same_stage`, not stage success

### Structured artifact exists but fails validation
If the artifact is present but incomplete or contradictory:
- keep the stage where it is
- report the exact missing/invalid fields
- request a corrective follow-up from the same agent when appropriate
- only reassign if the blocker is genuinely ownership-related

### Task failure
If the task itself failed or was cancelled:
- do not hand off
- record `blocked` or `retry_same_stage` based on the failure mode
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
3. if execution is terminal, parse the stage artifact
4. validate the artifact
5. either hand off, retry same stage, or escalate
6. persist the updated orchestrator context in the next scheduled message

## Script contract

The bundled controller script exposes three commands.

### 1. Initialize workflow context

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-orchestrate.ts" init \
  --root-issue-id ISSUE-100 \
  --current-stage plan \
  --current-issue-id ISSUE-101 \
  --next-stage build
```

### 2. Evaluate one stage observation

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-orchestrate.ts" evaluate \
  --context-json '<json>' \
  --observed-state completed \
  --task-id TASK-123 \
  --artifact-json '{"stage":"plan","fields":{"observed_problem":"...","evidence":"...","root_cause":"...","affected_surface":"...","implementation_shape":"...","acceptance_criteria":"...","risks":"..."}}'
```

### 3. Rebuild the future scheduled message

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-orchestrate.ts" schedule-message \
  --context-json '<json>'
```

## Result meanings

The controller should distinguish these outcomes:
- `reschedule` — still waiting on execution or a bounded correction round
- `handoff` — current stage passed and the next stage should be dispatched
- `done` — workflow is complete
- `blocked` — stage failed in a way that should stop autonomous progress
- `needs_human` — ambiguity, repeated validator failure, or observation failure requires rara to intervene

Do not collapse these into a generic success/failure boolean.

## Recommended implementation pattern

Keep responsibilities separate:
- `multica-polling` handles task lifecycle observation
- this skill handles stage lifecycle interpretation

In code terms, the controller should usually consume a normalized execution state:
- `no_run_yet`
- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`
- `poll_error`

Then layer validation and transition logic on top.

## Anti-patterns

Do not:
- auto-advance on `completed` alone
- auto-advance on issue status alone
- hide the handoff reason in private scheduler state only
- retry indefinitely without a stage attempt budget
- merge task failure and poller failure into one vague error bucket
- reassign to a different agent just because the previous output was under-specified
- use free-form prose as the only validation input when a structured artifact was required

## Pre-flight checklist

Before using this skill, verify:
- [ ] the issue tree and stage ownership are already defined
- [ ] each stage has a machine-checkable artifact contract
- [ ] polling or equivalent observation exists for the current issue
- [ ] the next stage target is known before automatic handoff is attempted
- [ ] retry and escalation budgets are bounded
- [ ] every automatic transition can be explained in an issue comment or summary
