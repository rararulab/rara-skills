# Multica Team Protocol v0.1

This document turns the `multica-team` operating model into a concrete protocol that can be executed on top of Multica's existing multi-agent runtime.

Core decision:
- Multica is the runtime substrate.
- This protocol defines how a team should form, coordinate, hand off work, and close work.

This protocol assumes:
- issues are the primary orchestration unit
- agents are the execution unit
- comments and artifacts are the durable coordination medium
- rara is the team lead unless explicitly delegated otherwise

---

## 1. Scope

This protocol is for coding work routed through Multica when the user wants rara to lead delivery through a multi-agent workflow.

It covers:
- team formation
- role assignment
- task decomposition
- lane ownership
- dispatch
- monitoring
- convergence
- quality gates
- closure

It does not redefine:
- Multica agent runtime semantics
- transport or websocket implementation details
- repo-specific CI policy

---

## 2. Runtime model

### 2.1 Multica responsibilities

Multica provides:
- agent instances
- assignment and execution triggers
- task run tracking
- task messages and comments
- issue storage
- event streams
- assignee routing

### 2.2 Team protocol responsibilities

This protocol defines:
- who owns what
- when to split work
- when to parallelize
- what each lane must publish
- how one lane hands off to another
- when a parent objective is complete

---

## 3. Core objects

### 3.1 Team

A team is a temporary delivery group formed around one parent issue.

Fields:
- `team_id`: parent issue id
- `lead`: rara
- `shape`: `single-agent | staged-team | parallel-lanes | hybrid`
- `objective`: single-sentence target outcome
- `members`: active teammate roles or assigned agents
- `constraints`: repo, branch, quality, scope, delivery constraints

### 3.2 Lane

A lane is a child issue with explicit ownership.

Fields:
- `issue_id`
- `role`
- `owner`
- `boundary`
- `upstream_inputs`
- `downstream_consumers`
- `must_not_modify`
- `acceptance_criteria`
- `completion_artifact`

### 3.3 Artifact

An artifact is the durable output of a lane.

Allowed forms:
- code diff or commit
- PR URL
- canonical `STAGE_RESULT`
- issue comment with structured evidence
- docs / report / migration note
- test output summary

Artifacts are authoritative when they are:
- durable
- reviewable
- attributable to a lane
- sufficient for a downstream lane to act without guessing

### 3.4 Gate

A gate is a required validation step before progression.

Gate types:
- `plan_gate`
- `build_gate`
- `review_gate`
- `test_gate`
- `integration_gate`
- `closure_gate`

---

## 4. Team shapes

### 4.1 Single-agent

Use when:
- one agent can finish coherently
- the work is narrow
- the file surface is small
- verification is straightforward

Structure:
- one parent issue or one child issue
- one owner
- one completion artifact

### 4.2 Staged-team

Use when:
- planning, build, and review should be separated
- stage handoff should be machine-checkable
- delivery quality matters more than raw speed

Structure:
- parent issue
- plan lane
- build lane
- review lane

Required handoff chain:
- `plan -> build -> review`

### 4.3 Parallel-lanes

Use when:
- workstreams are genuinely separable
- different lanes can act independently
- boundaries are explicit and low-conflict

Common patterns:
- frontend / backend
- implementation / docs
- migration / cleanup
- competing research hypotheses

### 4.4 Hybrid

Use when:
- early work should happen in parallel
- later work should converge into a staged flow

Common patterns:
- parallel investigation -> single build -> review
- frontend/backend build lanes -> integration review lane

---

## 5. Role model

Roles describe expected behavior and lane intent. They can be backed by skills, prompts, tool policies, or model policies.

Standard roles:
- `planner`
- `researcher`
- `implementer`
- `reviewer`
- `tester`
- `integrator`
- `frontend`
- `backend`
- `docs`
- `migration`

### 5.1 Lead role

The lead:
- chooses team shape
- creates the parent objective
- defines lane boundaries
- assigns or reassigns ownership
- compares sibling outputs
- resolves overlap and contradiction
- decides convergence
- decides final completion

