# Issue templates

These are working templates for rara when creating or updating Multica-native work items.

Keep the focus on deliverables and acceptance criteria. Do not over-specify implementation unless the user explicitly gave architectural constraints.

Treat issue bodies as collaboration contracts, not just task descriptions.
When work spans multiple teammates, parent issues act as team boards and child issues act as teammate-owned lanes.

---

## 1) Parent issue template

Use for the overall objective when the work needs decomposition.

```md
Goal: <single-sentence outcome>

Context:
- Repo / workspace: <repo or code area>
- Current state: <important facts only>
- Why this matters: <product or operational reason>

Team shape:
- mode: <single-agent | staged-team | parallel-lanes | hybrid>
- lead: rara
- intended teammate count: <n>
- reason this shape fits: <why this should stay single-stage / staged / parallel / hybrid>

Workflow graph:
- plan issue: <ISSUE-ID or n/a>
- build issue: <ISSUE-ID or n/a>
- review issue: <ISSUE-ID or n/a>
- integration / convergence issue: <ISSUE-ID or n/a>

Active lanes:
1. <lane name> — owner role: <role> — boundary: <what it owns>
2. <lane name> — owner role: <role> — boundary: <what it owns>
3. <lane name> — owner role: <role> — boundary: <what it owns>

Shared constraints:
- file conflict policy: <why parallel build is safe, or why one build owner is required>
- branch / delivery policy: <branching, PR, artifact, or local delivery expectations>
- gate policy: <which review / test / integration gates must pass before closure>

Scope of this parent:
- Coordinate the full objective across child issues
- Track completion of all required implementation pieces
- Ensure final verification before closure

Coordination rules:
- teammates publish durable findings in issue comments or canonical artifacts
- handoff authority belongs to rara or the workflow controller
- sibling lanes must not absorb overlapping work without an explicit boundary change
- child completion does not imply parent completion

Convergence plan:
- <how sibling outputs will rejoin>
- <who owns final synthesis>
- <what evidence is required before the parent can close>

Out of scope:
- <explicit exclusions if useful>

Acceptance criteria:
- All required child issues are completed and verified
- The overall user-facing goal is satisfied
- Residual risks are documented if any remain
- Final convergence / integration evidence exists when multiple lanes are involved
```

### Title examples
- Implement <feature name>
- Repair <broken workflow>
- Complete <initiative name>

---

## 2) Child issue template

Use for a concrete deliverable that should be assigned to one agent.

```md
Goal: <single clear deliverable>

Stage: <plan | build | review | integration | n/a>

Lane ownership:
- teammate role: <planner | investigator | builder | reviewer | verifier | integrator | frontend | backend | docs | tests>
- lane boundary: <scope this issue owns>
- must not modify: <conflict areas or sibling-owned surfaces>
- upstream inputs: <parent note / sibling artifact / controller note>
- downstream consumers: <which role, lane, or controller will consume this output>

Context:
- Repo / path: <orientation only>
- Current state: <relevant facts>
- Parent objective: <what broader goal this supports>

Required work:
1. <deliverable>
2. <deliverable>

Functional requirements:
- <observable behavior>

Technical guidance:
- <constraints / preferred architecture>
- <things to avoid>

Coordination contract:
- publish blocking evidence durably if it affects another lane
- do not silently absorb sibling scope
- leave a final artifact that a downstream lane can consume without guessing
- if this is an integration or review lane, evaluate sibling artifacts explicitly rather than inferring completion from status labels

Out of scope:
- <what this issue should not absorb>

Expected deliverables:
- <code / docs / config / tests>
- final issue comment containing the canonical `STAGE_RESULT` JSON block shown below when controller-managed

Acceptance criteria:
- <verifiable condition>
- <verifiable condition>
- gate expectations are satisfied for this lane: <review | tests | integration note | n/a>

Canonical completion contract:
- Your final issue comment must include a `## STAGE_RESULT` section when controller-managed.
- Inside that section, include one fenced `json` block only.
- The JSON block is the machine-readable source of truth.
- Surrounding prose is optional and will not be treated as authoritative.
```

### Canonical `STAGE_RESULT` template

Use and fill the stage-specific fields:

```md
## STAGE_RESULT

```json
{
  "schema_version": 1,
  "stage": "<plan|build|review>",
  "status": "ready_for_handoff",
  "summary": "<short factual summary>",
  "comment_id": "<optional-comment-id>",
  "fields": {
    "<required_field>": "<value>"
  },
  "delivery": {
    "mode": "<commit+push|commit+push+pr|local-artifact|issue-comment|artifact+comment>",
    "status": "<satisfied|fallback_used|missing|not_applicable>",
    "branch": "<branch-or-null>",
    "commit_sha": "<sha-or-null>",
    "pr_url": "<url-or-null; for commit+push+pr this must be an actual opened GitHub PR URL like https://github.com/<owner>/<repo>/pull/<number>, not /pull/new/...>",
    "artifact_path": "<path-or-null>",
    "comment_ref": "<comment-or-null>"
  },
  "verdict": "<GO|NO_GO only for review>",
  "next_recommendation": "<handoff|blocked|done>"
}
```
```

### Stage-specific required fields

#### Plan
- `observed_problem`
- `evidence`
- `root_cause`
- `affected_surface`
- `implementation_shape`
- `acceptance_criteria`
- `risks`

#### Build
- `branch`
- `commit_sha`
- `changed_files`
- `commands_run`
- `test_results`
- `risks`
- plus `delivery.*` evidence matching the dispatch contract
- if delivery mode is `commit+push+pr`, `delivery.pr_url` must be a real opened PR URL of the form `https://github.com/<owner>/<repo>/pull/<number>`; `pull/new/...` links do not satisfy completion

