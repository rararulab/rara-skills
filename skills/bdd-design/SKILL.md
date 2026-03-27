---
name: bdd-design
description: "Use when designing BDD features, writing Gherkin acceptance criteria, decomposing requirements into testable scenarios, creating GitHub issues with .feature specs, or specifying acceptance criteria for the implementation agent. Keywords: BDD design, Gherkin, acceptance criteria, feature spec, scenario design, requirement decomposition."
---

# BDD Design Skill

**IRON LAW: Every step must be specific enough that an agent can derive test assertions from the step text alone.** If a step says "it works" or "the result is correct", it is too vague — rewrite it with concrete, verifiable expectations.

You are Agent 1 (the design agent). Produce a GitHub issue containing Gherkin acceptance criteria and a design spec that Agent 2 (the implementation agent) will use to deliver working code with passing BDD tests.

## Workflow Checklist

Copy and track progress:

```
- [ ] ⚠️ 1. Understand the codebase (read AGENT.md, CLAUDE.md, src/, features/)
- [ ] ⚠️ 2. Check existing step definitions (rara-bdd list)
- [ ] ⚠️ 3. Write plan spec (context, deliverables, constraints, out of scope)
- [ ] ⚠️ 4. Write Gherkin .feature content (≥3 scenarios per deliverable)
- [ ] 5. Write design spec (files, signatures, constraints)
- [ ] ⚠️ 6. Self-check (all checklist items pass)
- [ ] ⚠️ 7. Submit for bdd-review (GO / NO_GO gate)
- [ ] 8. Fix based on review feedback (max 2 rounds)
- [ ] ⛔ 9. Confirm with user before creating issue
- [ ] 10. Create the GitHub issue(s)
```

### 1. Understand the Codebase ⚠️

Read the project context before writing anything:

- Read `AGENT.md` — project conventions and architecture
- Read `CLAUDE.md` — dev workflow and commands
- Browse `src/` — source structure
- Browse `features/` — existing .feature files (if any)

### 2. Check Existing Step Definitions ⚠️

Reuse existing steps — do NOT create duplicates.

```bash
rara-bdd list
```

If an existing step matches your intent (even partially), reuse its exact wording.

### 3. Write Plan Spec ⚠️

Before writing any Gherkin, produce a plan spec that frames the work:

```markdown
## Plan Spec

**Product context:** Why this feature exists, what user problem it solves.

**Deliverables:**
- [ ] Deliverable 1 — brief description
- [ ] Deliverable 2 — brief description

**Constraints:**
- Constraint 1 (e.g., must not break existing API)
- Constraint 2 (e.g., max response time < 200ms)

**Out of scope:**
- Thing explicitly excluded from this work
```

The plan spec serves as the contract between design and review. The bdd-review agent will check that every deliverable has corresponding scenarios.

#### Large / Epic Tasks

When the task is too large for a single issue:

1. Write **one plan spec** covering the full scope
2. Split deliverables into **N groups**, each becoming its own issue
3. Each issue gets its own `.feature` file with at least 3 scenarios
4. Number issues with a suffix: `feat(scope): description (1/N)`, `feat(scope): description (2/N)`
5. Submit **all** `.feature` files to bdd-review together for cross-feature consistency

### 4. Write Gherkin .feature Content ⚠️

Create complete Gherkin content with **at least 3 scenarios per deliverable**: one happy path, one error case, and one edge case.

#### Rules

- Tag the feature with `@module-name` (e.g., `@auth`, `@billing`)
- Tag each scenario with `@AC-XX` (e.g., `@AC-01`, `@AC-02`)
- Steps must be concrete and verifiable — can an agent derive test logic from the step text alone?
- Use `"quoted strings"` for string parameters, bare integers for number parameters
- Reuse existing step definitions discovered via `rara-bdd list`
- Use `Given` for preconditions, `When` for actions, `Then` for assertions
- Use `And` / `But` for continuation within the same keyword group

#### Good vs Bad Examples

```gherkin
# BAD — too vague, agent cannot derive assertions
@AC-01
Scenario: User logs in
  Given a user exists
  When they log in
  Then it works

# BAD — implementation detail in steps (leaks internal API)
@AC-01
Scenario: User logs in
  Given a row in the users table with id 1
  When POST /api/v1/sessions with JSON body {"user_id": 1}
  Then the sessions table has a new row

# GOOD — specific, testable, no implementation leak
@AC-01
Scenario: Valid credentials return a session token
  Given a registered user with email "alice@example.com"
  When the user logs in with correct credentials
  Then the response status is 200
  And the response body contains a non-empty "token" field

# GOOD — error case with clear expected behavior
@AC-02
Scenario: Invalid password returns 401
  Given a registered user with email "alice@example.com"
  When the user logs in with password "wrong-password"
  Then the response status is 401
  And the response body contains error "invalid credentials"

# GOOD — edge case
@AC-03
Scenario: Login with non-existent email returns 404
  Given no user is registered with email "ghost@example.com"
  When the user logs in with email "ghost@example.com"
  Then the response status is 404
```

