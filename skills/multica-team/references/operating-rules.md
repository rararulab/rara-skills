# Operating rules

These rules make `multica-team` predictable and easier to run consistently.

## 1) Form the smallest team that can win

Use **one issue / one agent** when:
- the change is coherent
- one agent can reasonably finish it in one focused round
- review is straightforward
- the task is mostly sequential

Use a **staged team** when:
- planning, build, and review should be separated clearly
- stage ownership should be explicit across `plan -> build -> review`
- machine-checkable handoff matters

Use **parallel lanes** when:
- frontend and backend are separable
- implementation and docs are distinct workstreams
- rollout / migration / cleanup should be tracked independently
- competing hypotheses can be tested in parallel
- one prompt would be too broad to verify reliably

Rule of thumb:
- if success cannot be described with 2–4 concrete acceptance checks, split it
- if two lanes would probably touch the same files, do not parallelize build yet

## 2) Make lane boundaries explicit

Whenever more than one teammate is active, each child issue should state:
- what the lane owns
- what it must not modify
- what upstream artifact it should trust
- what downstream artifact it must leave behind

If those four points are missing, the lane boundary is not ready.
Do not dispatch parallel build work on an unclear boundary.

## 3) Prefer issue creation over vague continuation

Create a **new child issue** when:
- scope changed materially
- a new deliverable emerged
- ownership should be tracked separately
- you want a clean audit trail
- a sibling lane should own the new work instead of inheriting it silently

Use **comment + @mention** when:
- the issue already exists
- the next round is narrow
- the change is a correction, clarification, or review follow-up

Avoid comments like:
- "continue"
- "please fix this"
- "do more"

Always restate the concrete delta.
If the stage is controller-managed, always restate which canonical artifact fields must be corrected.

## 4) Assignment is dispatch

In Multica, assignment is the main execution trigger.

Therefore:
- assign only when the issue body is ready
- do not reassign casually
- do not bundle unrelated deliverables into one assignee round
- if ownership changes, leave a handoff comment
- when the workflow controller approves a transition, use its authoritative handoff note as the source of truth

Good reasons to reassign:
- agent specialization mismatch
- repeated blockage
- change in scope needing different expertise
- a lane boundary changed and ownership should move cleanly

Bad reasons to reassign:
- impatience without diagnosis
- vague hope that another agent will guess better
- free-form agent suggestion without controller validation

## 5) Teammates coordinate through durable evidence

Allowed coordination media:
- issue comments
- parent issue summaries
- canonical `STAGE_RESULT`
- controller-authored handoff notes

Do not treat these as sufficient authority by themselves:
- issue status alone
- free-form prose alone
- an agent's self-declared next owner
- assumptions about what a sibling lane probably discovered

Rule:
- teammates may influence other lanes only through durable, reviewable outputs
- the controller or rara decides whether a handoff is authoritative
- downstream lanes should trust validated artifacts over memory or implication

## 6) Avoid parallel file conflicts

Do not run parallel build lanes when:
- two lanes are expected to edit the same file
- one lane's acceptance criteria depend on another lane's unfinished internals
- the same branch must absorb multiple unfinished edits with no explicit strategy
- ownership of a shared module is still ambiguous

Parallel work is usually safe when:
- research lanes inspect different hypotheses
- frontend and backend are connected by a clear API contract
- implementation and docs are separable
- tests or verification can proceed against a stable implementation contract

If conflict risk is unclear, converge first or keep one build owner.

## 7) Monitor using both push and pull

Preferred monitoring pattern:
- use `/ws` for live events when available
- confirm critical state with REST
- inspect `active-task`, `task-runs`, and task messages for detail

Watch for:
- no task created after assignment
- task starts but produces no progress
- repeated failure or cancellation
- issue status claiming done while evidence is incomplete
- stage completion comment missing a canonical `STAGE_RESULT`
- sibling lanes drifting into overlapping scope
- contradictory findings across sibling lanes

