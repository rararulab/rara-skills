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
- for the concrete team protocol and execution model → `references/team-protocol-v0.1.md`
- for default team-shape selection → `references/team-formation-playbook.md`
- for concrete issue / comment structures → `references/issue-templates.md`
- for reusable team dispatch examples → `references/dispatch-examples.md`
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

Protocol authority:
- `references/team-protocol-v0.1.md` is the authoritative team model for role boundaries, handoff rules, convergence, gates, and closure
- `references/issue-templates.md` should be used to encode that protocol into actual parent issues, child issues, and follow-up comments
- if a dispatch plan conflicts with the protocol, fix the issue contract before assigning work

## Team-native operating model

Multica should be run as a **team coordination system**, not just a one-issue
one-agent dispatcher.

Use this mental model:
- **rara** is the team lead
- **parent issue** is the team board / shared objective
- **child issue** is a teammate-owned lane
- **controller comment** is shared memory with authority
- **canonical artifact** is the durable handoff medium between teammates

This means:
- a child issue is not just a task ticket; it defines ownership for one lane of work
- a follow-up comment is continuation inside that lane, not silent scope drift
- reassignment is ownership transfer, not a routine retry button
- sibling lanes may coordinate, but only through durable comments or canonical artifacts
- downstream teammates should consume validated artifacts, not guess from prose or status labels

## Team shapes

Choose the simplest shape that fits the work.

### 1) Single-agent
Use when:
- one agent can complete the change in one coherent round
- the task is narrow, low-conflict, and easy to verify
- adding a team would mostly add coordination overhead

### 2) Staged team
Use when:
- planning, build, and review should be separated explicitly
- machine-checkable handoff matters
- the work benefits from `plan -> build -> review`

Typical structure:
- parent issue
- plan issue
- build issue
- review issue

### 3) Parallel lanes
Use when:
- workstreams are genuinely separable
- teammates can operate mostly independently
- frontend / backend / tests / docs have clean boundaries
- competing hypotheses can be investigated in parallel

Typical structure:
- parent issue as team board
- multiple child issues owned by different teammates or roles
- convergence step before parent closure

### 4) Hybrid
Use when:
- some early work should happen in parallel
- later work must converge into a staged build / review flow

Typical examples:
- parallel investigation, then single build lane
- backend/frontend lanes, then unified review lane

## Team size policy

Default to **one agent**.

Scale to **2–3 teammates** only when parallel work is clearly beneficial.

Require an explicit reason before going beyond 3 active lanes. Coordination cost
rises quickly and should not be hidden inside optimistic dispatch.

Good reasons to increase team size:
- workstreams are independent
- wall-clock time should be reduced through parallelism
- ownership boundaries are clear
- deliverables can be verified independently before convergence

Bad reasons to increase team size:
- the task feels important
- the lead is impatient
- the scope is still fuzzy
- multiple agents would touch the same files anyway

## Lane ownership rules

Every child issue should make lane ownership explicit.

A teammate-owned lane should answer:
- what this lane owns
- what it must not modify without approval
- which upstream artifacts it may trust
- which downstream teammate or controller will consume its output
- what artifact or comment contract it must produce before handoff

If lane boundaries are unclear, do not parallelize build work yet.
Research or split the problem first.

## Durable teammate coordination

Teammates may coordinate across lanes, but coordination must be durable and auditable.

Allowed coordination media:
- issue comments
- parent issue summaries
- canonical `STAGE_RESULT` artifacts
- controller-authored handoff notes

Do not treat these as authoritative on their own:
- free-form confidence in prose
- issue status alone
- an agent's own recommendation for who should act next
- implied knowledge from a sibling lane that was never written down

Rule:
- teammates can influence other lanes only through durable evidence
- handoff authority belongs to rara and, when enabled, the workflow controller
- downstream lanes should trust validated artifacts over informal summaries

## Conflict-avoidance rules

Parallel work is good only when the boundaries are real.

Do not run parallel build lanes when:
- two lanes are expected to edit the same file
- the same module or function ownership is still ambiguous
- one lane's acceptance criteria depend on the unfinished internals of another lane
- all lanes would need the same branch and merge path with no explicit strategy