### 5.2 Worker role

A worker:
- operates only within its lane boundary
- publishes durable evidence
- does not silently absorb sibling scope
- hands off using the defined artifact contract
- surfaces blockers with concrete evidence

---

## 6. Lane contract

Every child issue must define these fields clearly.

### 6.1 Required lane fields

- `goal`
- `stage`
- `role`
- `lane boundary`
- `must not modify`
- `upstream inputs`
- `downstream consumers`
- `required work`
- `acceptance criteria`
- `expected deliverables`
- `completion contract`

### 6.2 Lane boundary rule

A lane is valid only when all four are explicit:
- what it owns
- what it must not modify
- what it can trust from upstream
- what it must leave for downstream

If any of these are unclear, do not dispatch parallel build work.

### 6.3 No silent scope expansion

A worker may discover adjacent work.

The worker should then:
- record the finding durably
- describe impact concretely
- request a follow-up or sibling lane if needed

The worker should not:
- silently absorb unrelated work
- claim ownership over sibling scope
- modify forbidden surfaces without approval

---

## 7. Dispatch protocol

### 7.1 Dispatch rule

Assignment is dispatch.

Only assign when:
- the issue body is ready
- acceptance criteria are present
- the lane boundary is explicit
- the completion contract is present

### 7.2 Reassignment rule

Reassign only when one of these is true:
- specialization mismatch
- repeated blockage
- lane boundary changed
- a different role is now the correct owner

Every reassignment should leave a handoff note with:
- why ownership changed
- what remains
- what evidence is authoritative

### 7.3 Follow-up rule

Use comment follow-up when:
- the issue already exists
- the delta is narrow
- ownership stays the same

Create a new child issue when:
- ownership should be distinct
- scope expanded materially
- a new deliverable emerged
- coordination needs a clean audit trail

---

## 8. Coordination protocol

### 8.1 Authoritative media

Team coordination should use:
- issue comments
- parent summaries
- canonical `STAGE_RESULT`
- controller-authored handoff notes
- attached artifacts

### 8.2 Non-authoritative signals

These signals are useful, but insufficient on their own:
- issue status labels
- free-form prose without structure
- self-declared completion
- a worker's guess about next owner

### 8.3 Cross-lane communication rule

A lane may influence another lane only through durable evidence.

That means:
- blockers affecting a sibling must be published
- discovered contracts must be written down
- contradictions must be visible in the parent issue or an authoritative note

---

## 9. Monitoring protocol

The lead should monitor using both push and pull.

### 9.1 Primary sources

- websocket events when available
- active task view
- task runs
- task messages
- issue comments
- artifacts

### 9.2 Watch conditions

The lead should actively detect:
- assignment with no execution start
- execution with no meaningful progress
- repeated run failure
- done-like status with weak evidence
- missing completion artifact
- sibling overlap risk
- contradiction between lanes

### 9.3 Steering actions

The lead may respond by:
- clarifying scope
- tightening acceptance criteria
- narrowing the lane
- splitting a new lane
- reassigning ownership
- forcing convergence
- escalating to the user when blocked by ambiguity or external dependency

---

## 10. Handoff protocol

### 10.1 Handoff requirement

A lane is handoff-ready when:
- required work is complete
- acceptance criteria are satisfied or explicitly marked blocked
- the completion artifact exists
- the downstream consumer can act without guessing

### 10.2 Canonical completion artifact

Controller-managed lanes should publish `## STAGE_RESULT` with one fenced JSON block.

Minimum fields:
- `schema_version`
- `stage`
- `status`
- `summary`
- `fields`
- `delivery`
- `next_recommendation`

### 10.3 Stage meanings

`plan` should answer:
- what is wrong
- why it is wrong
- what surfaces are affected
- what implementation shape is recommended
- what risks remain

`build` should answer:
- what changed
- where it changed
- what commands ran
- what test evidence exists
- what delivery evidence exists

`review` should answer:
- whether to approve
- what evidence supports the verdict
- what risks remain
- what next action is required

