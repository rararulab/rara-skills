---
name: multica-team
description: >
  Use whenever the user asks rara to handle coding work through Multica. rara
  should translate the request into Multica-native issues, assign work to agent
  teammates, track execution through task runs / comments / websocket events,
  and drive follow-up until the work is verified and shipped.
---

IRON LAW: RARA LEADS, MULTICA IMPLEMENTS. FOR CODING WORK, DEFAULT TO TURNING
THE REQUEST INTO TRACKABLE MULTICA ISSUES AND DRIVING THE TEAM THROUGH TO A
VERIFIED RESULT. DO NOT START WITH DIRECT LOCAL IMPLEMENTATION UNLESS THE USER
EXPLICITLY ASKS RARA TO CODE LOCALLY INSTEAD OF USING MULTICA.

## What this skill is for

This skill is for rara herself.

When the user asks for coding work, the default operating model is:
- rara is planner / dispatcher / reviewer / closer
- Multica agents are implementers
- issues are the source of truth for execution
- verification happens before ship, not after

This skill is for:
- feature implementation
- bug fixes
- refactors
- code-adjacent docs updates
- repair of partially completed implementation
- work that benefits from delegation, tracking, or multi-round follow-up

Do not use this skill for:
- pure research or explanation with no code changes
- tasks the user explicitly wants rara to implement locally
- tiny local-only edits where the user clearly requested direct hands-on coding

## Decision rule: Multica team or direct local work?

Default answer: **use Multica team**.

Use this skill when one or more are true:
- the user asked rara to handle coding work and did not explicitly request local coding
- the task needs traceability, issue history, or multiple rounds
- the task is broad enough that planning, assignment, and verification should be separated
- the work may need splitting across multiple units

Switch to direct local implementation only when one or more are true:
- the user explicitly says to code locally instead of using Multica
- the task is so small and immediate that orchestration would be needless overhead
- the user needs an in-session local patch rather than team dispatch

If there is tension between the workflow and the user's request, surface it plainly:
- state the default team workflow
- state the reason for it
- state the trade-off of bypassing it
- follow the user's explicit choice

## Multica-native operating model

Do orchestration through Multica's real domain model, not an imaginary generic
"run task" API.

Load these reference files when needed:
- for concrete issue / comment structures → `references/issue-templates.md`
- for decomposition, assignment, monitoring, and closure decisions → `references/operating-rules.md`

Use these primitives:
- **Issue tree**: parent issue + child issues via `parent_issue_id`
- **Dispatch**: assign issue to an agent with `assignee_type=agent` and `assignee_id`
- **Follow-up**: comments and `@mention` to trigger more work on an existing issue
- **Tracking**: `active-task`, `task-runs`, task messages, and `/ws` events
- **Status**: issue status is not guaranteed to auto-sync with task lifecycle, so rara must verify and manage it deliberately

Important constraint:
- there is no reliable user-facing generic `create task` API to bypass issues
- task creation is driven by issue assignment, comments, mentions, and chat
- therefore, treat **issues as the primary orchestration unit**

## Workflow checklist

Copy and track progress:

```text
- [ ] 1. Triage the request
- [ ] ⛔ 2. Decide: Multica team vs direct local work
- [ ] 3. Write the work contract
- [ ] 4. Create issue or issue tree
- [ ] ⛔ 5. Assign only when the issue body is ready
- [ ] 6. Monitor active execution
- [ ] ⚠️ 7. Verify artifacts and task outcome
- [ ] ⛔ 8. Decide: ship, follow up, split, or reassign
- [ ] 9. Close children first, then close parent if truly done
- [ ] 10. Report back clearly to the user
```

## 1. Triage the request

Clarify these first:
- goal
- target repo / area
- constraints
- acceptance criteria or expected outcome
- urgency / sequencing
- whether the user wants to bypass Multica and have rara code locally

If the request is missing a blocking fact, ask for that fact before dispatch.
Do not guess repo, ownership, or success criteria.

## 2. Decide: Multica team vs direct local work ⛔

Make the choice explicitly.

### Use Multica team when
- coding work is requested and no local-only instruction was given
- the task should be tracked as a work unit
- the task may need follow-up rounds
- the task may need decomposition or verification beyond one quick edit

### Use direct local work when
- the user explicitly requests local implementation
- orchestration overhead would exceed the work itself
- there is no meaningful value in assignment, run tracking, or issue history

If choosing local work, stop using this skill and switch workflows cleanly.

## 3. Write the work contract

For medium+ tasks, write down:
- product context
- deliverables
- constraints
- out of scope
- acceptance criteria
- risks / sequencing notes

Stay at the WHAT level unless implementation details are true constraints.
Do not over-specify file-level tactics just to feel precise.

Use:
- `references/issue-templates.md` for concrete issue and comment wording
- `references/operating-rules.md` for split / ownership / closure decisions

## 4. Create issue or issue tree

Represent the work in Multica using issues.

### Keep one issue when
- the change is coherent
- one agent can reasonably finish it in one focused round
- review is straightforward
- success can be checked with a short, concrete acceptance list

### Use parent + child issues when
- backend and frontend are separable
- implementation and docs are distinct workstreams
- migration / rollout / cleanup should be tracked independently
- one prompt would be too broad to verify reliably
- ownership or sequencing should be explicit

### Small task shape
Create one issue with:
- clear title
- concrete body
- acceptance criteria
- correct assignee target

### Larger task shape
Use an issue tree:
- create one **parent issue** for the overall objective
- create **child issues** for concrete sub-tasks
- set `parent_issue_id` on each child
- keep each child narrow enough for a single agent round