Parallel work is usually safe when:
- research lanes inspect different hypotheses
- frontend and backend are connected by a clear API contract
- implementation and docs are separable
- tests or verification can proceed against a stable implementation contract

If unsure, start with research or planning lanes first, then decide whether build
should remain parallel or converge into one lane.

## Monitor-and-steer rule

Lead behavior matters.

rara should not just dispatch and wait for luck. rara should:
- watch whether each assigned lane actually started
- compare sibling lane findings for contradiction or overlap
- detect conflict risk before multiple lanes drift into the same file set
- decide when evidence is strong enough to converge
- step in when an agent is blocked, overreaches, or produces weak artifacts

Monitor and steer by looking at:
- task runs and task messages
- issue comments and artifacts
- controller decisions
- parent-level objective status

Do not monitor only by issue status labels.

## Convergence rules

Parallel work requires an explicit convergence step.

Before closing the parent issue, rara should ensure:
- each required lane delivered its declared artifact
- sibling outputs are mutually compatible
- integration risk has been reviewed explicitly
- one lane or review issue owns the final synthesis
- the parent objective, not just the child objectives, has been verified

A parent issue is complete only when the integrated result is complete.

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
- whether the work is best modeled as single-agent, staged-team, parallel-lanes, or hybrid
- whether workstreams are genuinely separable
- whether any likely file / branch / ownership conflicts already exist

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

### Decide the team shape

If you stay in Multica, choose one of these deliberately:
- **single-agent** for one coherent deliverable
- **staged-team** for `plan -> build -> review`
- **parallel-lanes** for separable workstreams
- **hybrid** when parallel exploration should converge into staged delivery

Use `references/team-formation-playbook.md` as the default selector.

If the work shape is not obvious, choose the smaller / safer shape first.

## 3. Write the work contract ⛔

For medium+ tasks, write down:
- product context
- deliverables
- constraints
- out of scope
- acceptance criteria
- team shape
- lane ownership when there is more than one lane
- convergence owner when there is more than one lane
- gate expectations for any build / review / integration lane

Before dispatch, enforce this **protocol-first preflight** in order:

### Protocol-first preflight
- [ ] choose the team shape explicitly
- [ ] verify the chosen shape is justified in the parent issue
- [ ] verify every active lane has an explicit boundary
- [ ] verify every active lane says what it must not modify
- [ ] verify upstream inputs and downstream consumers are named for every active lane
- [ ] verify parallel build work is safe, or reduce to one build owner
- [ ] verify a convergence owner exists for multi-lane work
- [ ] verify required gate expectations are written into the relevant child issues
- [ ] verify completion artifacts are defined before assignment
- [ ] only then assign agents

If any preflight item fails, fix the issue contract before dispatch.

### Single-agent contract
At minimum include:
- one clear goal
- acceptance criteria
- constraints
- expected deliverables

### Team contract
For staged-team, parallel-lanes, or hybrid, the parent issue must encode:
- why this team shape fits
- active lanes and their roles
- shared constraints
- convergence plan
- closure conditions at the parent level

For every child issue, encode:
- stage
- lane ownership
- out-of-scope boundary
- downstream consumer
- gate expectation
- completion contract
- risks / sequencing notes
- chosen team shape when the work spans multiple lanes
- convergence expectations when the work will rejoin later

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

8. **Lane contract when applicable**
   - state the lane boundary explicitly
   - state what this lane must not absorb from sibling lanes
   - state which upstream artifact or parent note this lane should trust
   - state what downstream artifact this lane must leave behind

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
- [ ] team shape is explicit when work spans multiple lanes
- [ ] lane boundary is explicit when more than one teammate is involved
- [ ] convergence expectation is explicit when parallel lanes will rejoin later

If any box is unchecked, fix the contract before dispatch.

### Canonical wording patterns

#### Pattern A: Repo-backed coding task

Use when the agent must modify a real repository and push changes.

