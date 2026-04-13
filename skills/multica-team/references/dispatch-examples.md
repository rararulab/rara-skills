# Dispatch examples

Concrete Multica team examples that rara can adapt quickly.

---

## Example 1: small bug fix

### Shape
- `single-agent`

### Parent / single issue title
- Fix settings panel save button stuck in loading state

### Issue body
```md
Goal: Fix the settings panel so saving completes and the button returns to its idle state.

Stage: build

Lane ownership:
- teammate role: builder
- lane boundary: settings panel save flow and its immediate state management
- must not modify: unrelated settings sections, auth flow, or backend APIs unless strictly required for the fix
- upstream inputs: user bug report and current implementation
- downstream consumers: rara for verification

Context:
- Repo / path: app/settings
- Current state: save sometimes succeeds but the button remains in a loading state
- Parent objective: restore correct save UX

Required work:
1. identify the cause of the stuck loading state
2. implement the fix
3. add or adjust a regression test if practical

Functional requirements:
- save completes successfully
- loading state clears after success and failure paths

Technical guidance:
- keep the fix local to the settings flow if possible
- avoid broad refactors

Out of scope:
- redesigning the settings UI
- unrelated settings bugs

Expected deliverables:
- code change
- test evidence

Acceptance criteria:
- loading indicator clears correctly after save
- no regression in save behavior
```

---

## Example 2: risky feature with planning

### Shape
- `staged-team`

### Parent issue title
- Implement audit log export flow

### Parent issue body
```md
Goal: Add an audit log export flow that lets admins request and download exports reliably.

Context:
- Repo / workspace: app + server
- Current state: audit logs can be viewed but not exported
- Why this matters: admins need portable records for compliance workflows

Team shape:
- mode: staged-team
- lead: rara
- intended teammate count: 3
- reason this shape fits: export touches backend generation, delivery UX, and review risk; the implementation shape should be agreed before coding

Workflow graph:
- plan issue: CHILD-PLAN
- build issue: CHILD-BUILD
- review issue: CHILD-REVIEW
- integration / convergence issue: n/a

Active lanes:
1. plan — owner role: planner — boundary: define implementation shape and risks
2. build — owner role: builder — boundary: implement the approved export flow
3. review — owner role: reviewer — boundary: verify correctness, risks, and readiness

Shared constraints:
- file conflict policy: only the build lane edits product code
- branch / delivery policy: build lane must produce branch, commit, and PR evidence
- gate policy: plan gate, build gate, review gate must pass before closure

Convergence plan:
- plan feeds build; build feeds review
- review owns final GO / NO_GO decision
- rara closes the parent only after review evidence is complete

Acceptance criteria:
- admins can request an export successfully
- delivery path is verified
- risks and follow-up notes are documented if needed
```

---

## Example 3: frontend/backend split

### Shape
- `parallel-lanes`

### Parent issue title
- Complete team member invitation flow

### Parent issue body
```md
Goal: Ship a complete invitation flow so workspace admins can invite new team members end-to-end.

Context:
- Repo / workspace: web + server
- Current state: backend invitation endpoints exist partially, frontend flow is incomplete
- Why this matters: workspace growth depends on a reliable invite path

Team shape:
- mode: parallel-lanes
- lead: rara
- intended teammate count: 3
- reason this shape fits: frontend and backend can move independently behind a clear API contract, then converge in verification

Workflow graph:
- plan issue: n/a
- build issue: n/a
- review issue: CHILD-REVIEW
- integration / convergence issue: CHILD-INTEGRATION

Active lanes:
1. backend invite lane — owner role: backend — boundary: invitation API, persistence, validation
2. frontend invite lane — owner role: frontend — boundary: invite UI and client-side submission flow
3. review lane — owner role: reviewer — boundary: validate integrated behavior after convergence

Shared constraints:
- file conflict policy: backend and frontend stay within their surfaces; shared contract changes must be written durably in parent comments
- branch / delivery policy: each build lane produces its own artifact evidence
- gate policy: integration review required before parent closure

Convergence plan:
- backend and frontend lanes publish artifacts
- integration lane verifies compatibility and working end-to-end behavior
- review lane decides whether the parent objective is satisfied

Acceptance criteria:
- admin can send an invite successfully
- frontend and backend artifacts are compatible
- integration evidence exists before closure
```

---

## Example 4: competing hypotheses debugging

### Shape
- `parallel-lanes`

### Parent issue title
- Investigate intermittent websocket disconnects

### Pattern
```md
Goal: Determine the dominant cause of intermittent websocket disconnects and converge on the right fix path.

Team shape:
- mode: parallel-lanes
- reason this shape fits: multiple plausible hypotheses exist and can be investigated independently before implementation

Active lanes:
1. infra hypothesis — owner role: investigator — boundary: proxy, timeout, and deployment configuration
2. backend hypothesis — owner role: investigator — boundary: websocket server lifecycle and heartbeat logic
3. frontend hypothesis — owner role: investigator — boundary: client reconnection and browser-side behavior

Convergence plan:
- each lane ends with supported / not_supported / inconclusive
- rara selects the winning hypothesis
- only then create a build lane
```

---

## Example 5: hybrid research then build

### Shape
- `hybrid`

### Parent issue title
- Repair flaky sync pipeline with parallel investigation and single implementation owner

### Pattern
```md
Goal: Stabilize the sync pipeline and remove the dominant source of flakiness.

Team shape:
- mode: hybrid
- reason this shape fits: early investigation should run in parallel, but implementation should converge to one owner to avoid code conflicts

Workflow graph:
- research lane A: CHILD-A
- research lane B: CHILD-B
- build issue: CHILD-BUILD
- review issue: CHILD-REVIEW

Convergence plan:
- research lanes inspect different hypotheses
- rara chooses the winning implementation shape
- one build lane owns product changes
- review lane validates the integrated result
```

---

## Operational note

Adapt titles and paths, keep the structure.

The important parts are:
- explicit shape choice
- explicit lane boundaries
- explicit convergence owner
- explicit gate expectations
