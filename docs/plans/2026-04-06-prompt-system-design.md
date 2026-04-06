# Prompt System Design

A standardized prompt authoring framework for rara-skills, extending the Polanyi-based prompt-refinery into a seven-layer model with diagnosis, testing, and execution tooling.

## Problem

Analysis of existing skills reveals systemic issues:

- **Rules:Anchors ratio averages 14.6:1** (healthy: 2-3:1)
- Most skills lack a philosophy layer (L1) or effective anti-sycophancy (L5)
- No shared standard for interaction design, token budgeting, or prompt testing
- Skill authors reinvent prompt structure each time with inconsistent quality

## Audience

| Audience | Coverage | Deliverable |
|----------|----------|-------------|
| Skill authors | Full seven-layer framework, frontmatter spec, hooks integration | `skills/prompt-system/SKILL.md` + `docs/prompt-system.md` |
| End users | L1-L5 + lightweight L7, for CLAUDE.md and system prompts | Same deliverables, simplified sections marked |

## Seven-Layer Model

Built on prompt-refinery's five Polanyi layers, extended with two new layers for interaction and budget management.

### L1 Philosophy (Release — highest focal point)

One or two sentences setting aesthetic and intellectual direction via a named concept anchor.

**Rules:**
- Must name a traceable thought source (person, paper, movement)
- Explain "why this way" not "what to do"
- Budget: ≤ 50 tokens

**Good:**
```
This is a "Specification by Example" skill (Gojko Adzic).
Living documentation over test-after-verification.
```

**Bad:**
```
This skill helps you write good BDD scenarios.
Follow best practices and be thorough.
```

**End user version:** Open CLAUDE.md with one sentence describing your project's style, referencing a project or person you admire.

### L2 Style Anchors (Release — mid focal point)

Two to three concept anchors that triangulate the desired style. Each anchor must specify *what aspect* to take from that source.

**Rules:**
- Anchors should complement each other's blind spots
- For niche domains, project anchors work (e.g., `ripgrep's CLI design`)
- Single anchors cause over-imitation; three define a unique region

**Template:**
```
Style anchors:
- [Person/Project A] (aspect: X)
- [Person/Project B] (aspect: Y)
- [Person/Project C] (aspect: Z)
```

**End user version:** Optional. Include if you have clear style preferences.

### L3 External Reality (Accountability layer)

An authority source that is not the user. Structural cure for sycophancy.

**Skill authors must answer:** What external artifact should the model verify its output against?

| Domain | Recommended external reality |
|--------|------------------------------|
| Code | Test suite, type system, linter output |
| Design | ADR directory, design spec docs |
| Process | CI pipeline status, git history |
| Writing | Style guide, published examples |

**Anti-pattern conversions:**
```
❌ "Be objective"        → ✅ "Evaluate against [spec doc]"
❌ "Give honest feedback" → ✅ "Apply the standards from [reference]"
❌ "Be accurate"         → ✅ "Cross-check against [data source]"
```

**End user version:** Point CLAUDE.md to key doc paths (`docs/adr/`, `tests/`).

### L4 Constraints (Zero-ambiguity configuration)

Mechanical, zero-ambiguity items only. If a tool can enforce it, delete the prompt line.

**Allowed:**
- Output format (JSON schema, Markdown structure)
- File path conventions
- Tool versions / environment constraints
- Frontmatter field definitions

**Must remove:**
- Code formatting → `cargo fmt` / `prettier`
- Lint rules → `eslint` / `clippy`
- Type constraints → the type system itself
- Naming conventions → linter config

**Skill author frontmatter spec:**
```yaml
---
name: kebab-case, matching directory name
description: >
  One sentence. Must include trigger keywords.
  First 20 characters explain "what it does".
---
```

**End user version:** Only write constraints Claude cannot infer from project files. Don't repeat what `tsconfig.json` or `.eslintrc` already says.

### L5 Anti-sycophancy (Permission-based disagreement)

Not a prohibition list ("Do NOT X"), but explicit permission and protocol for the model to disagree.

**Three elements:**
1. **Authorization** — grant permission to disagree
2. **Anchor** — what to check against (L3 reference)
3. **Format** — how to express disagreement

**Template:**
```markdown
## Disagreement Protocol

When [external reality] contradicts user instructions:
1. State the conflict: "[source] says X, but you asked for Y"
2. Recommend: "I suggest Z because [reason]"
3. Proceed only after user confirms
```

**End user version:**
```
If my approach conflicts with the project's ADR decisions or test expectations,
say so directly before proceeding.
```

### L6 Interaction Design (New — multi-turn, few-shot, rhythm)

#### 6a. Conversation State Machine

Define phases and transitions, not linear step lists:

```
[Gather] → [Analyze] → [Propose] → [Validate] → [Deliver]
    ↑          ↓                         ↓
    └── need more info ──┘      ← rejected ──┘
```

**Rules:**
- Maximum 5 states
- Define entry/exit conditions for each state
- Allow rollback — model must know where to retreat when user says "no"

#### 6b. Few-shot Strategy

**When to use:**
- Uncommon output formats (custom DSL, special Markdown)
- Quality calibration ("what does a good X look like")
- Boundary cases hard to describe with rules

**When NOT to use:**
- Standard formats (JSON, YAML) — model already knows
- Simple classification — constraints suffice
- Tight token budget — few-shot is expensive

**Design principles:**
- Maximum 3 examples (1 good + 1 bad + 1 edge case is optimal)
- Annotations matter more than the example itself — explain *why*
- Use labeled format: `### Good: [why]`, `### Bad: [why]`, `### Edge case: [what]`

#### 6c. User Interaction Rhythm

- One question per message
- Prefer multiple choice when options are clear
- Long output in 200-300 word sections, confirm after each
- Declare which decisions need user confirmation vs model autonomy

### L7 Budget & Loading (New — token management)

Skill-author layer. End users get a simplified version.

#### Budget Allocation

| Layer | Budget % | Token estimate |
|-------|----------|---------------|
| L1 Philosophy | 5% | 30-50 |
| L2 Anchors | 10% | 60-100 |
| L3 External Reality | 10% | 60-100 |
| L4 Constraints | 15% | 90-150 |
| L5 Anti-sycophancy | 5% | 30-50 |
| L6 Interaction | 25% | 150-250 |
| Examples/Few-shot | 30% | 180-300 |

Target total: **600-1000 tokens**. SKILL.md exceeding 1500 tokens needs review.

#### Loading Strategy

```
Core (always loaded): L1 + L2 + L5 + state machine definition
On-demand (lazy): L3 document content, L6 few-shot examples
Never in prompt (externalized): linter rules, format configs, full API references
```

**Rules:**
- SKILL.md contains Core content only
- Large examples or reference material loaded via `Read` tool on demand
- SKILL.md exceeding 200 lines must be split

**End user version:** Keep CLAUDE.md under 100 lines. Put detailed specs in `docs/` and reference by path.

## Diagnosis & Testing

Cross-cutting concern spanning all layers, in three phases.

### Phase 1: Pre-write Diagnosis (Input)

Classify every line of an existing prompt:

| Category | What it is |
|----------|-----------|
| Constraint | Zero-ambiguity config |
| Rule | Explicit behavioral instruction |
| Anchor | Concept that activates knowledge |
| Reality | External accountability artifact |
| Filler | Generic advice adding no signal |
| Anti-pattern | Self-defeating instruction |

**Scorecard:**

| Metric | Healthy | Warning | Danger |
|--------|---------|---------|--------|
| Rules:Anchors | < 3:1 | 3-8:1 | > 8:1 |
| Filler % | < 2% | 2-5% | > 5% |
| Layer coverage | 5+/7 | 3-4/7 | < 3/7 |
| Token total | < 1000 | 1000-1500 | > 1500 |
| Few-shot annotated | 100% | Partial | None |

### Phase 2: Post-write Depth Test (Output Verification)

Five-question self-check:

1. **Can I fully predict the output?** → Yes: over-constrained, loosen rules
2. **Can I judge whether output is good?** → Yes: correct balance ✅
3. **Can I judge at all?** → No: under-constrained, add boundaries
4. **Would a different user get different quality?** → Yes: L3 too weak, model pleasing user not standard
5. **Does removing any layer degrade quality?** → No: that layer is redundant, delete it

### Phase 3: A/B Comparison (Continuous Improvement)

Keep original and optimized prompts. Run same task with both:
- Compare output quality (human judgment)
- Compare token consumption
- Record which layer changes produced the biggest difference

## Execution Engine

The `prompt-system` skill operates in three modes:

| Mode | Trigger | Purpose |
|------|---------|---------|
| Diagnose | `/prompt-system diagnose` | Analyze existing prompt, produce report |
| Optimize | `/prompt-system optimize` | Diagnose + seven-layer rewrite |
| Generate | `/prompt-system generate` | Build from scratch, interactive |

### State Machine

```
[Input] → [Mode Select] → [Diagnose] → [Rewrite/Generate] → [Depth Test] → [Deliver]
                                ↑                                  ↓
                                └──── test failed, iterate ────────┘
```

### Generate Mode Interview

```
Q1: What domain? (code / writing / analysis / design / workflow)
Q2: Whose work do you admire? (→ L2 anchors)
Q3: External standards to check against? (→ L3 reality)
Q4: Hard mechanical constraints? (→ L4)
Q5: Who is this prompt for? (→ skill vs CLAUDE.md, determines layer depth)
```