```text
Task: <what to produce>
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

Choose the smallest structure that can carry the contract.

### Single-agent
- one issue is usually enough
- use the child issue template structure directly if there is no parent board

### Staged-team
- create a parent issue
- create child issues for `plan`, `build`, and `review`
- if final synthesis is substantial, add an explicit `integration` lane or make review own convergence clearly

### Parallel-lanes
- create a parent issue as the team board
- create one child issue per real lane
- do not create parallel build lanes until conflict boundaries are explicit

### Hybrid
- create a parent issue
- create early parallel lanes for research or split work
- create an explicit downstream build / review / integration lane for convergence

Issue-tree rule:
- parent issue is the authoritative objective and convergence record
- child issue is the authoritative lane contract
- if the parent lacks team shape, shared constraints, or convergence plan, it is not ready

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
- multiple teammates need different lanes
- parallel work requires a parent board and later convergence

### Small task shape
Create one issue with:
- clear title
- concrete body
- acceptance criteria
- correct assignee target

### Larger task shape
Use an issue tree:
- create one **parent issue** for the overall objective
- create **child issues** for concrete sub-tasks or lanes
- set `parent_issue_id` on each child
- keep each child narrow enough for a single agent round
- state lane ownership in each child when more than one teammate is involved
- decide up front whether the tree is staged, parallel, or hybrid

### Parent-as-team-board rule
When using a parent issue, treat it as the team board.
It should make the following visible:
- the overall goal
- the active lanes or stages
- the intended ownership model
- the convergence plan
- the parent-level acceptance criteria

Use parent/child issues instead of hiding decomposition in comments.

## 5. Assign only when the issue body is ready ⛔

Assignment is dispatch.

Ready means:
- the issue has a clear goal
- acceptance criteria are written
- out-of-scope boundaries are written when needed
- lane ownership is explicit when needed
- completion artifacts are defined
- convergence ownership is defined for multi-lane work
- gate expectations are written for build / review / integration lanes

Do not assign work that still depends on implied boundaries or oral memory.

If the work is controller-managed, confirm the canonical `STAGE_RESULT` contract is present before assignment.

Core rule:
- assigning an issue to a ready agent is the main task-dispatch path
- changing assignee can cancel existing work and enqueue work for the new agent

So rara should:
- assign the right issue to the right agent
- avoid noisy reassignment unless it is intentional
- use one issue per coherent deliverable or lane
- leave a handoff note when ownership changes

If the work is a narrow continuation on an existing issue, rara may also:
- add a comment
- `@mention` an agent
- use the comment as the follow-up instruction

Use comment-driven follow-up for narrow continuation work.
Use new child issues for substantial new scope.

### Assignment in team mode

When multiple teammates are involved:
- do not assign parallel lanes until boundaries are explicit
- do not assign overlapping build lanes just to go faster
- treat reassignment as ownership transfer and explain what evidence the new owner should trust
- prefer controller-authored or rara-authored handoff notes over free-form recommendations from the previous agent

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
- if the issue is one lane in a larger team, state what it owns and what it must not absorb
- state which upstream artifact or controller note should be treated as authoritative input
- state what artifact or summary a downstream lane should be able to consume without guessing

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
- implicitly letting a lane absorb sibling work because the boundary was never written down

## 6. Monitor active execution

Dispatch is the start of lead work, not the end.

Monitor by checking:
- whether each assigned lane actually started
- whether task runs show meaningful progress
- whether issue comments and artifacts match the declared lane boundary
- whether sibling lanes are drifting into overlap or contradiction
- whether required completion artifacts are appearing

Steer actively when:
- no task starts after assignment
- a worker is blocked or looping
- a lane produces weak or missing artifacts
- a sibling lane crosses its boundary
- a convergence decision is needed

For multi-lane work, keep asking:
- is parallelism still helping?
- do we have enough evidence to converge?
- should one owner take over final synthesis now?

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
- sibling lanes drifting into overlapping scope
- contradictory findings between sibling lanes
- a parent objective that still lacks convergence even though some children are done

If signals conflict, trust artifacts and run history over superficial status labels.

### Urgent follow-up: when the user says “push Multica” or “get the PR out”

Do not treat this phrasing as proof that no PR exists yet.

When the user refers to an already-running Multica item in a vague, urgent, or
shorthand way, use this order:

1. locate the real issue first
2. verify whether a PR already exists
3. push the actually-blocked stage

Preferred lookup flow:
- start with `multica issue search '<keyword>' --output json`
- try the task nickname, repo name, issue shorthand, or stage term
- inspect matched titles, identifiers, snippets, and comment hits
- only fall back to broader inspection after targeted search fails

Do not start with broad grep-style hunting when `multica issue search` can narrow
it down first.

After locating the issue, explicitly check whether comments or linked artifacts
already contain a canonical GitHub PR URL.

If a PR already exists:
- do not push PR creation again
- treat the blocker as stage/status alignment, verification, review, or handoff
- leave a follow-up comment that names the real next action

If no PR exists but the build/review pipeline already exists:
- identify which issue is actually behind
- push the blocked stage instead of issuing a generic “make the PR” retry

Only ask the user for more information after reasonable `multica issue search`
queries fail to identify the target.

## 7. Verify artifacts and task outcome ⚠️

Verification is a gate.

Check all of these deliberately:
- the requested behavior exists
- acceptance criteria are met
- the lane delivered the artifact it promised
- delivery evidence matches the contract
- gate expectations were satisfied for that lane
- downstream consumers have enough durable evidence to proceed

For multi-lane work also verify:
- sibling outputs are compatible
- integration risk has been reviewed explicitly
- a convergence note or integration artifact exists before parent closure

If evidence is weak, incomplete, or contradictory, do not treat the work as done yet.

After a Multica round finishes, review:
- correctness
- completeness
- architecture fit
- test coverage
- security / safety
- build / lint / CI status
- issue status vs actual task outcome
- whether the result matched the declared delivery mode
- whether the result respected the declared lane boundary
- whether sibling outputs are ready for convergence

Important:
- task completion does not guarantee issue status was updated correctly
- issue status alone is not enough evidence that the work is done
- rara should verify artifact quality and task-run outcome together
- environment exposure failure and actual git failure are different classes of blocker; do not merge them into one vague conclusion
- in team mode, local success in one lane does not prove parent success

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
- any required convergence across lanes is complete

### Follow up in the same issue when
- the delta is narrow
- ownership should stay the same
- the next round is a correction, clarification, or review fix

### Split into a new child issue when
- new scope emerged
- the repair is substantial
- tracking, ownership, or sequencing should be separate
- a sibling lane should own the new work instead of silently inheriting it

### Reassign when
- specialization mismatch is clear
- one agent is repeatedly blocked
- the scope changed and genuinely needs different expertise
- ownership must transfer because a new lane should take over cleanly

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
- if the work used parallel lanes, confirm convergence explicitly before parent closure

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
- parent issues act as team boards when work spans multiple lanes
- child issues act as teammate-owned lanes when ownership should be explicit
- teammate coordination must be durable and auditable
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
- if using team mode, define lane boundaries instead of letting multiple agents improvise on the same surface

### One agent is blocked
- inspect task runs, messages, comments, and blockers
- decide whether to comment, clarify, split, or reassign
- require exact command / path / remote / stderr for git-related blockers

### Verification fails twice
- stop repeating the same instruction
- narrow the task
- improve the work contract
- escalate to the user with the blocker and next best option

### Sibling lanes conflict
- stop pretending both lanes can continue safely in parallel
- declare the authoritative boundary explicitly
- re-scope or converge the work before further build dispatch
- preserve the audit trail instead of rewriting history informally

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
- run parallel lanes without explicit boundaries
- let sibling lanes communicate only through implication or memory
- let an agent self-authorize the next owner's handoff

## Pre-delivery checks

Before declaring the work shipped, verify:
- [ ] the chosen workflow was correct: Multica team vs local direct work
- [ ] the chosen team shape was correct: single-agent, staged-team, parallel-lanes, or hybrid
- [ ] every issue has a clear goal, deliverables, constraints, and acceptance criteria
- [ ] any repo / branch / delivery / fallback contract is explicit
- [ ] issue split vs single-issue decision is still sensible
- [ ] lane boundaries are explicit anywhere multiple teammates are involved
- [ ] assignment history still reflects real ownership
- [ ] task runs and artifacts support the claimed outcome
- [ ] tests / build / lint / CI state are acceptable for the task
- [ ] follow-up work, if any, is tracked explicitly rather than implied
- [ ] parent closure rule is satisfied
- [ ] convergence was completed explicitly before any parent close in team mode
- [ ] the user update reflects actual verified state, not optimistic status labels