If signals conflict, trust artifacts and run history over superficial status labels.

## 8) Verification is a real gate

Never close work only because:
- the agent said it is done
- the issue status says done
- one child issue succeeded
- a comment sounds like a handoff

Close only after checking:
- requested behavior exists
- acceptance criteria are actually met
- tests / lint / build status are acceptable
- no obvious scope gaps remain
- canonical `STAGE_RESULT` exists and validates when required
- build delivery mode actually matches the dispatch contract
- any required lane convergence is complete

For repo-backed work, treat the delivery chain as a hard gate:
- commit exists on the declared branch
- PR exists when the delivery mode requires repo-backed review
- verification proof is recorded durably
- the issue or parent contains a durable summary
- review recorded an explicit verdict before closure

For larger tasks, record a simple verdict:
- `GO`
- `NO_GO`

## 9) Convergence is a first-class step

When work uses parallel lanes:
- define how sibling outputs will rejoin before dispatch
- decide who owns final synthesis
- resolve contradictions explicitly
- do not infer parent completion from child completion

Good convergence owners:
- rara
- a dedicated review lane
- a controller-managed handoff step

Bad convergence pattern:
- letting whichever child finished last imply the parent is done

## 10) Parent issue closure rule

A parent issue can close only when:
- required child issues are complete
- the integrated outcome matches the parent goal
- verification passed at the whole-task level
- the controller state is `done` or intentionally superseded by a human decision
- any required convergence step has completed explicitly

If a required child becomes `blocked`:
- do not close the parent
- keep the parent open only when a specific recovery lane or follow-up round is already defined
- otherwise move the parent to `blocked`

Do not use parent closure as a convenience marker.

## 11) Failure handling

### If a task run fails once
- read the failure details
- identify whether the problem is ambiguity, scope, environment, or implementation quality
- respond with a specific follow-up

### If a task run fails twice
- narrow the task
- split it if needed
- tighten acceptance criteria
- consider reassignment only with a clear reason

### If canonical artifact validation fails
- list exact missing or invalid fields
- request a corrected `STAGE_RESULT`
- do not advance ownership yet

### If work is quality blocked
- treat it as a failed review or validation gate, not as an infrastructure outage
- post the exact defect list or missing evidence
- route a focused recovery round to the lane that can fix it

### If work is environment blocked
- repair the checkout, repo capability, credentials, toolchain, or declared repo contract first
- use the declared fallback delivery mode if one exists
- if no compliant recovery path exists, record the exact command, path, remote, and stderr, then move the affected issue and parent to `blocked`

### If sibling lanes conflict
- stop parallel drift
- restate the authoritative boundary
- decide whether to converge, re-scope, or pick one owner

### After two failed rounds overall
- surface the trade-off to the user
- explain the blocker plainly
- propose the next best path

## 12) Practical heuristics

### When to split immediately
Split before dispatch if the request includes two or more of these:
- different subsystems
- user-facing changes plus internal refactor
- implementation plus migration
- implementation plus documentation / rollout prep
- different natural owners for plan/build/review
- competing plausible root causes

### When to stay in one issue
Keep one issue if the task is roughly:
- a targeted bug fix
- a small feature with one obvious surface area
- a low-risk refactor with clear boundaries

## 13) Quality of instruction matters more than retry count

If an agent misses the mark, improve one of these before retrying:
- scope boundary
- lane boundary
- acceptance criteria
- out-of-scope section
- context facts
- follow-up precision
- canonical artifact schema instructions
- delivery-mode contract clarity

Do not compensate for weak instructions by repeatedly saying the same thing louder.

## 14) Controller-owned handoff principle

Once a workflow is controller-managed:
- agents submit evidence
- the controller validates evidence
- rara posts the authoritative handoff note
- only then should assignee changes happen

Do not let stage progression be inferred from:
- issue status alone
- free-form prose alone
- an agent's own recommendation alone

The controller is the stage authority.
