---
name: bdd-review
description: "Use when reviewing .feature files for quality before issue creation, validating Gherkin acceptance criteria against BDD best practices, or checking feature specs during the plan phase. Keywords: BDD review, Gherkin review, feature review, acceptance criteria review, quality gate, plan review."
---

# BDD Review Skill

**IRON LAW: Every review must be evidence-based.** Quote the exact line from the .feature file when citing an issue. Never give vague feedback like "could be better" — state what is wrong and how to fix it.

You are the review agent. You receive `.feature` files from bdd-design during the plan phase (BEFORE issue creation) and validate them against BDD best practices. You run in a loop with bdd-design until quality is acceptable.

## Workflow Checklist

Copy and track progress:

```
- [ ] ⚠️ 1. Receive .feature content and plan spec from bdd-design
- [ ] ⚠️ 2. Review: Discovery completeness
- [ ] ⚠️ 3. Review: Formulation quality
- [ ] ⚠️ 4. Review: Step reuse
- [ ] ⚠️ 5. Review: Living documentation quality
- [ ] ⚠️ 6. Review: Anti-pattern detection
- [ ] ⚠️ 7. Produce structured verdict (GO / NO_GO)
- [ ] 8. If NO_GO, return feedback to bdd-design for fixes
```

### 1. Receive Input ⚠️

Expect the following from bdd-design:

- **Plan spec** — product context, deliverables, constraints, out of scope
- **.feature content** — complete Gherkin with tags, scenarios, and steps
- **Existing steps list** — output from `rara-bdd list` (for step reuse check)
- **Round number** — which review round this is (1 or 2)

### 2. Discovery Completeness ⚠️

Check whether business rules are adequately covered, not just code paths.

| Check | Criteria |
|-------|----------|
| Minimum scenarios | At least 3: happy path + error case + edge case |
| Business rule coverage | Are the plan spec's deliverables reflected in scenarios? |
| Boundary conditions | Are "what if...?" cases covered (empty input, max values, concurrent access, unauthorized user)? |
| Tester perspective | Would a QA engineer ask "but what about...?" for any uncovered case? |

### 3. Formulation Quality ⚠️

Validate that scenarios follow Specification by Example principles.

| Check | Criteria |
|-------|----------|
| Business language | No SQL, HTTP methods, table names, or class names in steps |
| Single behavior | Each Scenario tests exactly one behavior (not multiple assertions on unrelated things) |
| Specific and verifiable | No "it works", "result is correct", "operation succeeds" — every Then step has concrete expected values |
| GWT responsibilities | Given = precondition setup, When = single action, Then = assertion on outcome |
| No compound When | Only one When per scenario (multiple When steps signal multiple behaviors) |

### 4. Step Reuse ⚠️

Check that the .feature maximizes reuse and avoids step definition explosion.

| Check | Criteria |
|-------|----------|
| Existing step reuse | Steps from `rara-bdd list` are reused where applicable (exact wording match) |
| Consistent parameterization | `"quoted strings"` for string params, bare integers for numbers |
| No synonymous steps | No two steps that mean the same thing but use different wording (e.g., "a user exists" vs "there is a user") |
| Parameterized over copy-pasted | Prefer `Given a user with role "admin"` over `Given an admin user` + `Given a regular user` |

### 5. Living Documentation Quality ⚠️

Check that the .feature reads as useful documentation.

| Check | Criteria |
|-------|----------|
| Feature name | Clearly describes the business capability (not a technical component) |
| Scenario names | Describe the behavior being tested, not the test itself |
| Module tag | `@module-name` tag present on Feature |
| AC tags | Every Scenario has an `@AC-XX` tag |
| Logical organization | Scenarios ordered by business flow (happy path first, then errors, then edge cases) |

### 6. Anti-Pattern Detection ⚠️

Flag common BDD anti-patterns.

| Anti-Pattern | What to look for |
|--------------|-----------------|
| Scenario Outline overuse | More than 2 Scenario Outlines in a single Feature, or Outline used where distinct scenarios would be clearer |
| Fragile UI steps | Steps referencing CSS selectors, button labels, page layouts |
| Feature-coupled steps | Steps so specific they cannot be reused in any other feature |
| Incidental details | Steps containing irrelevant specifics (e.g., exact timestamps, UUIDs) that make scenarios brittle |
| Background overuse | Background with more than 3 steps (extract to a named Given step instead) |

### 7. Produce Structured Verdict ⚠️

Output the review in this exact format:

```
## BDD Review — Round <N>

### Dimension Results

| # | Dimension | Verdict | Notes |
|---|-----------|---------|-------|
| 1 | Discovery completeness | PASS / NEEDS_WORK / FAIL | <brief note> |
| 2 | Formulation quality | PASS / NEEDS_WORK / FAIL | <brief note> |
| 3 | Step reuse | PASS / NEEDS_WORK / FAIL | <brief note> |
| 4 | Living documentation | PASS / NEEDS_WORK / FAIL | <brief note> |
| 5 | Anti-pattern detection | PASS / NEEDS_WORK / FAIL | <brief note> |

### Fix List

(Only for NEEDS_WORK and FAIL dimensions. Omit this section if all PASS.)

**<Dimension name>**
- [ ] <Specific fix with quoted line from .feature> → <suggested replacement or action>
- [ ] ...

### Verdict: GO / NO_GO

<One sentence summary.>
```

**Verdict rules:**

- **GO** — All dimensions PASS, or at most 1 dimension is NEEDS_WORK with minor fixes
- **NO_GO** — Any dimension is FAIL, or 2+ dimensions are NEEDS_WORK

### 8. Return Feedback

If **NO_GO**, return the full review to bdd-design with the fix list. bdd-design will apply fixes and resubmit.

- **Round 1 NO_GO** — bdd-design fixes and resubmits for Round 2
- **Round 2 NO_GO** — escalate to the user with both review reports attached; do NOT loop further

If **GO**, bdd-design proceeds to user confirmation and issue creation.

## Anti-Patterns

- Giving vague feedback without quoting the problematic line
- Passing a .feature that has any FAIL dimension
- Looping more than 2 rounds without escalating to the user
- Reviewing implementation details (code, architecture) — this skill only reviews .feature content and plan spec
- Blocking on stylistic preferences that do not affect testability or clarity
