# Issue templates

These are working templates for rara when creating or updating Multica-native work items.

Keep the focus on deliverables and acceptance criteria. Do not over-specify implementation unless the user explicitly gave architectural constraints.

---

## 1) Parent issue template

Use for the overall objective when the work needs decomposition.

```md
Goal: <single-sentence outcome>

Context:
- Repo / workspace: <repo or code area>
- Current state: <important facts only>
- Why this matters: <product or operational reason>

Workflow graph:
- plan issue: <ISSUE-ID>
- build issue: <ISSUE-ID>
- review issue: <ISSUE-ID>

Scope of this parent:
- Coordinate the full objective across child issues
- Track completion of all required implementation pieces
- Ensure final verification before closure

Expected child workstreams:
1. <child stream>
2. <child stream>
3. <child stream>

Out of scope:
- <explicit exclusions if useful>

Acceptance criteria:
- All required child issues are completed and verified
- The overall user-facing goal is satisfied
- Residual risks are documented if any remain
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

Stage: <plan | build | review>

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

Out of scope:
- <what this issue should not absorb>

Expected deliverables:
- <code / docs / config / tests>
- final issue comment containing the canonical `STAGE_RESULT` JSON block shown below

Acceptance criteria:
- <verifiable condition>
- <verifiable condition>

Canonical completion contract:
- Your final issue comment must include a `## STAGE_RESULT` section.
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
    "pr_url": "<url-or-null>",
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

#### Review
- `verdict`
- `evidence`
- `risks`
- `next_action`

### Title examples
- Add <capability>
- Fix <bug>
- Refactor <component>
- Document <workflow>

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

Done when:
- <verification check>
- <verification check>
- the final comment contains a corrected canonical `STAGE_RESULT` JSON block
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

## 4) Verification comment template

Use when rara needs to record a review verdict after a task run finishes.

```md
Verification result: <GO | NO_GO>

Checked:
- <correctness>
- <tests / build / lint>
- <architecture or scope fit>
- <delivery mode satisfied or not>

Notes:
- <important finding>
- <residual risk>

Next action:
- <close / merge / follow-up comment / create new child issue>
```

---

## 5) Reassignment note template

Use only when ownership really needs to change.

```md
Reassigning this issue to <agent>.

Reason:
- <why reassignment is necessary>

Current state:
- <what is already done>
- <what remains>

Continue from:
- <starting point / branch / artifact / comment thread>

Controller note:
- authoritative handoff comment: <link or quote>
```

Keep reassignment rare and intentional. In Multica, changing assignee can cancel current task execution and enqueue work for the new assignee.

---

## 6) Authoritative handoff note template

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