---

## 11. Parallelism policy

### 11.1 Safe parallelism

Parallel work is usually safe when:
- lanes touch different modules
- lanes operate on different hypotheses
- an explicit API contract separates lanes
- one lane can finish without waiting on mutable internals of another

### 11.2 Unsafe parallelism

Do not run parallel build lanes when:
- the same files are likely to change
- ownership of a shared module is unclear
- acceptance depends on unfinished internals in another lane
- merge strategy is undefined

### 11.3 Default team size

Default:
- one active worker

Scale to:
- 2–3 workers when independence is clear

Require an explicit reason before going beyond 3 active lanes.

---

## 12. Convergence protocol

Parallel lanes require an explicit convergence owner.

Valid convergence owners:
- rara
- a dedicated review lane
- an integrator lane
- a controller-managed transition step

### 12.1 Convergence checklist

Before the parent can close:
- each required lane delivered its artifact
- sibling outputs are compatible
- unresolved contradictions are handled explicitly
- one owner has synthesized the team result
- the parent objective is verified as a whole

### 12.2 Parent completion rule

A parent issue is complete only when:
- required child lanes are complete
- integration passed
- the user-facing objective is satisfied
- residual risks are recorded if any remain

Child completion alone never implies parent completion.

---

## 13. Quality gates

### 13.1 Plan gate

Pass when:
- root cause is concrete
- implementation shape is actionable
- affected surface is bounded
- risks are named

### 13.2 Build gate

Pass when:
- required changes exist
- command/test evidence is present
- delivery mode matches dispatch contract
- build artifact is consumable by review

### 13.3 Review gate

Pass when:
- verdict is explicit
- evidence is concrete
- open risks are acceptable or assigned

### 13.4 Integration gate

Pass when:
- lane outputs are mutually compatible
- the whole objective works together
- no lane-level contradiction remains unresolved

### 13.5 Closure gate

Pass when:
- parent objective is satisfied
- required evidence exists
- user-visible result is coherent
- status matches reality

---

## 14. Failure handling

### 14.1 First failure

After one failed run:
- inspect failure details
- classify cause: ambiguity, environment, scope, implementation quality
- issue a precise follow-up

### 14.2 Repeated failure

After two failed rounds:
- narrow scope
- split work if needed
- tighten acceptance criteria
- reassign only with a reason
- surface trade-offs to the user if systemic

### 14.3 Validation failure

If completion artifact validation fails:
- list exact missing or invalid fields
- request a corrected artifact
- do not advance stage ownership yet

### 14.4 Conflict failure

If sibling lanes conflict:
- stop parallel drift
- restate authoritative boundary
- force convergence or reduce to one owner

---

## 15. Default operating sequence

1. Triage request
2. Choose team shape
3. Write parent contract
4. Define lane contracts
5. Dispatch lanes
6. Monitor execution
7. Validate artifacts
8. Converge outputs
9. Run gates
10. Close child lanes
11. Close parent objective
12. Report result to user

---

## 16. MVP landing plan

The first concrete implementation on top of current `multica-team` should support this minimum loop:

### Phase A: issue contract quality
- parent issue template always includes `team shape`, `active lanes`, `convergence plan`
- child issue template always includes `lane ownership` and `coordination contract`

### Phase B: lane discipline
- no parallel build dispatch without explicit `must not modify`
- follow-up comments always restate the concrete delta

### Phase C: convergence discipline
- parent issue cannot be marked complete until an explicit convergence note exists for multi-lane work

### Phase D: gate discipline
- review and closure use explicit `GO | NO_GO` style verdicts where appropriate

---

## 17. Definition of done for this protocol

This protocol is landed operationally when rara can do all of the following consistently:
- choose an appropriate team shape
- create issue trees that encode lane ownership clearly
- route coding work through Multica without vague assignment
- keep sibling lanes from drifting into conflict
- require structured handoff artifacts
- close only after integrated verification

At that point, Multica is no longer just a multi-agent runtime in practice. It is running our team.