### 5. Write the Design Spec

Provide a concise design spec that tells the implementation agent exactly what to build:

- **Files to create or modify** — list every file path
- **Interface signatures** — public function/struct/trait signatures the implementation must expose
- **Constraints** — invariants, error handling strategy, performance requirements
- **Dependencies** — any new crates or services required

### 6. Self-Check ⚠️

Before submitting for review, verify:

- [ ] Plan spec has product context, deliverables, constraints, and out of scope
- [ ] Every deliverable in the plan spec has corresponding scenarios
- [ ] Valid Gherkin syntax (Feature/Scenario/Given/When/Then structure)
- [ ] At least 3 scenarios per deliverable (happy path + error + edge case)
- [ ] Steps are concrete and verifiable (not vague)
- [ ] Existing steps reused where applicable (checked via `rara-bdd list`)
- [ ] `"quoted strings"` for string params, bare integers for numbers
- [ ] Each scenario tagged with `@AC-XX`
- [ ] Feature tagged with `@module-name`
- [ ] Design spec lists all files to create/modify with signatures

### 7. Submit for bdd-review ⚠️

Submit the following to the bdd-review skill for quality review:

- Plan spec
- .feature content
- Existing steps list (output from `rara-bdd list`)
- Round number (starts at 1)

Wait for the review verdict:

- **GO** — proceed to step 9 (user confirmation)
- **NO_GO** — proceed to step 8 (fix and resubmit)

### 8. Fix Based on Review Feedback

When bdd-review returns NO_GO:

1. Read the fix list from the review report
2. Apply each fix to the .feature content and/or plan spec
3. Re-run self-check (step 6)
4. Resubmit to bdd-review with incremented round number

**Max 2 review rounds.** If Round 2 still returns NO_GO, escalate to the user with both review reports and ask for guidance. Do NOT loop further.

### 9. Confirm with User ⛔

Present the complete plan spec, Gherkin content, and design spec to the user. Include the bdd-review verdict (should be GO at this point). Wait for explicit approval before creating the GitHub issue. Do NOT create the issue without confirmation.

### 10. Create the GitHub Issue

Use the `bdd_task.yml` issue template:

```bash
gh issue create --template bdd_task.yml \
  --title "feat(scope): short description" \
  --body "$(cat <<'EOF'
### Description

What should be implemented and why.

### Plan Spec

**Product context:** ...

**Deliverables:**
- [ ] ...

**Constraints:**
- ...

**Out of scope:**
- ...

### .feature (Acceptance Criteria)

```gherkin
@module-name
Feature: Feature title

  @AC-01
  Scenario: Happy path description
    Given ...
    When ...
    Then ...

  @AC-02
  Scenario: Error case description
    Given ...
    When ...
    Then ...

  @AC-03
  Scenario: Edge case description
    Given ...
    When ...
    Then ...
```

### Scope

- `src/module.rs` — create: new module with XxxTrait
- `src/lib.rs` — modify: add `pub mod module;`
- `features/module.feature` — create: copy from above

### Additional Context

Design constraints, dependencies, notes.
EOF
)" --label "agent:claude" --label "enhancement" --label "core"
```

**Required labels:**
- Agent label: `agent:claude` (or whichever agent is performing this)
- Type label: auto-applied by template (`enhancement`)
- Component label: one of `core`, `backend`, `frontend`, `cli`, `ci`, `docs`

For **Large / Epic tasks** (N issues), create each issue in sequence with the `(X/N)` suffix in the title and cross-reference the other issues in the Additional Context section.

## Anti-Patterns

- Writing vague steps like "it works", "result is correct", "operation succeeds"
- Leaking implementation details into steps (SQL, HTTP methods, table names)
- Ignoring existing step definitions and creating duplicates
- Writing only the happy path — always include error + edge cases
- Creating the issue without user confirmation
- Skipping the plan spec and jumping straight to Gherkin
- Skipping bdd-review and going directly to user confirmation
- Looping more than 2 review rounds without escalating to the user