#### Review
- `verdict`
- `evidence`
- `risks`
- `next_action`

#### Integration
- `integrated_scope`
- `input_artifacts`
- `compatibility_check`
- `integration_risks`
- `next_action`

### Title examples
- Add <capability>
- Fix <bug>
- Refactor <component>
- Document <workflow>
- Integrate <parallel workstreams>

---

## 3) Follow-up comment template

Use when an issue already exists and the next round is narrow enough that a new child issue would be overkill.

```md
Follow-up request:
<one-sentence instruction>

What needs adjustment:
- <gap 1>
- <gap 2>

Constraints:
- <must keep>
- <must avoid>

Boundary reminder:
- this lane still owns: <owned scope>
- do not absorb: <sibling or out-of-scope work>

Done when:
- <verification check>
- <verification check>
- the final comment contains a corrected canonical `STAGE_RESULT` JSON block when controller-managed
```

### Good use cases
- tighten an edge case
- add a missing test
- fix a review finding
- align implementation with a clarified requirement
- repair a malformed `STAGE_RESULT` artifact

### Bad use cases
- introducing a materially new scope
- bundling multiple unrelated fixes
- changing ownership across major workstreams

---

## 4) Parallel investigation / competing hypotheses template

Use when multiple teammates should explore different theories or surfaces before build converges.

```md
Goal: determine which hypothesis or surface best explains <problem>

Investigation lane:
- hypothesis / focus: <auth | cache | infra | frontend state | etc.>
- teammate role: investigator
- lane boundary: <what this lane may inspect>
- must not modify: <production code unless explicitly allowed>

Required work:
1. gather concrete evidence for or against this hypothesis
2. identify affected files / systems if the hypothesis is plausible
3. state whether this lane recommends convergence into a build lane

Expected deliverables:
- concise evidence summary
- explicit recommendation: `supported`, `not_supported`, or `inconclusive`
- if controller-managed, canonical `STAGE_RESULT`

Acceptance criteria:
- findings are evidence-backed
- recommendation is explicit
- downstream lanes can tell whether to continue or stop this hypothesis
```

---

## 5) Verification comment template

Use when rara needs to record a review verdict after a task run finishes.

```md
Verification result: <GO | NO_GO>

Checked:
- <correctness>
- <tests / build / lint>
- <architecture or scope fit>
- <delivery mode satisfied or not>
- <convergence complete or not>

Notes:
- <important finding>
- <residual risk>

Next action:
- <close / merge / follow-up comment / create new child issue>
```

---

## 6) Reassignment note template

Use only when ownership really needs to change.

```md
Reassigning this issue to <agent>.

Reason:
- <why reassignment is necessary>

Current state:
- <what is already done>
- <what remains>

Lane transfer:
- new owner now owns: <boundary>
- do not re-open: <already completed or sibling-owned work>

Continue from:
- <starting point / branch / artifact / comment thread>

Controller note:
- authoritative handoff comment: <link or quote>
```

Keep reassignment rare and intentional. In Multica, changing assignee can cancel current task execution and enqueue work for the new assignee.

---

## 7) Convergence note template

Use when multiple sibling lanes must be summarized into one next step.

```md
Convergence result:
- parent issue: <ISSUE-ID>
- lanes reviewed: <lane list>
- convergence owner: <rara | review lane | controller>

What is now established:
- <fact 1>
- <fact 2>

Conflicts or gaps:
- <gap or contradiction>
- <gap or contradiction>

Decision:
- <proceed to build | request follow-up on lane X | stop hypothesis Y | move to review>

Next authoritative input:
- <which issue / artifact / controller note should downstream work consume>
```

---

## 8) Authoritative handoff note template

Use when the workflow controller approves a transition.

```md
## WORKFLOW_CONTROLLER_DECISION
stage: <plan|build|review>
issue_id: <ISSUE-ID>
task_id: <TASK-ID or n/a>
observed_state: <completed|failed|cancelled|poll_error>
validator_status: <passed|failed|pending>
decision: <handoff|blocked|done|needs_human>
next_stage: <build|review|done|n/a>
artifact_comment_id: <comment-id or n/a>
artifact_sha256: <sha or n/a>

## SUMMARY
<controller summary>

## VALIDATION
summary: <validation summary>
delivery_check: <delivery gate summary>

## NEXT_ACTION
<authoritative reassignment or escalation instruction>
```

This comment is emitted by the controller, not by the stage agent. It is the audit record for why the workflow moved or stopped.
