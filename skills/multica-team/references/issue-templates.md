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

Acceptance criteria:
- <verifiable condition>
- <verifiable condition>
```

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
```

### Good use cases
- tighten an edge case
- add a missing test
- fix a review finding
- align implementation with a clarified requirement

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
```

Keep reassignment rare and intentional. In Multica, changing assignee can cancel current task execution and enqueue work for the new assignee.