Use parent/child issues instead of hiding decomposition in comments.

## 5. Assign only when the issue body is ready ⛔

Assignment is dispatch.

Core rule:
- assigning an issue to a ready agent is the main task-dispatch path
- changing assignee can cancel existing work and enqueue work for the new agent

So rara should:
- assign the right issue to the right agent
- avoid noisy reassignment unless it is intentional
- use one issue per coherent deliverable
- leave a handoff note when ownership changes

If the work is a narrow continuation on an existing issue, rara may also:
- add a comment
- `@mention` an agent
- use the comment as the follow-up instruction

Use comment-driven follow-up for narrow continuation work.
Use new child issues for substantial new scope.

## Issue / instruction writing rules

Whether writing an issue body or a follow-up comment, include:
- goal
- relevant repo context
- deliverables
- constraints
- out of scope when needed
- acceptance criteria

Rules:
- specify WHAT to deliver, not HOW to code it
- make acceptance criteria testable
- include repo paths only when they help orientation
- keep each issue narrow enough to review cleanly
- restate the concrete delta in follow-up rounds

Avoid vague instructions like:
- "continue"
- "please fix this"
- "do more"

## 6. Monitor active execution

Track execution using Multica-native signals.

Primary observability tools:
- `GET /api/issues/{id}/active-task`
- `GET /api/issues/{id}/task-runs`
- task messages for a task run
- workspace websocket `/ws`
- issue timeline / comments

Preferred pattern:
- use REST to create / update / assign work
- use websocket to watch for progress events when available
- use REST polling as fallback or confirmation

Watch for:
- no task created after assignment
- task starts but produces no progress
- repeated failure or cancellation
- agent comments / blockers
- issue status claiming done while evidence is incomplete

If signals conflict, trust artifacts and run history over superficial status labels.

## 7. Verify artifacts and task outcome ⚠️

After a Multica round finishes, review:
- correctness
- completeness
- architecture fit
- test coverage
- security / safety
- build / lint / CI status
- issue status vs actual task outcome

Important:
- task completion does not guarantee issue status was updated correctly
- issue status alone is not enough evidence that the work is done
- rara should verify artifact quality and task-run outcome together

For larger tasks, record a simple verdict:
- `GO`
- `NO_GO`

If the result is insufficient:
- leave a precise follow-up comment and mention the agent, or
- create a focused child issue for the next round, or
- reassign intentionally if a different agent should take over

Do not use vague "please continue" retries.

## 8. Decide: ship, follow up, split, or reassign ⛔

After verification, make the next move deliberately.

### Ship when
- requested behavior exists
- acceptance criteria are met
- tests / lint / build / CI are acceptable
- no meaningful scope gap remains

### Follow up in the same issue when
- the delta is narrow
- ownership should stay the same
- the next round is a correction, clarification, or review fix

### Split into a new child issue when
- new scope emerged
- the repair is substantial
- tracking, ownership, or sequencing should be separate

### Reassign when
- specialization mismatch is clear
- one agent is repeatedly blocked
- the scope changed and genuinely needs different expertise

Bad reason to reassign:
- vague hope that another agent will magically guess better

## 9. Close children first, then close parent if truly done

If verification passes:
- update / prepare PR state
- confirm CI status
- summarize residual risk
- close or advance child issues first
- close the parent only when the full objective is truly satisfied

Parent closure rule:
- do not close the parent because one child succeeded
- do not use parent closure as a convenience marker
- close the parent only when all required children are complete and the integrated outcome meets the parent goal

## 10. Report back clearly to the user

When updating the user, focus on:
- what was dispatched
- what is running / blocked / done
- what was verified
- what decision rara made next
- any trade-off or escalation that needs user input

Keep updates short and operational.

## Principles

- rara coordinates; Multica agents implement
- issues are the source of truth for execution
- contracts beat ephemeral chat context
- verification is mandatory before shipping
- improve the instruction surface instead of retrying vaguely
- after two failed rounds overall, escalate clearly to the user

## Failure handling

### Result drifts from request
- tighten deliverables
- tighten out-of-scope
- rewrite ambiguous acceptance criteria
- prefer a narrow follow-up issue or comment over a broad retry

### Task is too large
- split into parent/child issues
- sequence the children explicitly
- reduce each round to one coherent deliverable

### One agent is blocked
- inspect task runs, messages, comments, and blockers
- decide whether to comment, clarify, split, or reassign

### Verification fails twice
- stop repeating the same instruction
- narrow the task
- improve the work contract
- escalate to the user with the blocker and next best option

### User wants direct implementation instead
- state that rara normally routes coding work through Multica
- switch only if the user explicitly wants local implementation

## Anti-patterns

Do not:
- start coding locally just because the request looks implementable
- bypass issues with an imaginary generic task flow
- assign before the issue body is ready
- hide substantial new scope inside a comment thread
- use one issue for unrelated deliverables
- trust issue status alone as proof of completion
- close a parent while required children are still incomplete
- reassign casually out of impatience
- retry with the same vague instruction twice
- keep the user in the dark after repeated failures

## Pre-delivery checks

Before declaring the work shipped, verify:
- [ ] the chosen workflow was correct: Multica team vs local direct work
- [ ] every issue has a clear goal, deliverables, constraints, and acceptance criteria
- [ ] issue split vs single-issue decision is still sensible
- [ ] assignment history still reflects real ownership
- [ ] task runs and artifacts support the claimed outcome
- [ ] tests / build / lint / CI state are acceptable for the task
- [ ] follow-up work, if any, is tracked explicitly rather than implied
- [ ] parent closure rule is satisfied
- [ ] the user update reflects actual verified state, not optimistic status labels
