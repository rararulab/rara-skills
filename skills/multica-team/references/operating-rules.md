# Operating rules

These rules make `multica-team` predictable and easier to run consistently.

## 1) Choose the unit of work carefully

Use **one issue** when:
- the change is coherent
- one agent can reasonably finish it in one focused round
- review is straightforward

Use **parent + child issues** when:
- frontend and backend are separable
- implementation and docs are distinct workstreams
- rollout / migration / cleanup should be tracked independently
- one prompt would be too broad to verify reliably
- stage ownership should be explicit across `plan -> build -> review`

Rule of thumb:
- if success cannot be described with 2–4 concrete acceptance checks, split it

## 2) Prefer issue creation over vague continuation

Create a **new child issue** when:
- scope changed materially
- a new deliverable emerged
- ownership should be tracked separately
- you want a clean audit trail

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

## 3) Assignment is dispatch

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

Bad reasons to reassign:
- impatience without diagnosis
- vague hope that another agent will guess better
- free-form agent suggestion without controller validation

## 4) Monitor using both push and pull

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

If signals conflict, trust artifacts and run history over superficial status labels.

## 5) Verification is a real gate

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
- canonical `STAGE_RESULT` exists and validates
- build delivery mode actually matches the dispatch contract

For larger tasks, record a simple verdict:
- `GO`
- `NO_GO`

## 6) Parent issue closure rule

A parent issue can close only when:
- required child issues are complete
- the integrated outcome matches the parent goal
- verification passed at the whole-task level
- the controller state is `done` or intentionally superseded by a human decision

Do not use parent closure as a convenience marker.

## 7) Failure handling

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

### After two failed rounds overall
- surface the trade-off to the user
- explain the blocker plainly
- propose the next best path

## 8) Practical heuristics

### When to split immediately
Split before dispatch if the request includes two or more of these:
- different subsystems
- user-facing changes plus internal refactor
- implementation plus migration
- implementation plus documentation / rollout prep
- different natural owners for plan/build/review

### When to stay in one issue
Keep one issue if the task is roughly:
- a targeted bug fix
- a small feature with one obvious surface area
- a low-risk refactor with clear boundaries

## 9) Quality of instruction matters more than retry count

If an agent misses the mark, improve one of these before retrying:
- scope boundary
- acceptance criteria
- out-of-scope section
- context facts
- follow-up precision
- canonical artifact schema instructions
- delivery-mode contract clarity

Do not compensate for weak instructions by repeatedly saying the same thing louder.

## 10) Controller-owned handoff principle

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
