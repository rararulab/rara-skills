# Prompt Templates for Agent Delegation

## Implementation Prompt

```
Implement <description>.

Context:
- Issue: #{N}
- Branch: issue-{N}-{short-name}
- Scope: <which files/modules are affected>

Requirements:
<clear, specific requirements>

Constraints:
- All commits must use conventional commit format: <type>(<scope>): <desc> (#N)
- Include 'Closes #{N}' in commit body
- Add doc comments to all new public items
- Run build/check before committing
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
