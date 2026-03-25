# Prompt Templates for Agent Delegation

## Planning Prompt (Planner Role)

Use this to expand a brief request into a concrete spec before delegating.
Focus on WHAT to deliver, not HOW to implement. Over-specifying causes
cascading errors when the plan gets something wrong.

```
Analyze this request and produce a product spec:

Request: <1-4 sentence description>

Produce:
1. Product context — why this matters, who benefits
2. Deliverables — concrete, verifiable outcomes (NOT implementation steps)
3. Acceptance criteria — how to verify each deliverable is complete
4. Constraints — non-negotiable requirements (API contracts, perf, compat)
5. Out of scope — what to explicitly NOT do
6. Risk factors — what could go wrong, blast radius

Be ambitious about scope but stay at the product/design level.
Do NOT specify file paths, function signatures, or line-level changes.
The implementing agent will figure out the path.
```

## Implementation Prompt (Generator Role)

Tell the generator WHAT to deliver. Let it decide HOW.

```
Implement <description>. Issue #{N}, branch issue-{N}-{short-name}.

Product context:
<why this change matters>

Deliverables:
- <concrete outcome 1>
- <concrete outcome 2>

Constraints:
- All commits: conventional format <type>(<scope>): <desc> (#N)
- Include 'Closes #{N}' in commit body
- Add doc comments to all new public items
- Run build/check before committing

Out of scope:
- <what NOT to do>
```

## Evaluation Prompt (Evaluator Role)

Run in a SEPARATE `claude -p` invocation (read-only). Models cannot reliably
self-evaluate — a fresh context catches issues the generator is blind to.

```
Evaluate the changes on this branch against these criteria:

1. **Correctness**: Does the logic handle edge cases? Are there errors?
2. **Completeness**: Are all specified deliverables implemented?
   Missing features are the #1 failure mode in long-running agent work.
3. **Architecture**: Does this follow existing codebase patterns?
4. **Test coverage**: What scenarios lack tests?
5. **Security**: Any injection, overflow, or unsafe patterns?

For each criterion, rate: PASS / NEEDS_WORK / FAIL
Provide specific file:line references for any issues found.
End with a GO / NO_GO verdict and a prioritized fix list if NO_GO.
```

## Fix Prompt (After Evaluation)

Feed evaluator findings back to the generator. Be surgical — don't re-implement
working code.

```
Fix these issues found during evaluation:
<paste evaluator's prioritized fix list>

Do NOT re-implement working code. Only fix the identified issues.
Run build/check after each fix.
```

## Code Review Prompt

```
Review the changes on this branch for:
1. Correctness — does the logic handle edge cases?
2. Security — any injection, overflow, or unsafe patterns?
3. Architecture — does this follow existing patterns in the codebase?
4. Missing tests — what scenarios lack coverage?

Output a structured review with severity ratings (critical/warning/info)
and specific file:line references.
```

## Requirements Analysis Prompt

```
Analyze this feature request and produce:
1. A breakdown of required changes (which modules)
2. Dependencies between changes (ordering constraints)
3. Risk assessment (what could break, blast radius)
4. Estimated complexity per component (small/medium/large)

Feature: <description>
```

## Pre-Merge Review Prompt

```
This PR is about to merge. Final review checklist:
1. Are all public items documented?
2. Do commit messages follow conventional commits?
3. Are there any TODO/FIXME/HACK comments that should be tracked as issues?
4. Does any agent config (AGENT.md, CLAUDE.md) need updating?
```
