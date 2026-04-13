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
- for sustained post-dispatch run tracking → switch to `multica-polling`
- for automatic stage gating / controller-owned handoff after dispatch → switch to `multica-orchestrator`

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
- if the workflow will auto-advance across `plan -> build -> review`, define the stage issue IDs and canonical `STAGE_RESULT` contract before dispatch

## Workflow checklist

Copy and track progress:

```text
- [ ] 1. Triage the request
- [ ] ⛔ 2. Decide: Multica team vs direct local work
- [ ] ⛔ 3. Write the work contract
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

## 3. Write the work contract ⛔

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

### Dispatch contract: required fields

Never dispatch a Multica task with an implicit repo contract. If the agent must
write, commit, push, or publish, state exactly where and how. If that
information is unavailable, explicitly define the fallback output path instead
of leaving the agent to guess.

Before dispatching, make sure the task text answers all of these:

1. **Target repository**
   - exact repo URL or canonical repo identity
   - example: `git@github.com:rararulab/rara-wiki.git`

2. **Writable checkout location**
   - state the exact writable checkout path if one is already exposed
   - if no writable checkout is guaranteed, say so explicitly

3. **Branch contract**
   - exact branch name to use or update
   - say whether the agent should create it, continue it, or only push to it

4. **Expected delivery mode**
   - one of:
     - commit + push
     - commit + push + PR link
     - local artifact only
     - issue comment with paste/summary
     - artifact + issue comment

5. **Fallback rule**
   - if writable repo is unavailable, say what counts as a successful fallback
   - never make the agent infer this

6. **Canonical stage result contract**
   - if this issue is part of a controller-managed workflow, require the final comment to include a fenced JSON `STAGE_RESULT` block
   - list the required stage-specific fields explicitly

7. **Blocker reporting format**
   - require exact command, remote, path, and stderr when reporting git/repo failures
   - `git push failed` alone is not an acceptable blocker report

### Dispatch checklist

Before assigning or posting a corrective follow-up comment, confirm:
- [ ] target repo is named explicitly
- [ ] writable checkout path is explicit, or absence is explicit
- [ ] branch name is explicit
- [ ] push destination is explicit when push is expected
- [ ] success artifact is explicit
- [ ] fallback behavior is explicit
- [ ] canonical `STAGE_RESULT` requirement is explicit for controller-managed stages
- [ ] blocker reporting expectations are explicit

If any box is unchecked, fix the contract before dispatch.

### Canonical wording patterns

#### Pattern A: Repo-backed coding task

Use when the agent must modify a real repository and push changes.

```text
Target repo: `<repo-url>`.
Writable checkout: `<absolute-path>`.
Work on branch: `<branch-name>`.
Push target: `origin <branch-name>`.
Expected result: commit changes, push branch, and leave a comment with commit SHA and PR link or PR creation URL.
If blocked, report the exact failing command, current repo path, `git remote -v`, and stderr.
```

#### Pattern B: Repo may be missing, fallback allowed

Use when the environment may not expose the target repo.

```text
Goal: produce content suitable for `<target>`.
If a writable checkout of `<repo>` is available, write the result there.
If no writable checkout is exposed, fallback to `<artifact path>` plus an issue comment containing either the full deliverable or a precise path to it.
Do not report missing repo exposure as a git push failure.
If blocked by something else, include the exact command, path, and stderr.
```

#### Pattern C: Corrective follow-up comment

Use when an already-running Multica task drifted because the original contract was incomplete.

```text
This repo/push contract was incomplete in the earlier instruction; here is the authoritative contract:
- target repo: `<repo>`
- writable checkout: `<path>` or `not guaranteed`
- branch: `<branch>`
- required output: `<delivery mode>`
- fallback if repo unavailable: `<fallback>`
Please stop relying on guessed repo wiring. If blocked, paste the exact command, remote, and stderr.
```

### Nested clone / wrong-origin rules

When you discover a repo cloned from another local checkout instead of directly from the canonical remote:
- treat it as suspicious until verified
- do not tell the agent to keep pushing through a nested local-origin setup unless that topology is intentional and explicitly approved
- prefer one of these:
  - use the known good writable checkout
  - create a fresh clone whose `origin` points directly to the canonical remote
- if the agent already worked in the wrong clone, tell it exactly how to transfer or reapply the changes

### Delivery mode rules

A Multica task is only `done` when it matches the declared delivery mode.
- if delivery mode is `commit + push`, artifact-only is not done
- if delivery mode is `artifact + issue comment`, lack of repo access is not a failure
- if delivery mode is ambiguous, fix the instruction before judging the agent
- if the stage is controller-managed, build completion must include delivery evidence inside canonical `STAGE_RESULT`

### Canonical stage result rules

For controller-managed workflows:
- each stage issue must require a final fenced JSON `STAGE_RESULT`
- rara should specify the required stage fields up front
- free-form prose may explain the result, but the JSON block is the machine-checkable source of truth
- handoff authority stays with the controller, not with the agent that authored the artifact

### Minimal dispatch template

```text
Task: <what to produce>
Target repo: <repo-url or none>
Writable checkout: <absolute path or not guaranteed>
Branch: <branch name or n/a>
Delivery mode: <commit+push | commit+push+PR | artifact | artifact+comment>
Fallback: <exact fallback behavior>
Blocker report must include: exact command, cwd/repo path, remote, stderr
```

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
- if write/push/publication is involved, include the full dispatch contract from Step 3

Avoid vague instructions like:
- `continue`
- `please fix this`
- `do more`

Also avoid:
- `please commit the changes` without naming the repo and branch
- assuming the agent sees the same checkout you see
- assuming `origin` is correct without saying so
- treating missing writable repo exposure as agent failure when fallback was not defined
- mixing `must push` and `artifact is fine` without a priority order

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

If the task needs durable polling / backoff / scheduled follow-up mechanics,
switch to `multica-polling` after dispatch rather than bloating this skill with
poll-loop details.

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
- whether the result matched the declared delivery mode

Important:
- task completion does not guarantee issue status was updated correctly
- issue status alone is not enough evidence that the work is done
- rara should verify artifact quality and task-run outcome together
- environment exposure failure and actual git failure are different classes of blocker; do not merge them into one vague conclusion

For larger tasks, record a simple verdict:
- `GO`
- `NO_GO`

If the result is insufficient:
- leave a precise follow-up comment and mention the agent, or
- create a focused child issue for the next round, or
- reassign intentionally if a different agent should take over

Do not use vague `please continue` retries.

## 8. Decide: ship, follow up, split, or reassign ⛔

After verification, make the next move deliberately.

### Ship when
- requested behavior exists
- acceptance criteria are met
- tests / lint / build / CI are acceptable
- no meaningful scope gap remains
- the declared delivery mode has actually been satisfied

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

### Repo contract is incomplete
- stop and repair the contract before judging the agent
- post an authoritative corrective comment if the task is already running
- specify repo, checkout, branch, delivery mode, fallback, and blocker-report requirements explicitly

### Task is too large
- split into parent/child issues
- sequence the children explicitly
- reduce each round to one coherent deliverable

### One agent is blocked
- inspect task runs, messages, comments, and blockers
- decide whether to comment, clarify, split, or reassign
- require exact command / path / remote / stderr for git-related blockers

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
- accept vague blocker reports like `push didn't work`
- rely on guessed repo wiring

## Pre-delivery checks

Before declaring the work shipped, verify:
- [ ] the chosen workflow was correct: Multica team vs local direct work
- [ ] every issue has a clear goal, deliverables, constraints, and acceptance criteria
- [ ] any repo / branch / delivery / fallback contract is explicit
- [ ] issue split vs single-issue decision is still sensible
- [ ] assignment history still reflects real ownership
- [ ] task runs and artifacts support the claimed outcome
- [ ] tests / build / lint / CI state are acceptable for the task
- [ ] follow-up work, if any, is tracked explicitly rather than implied
- [ ] parent closure rule is satisfied
- [ ] the user update reflects actual verified state, not optimistic status labels
