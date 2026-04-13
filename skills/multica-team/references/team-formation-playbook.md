# Team formation playbook

Use this playbook with `team-protocol-v0.1.md` to choose a default team shape quickly and consistently.

The goal is to reduce ad-hoc team formation and make Multica dispatch predictable.

---

## 1. Shape selection table

| Situation | Default shape | Why |
|---|---|---|
| Targeted bug fix in one surface | `single-agent` | One owner keeps context tight and avoids coordination overhead |
| Small feature in one module | `single-agent` | Clear ownership and simple verification |
| Change needs explicit plan before implementation | `staged-team` | `plan -> build -> review` keeps risk visible |
| Work spans frontend and backend with clear API boundary | `parallel-lanes` | Independent lanes can move in parallel safely |
| Work spans implementation and docs / migration / cleanup | `parallel-lanes` | Deliverables are separable and verifiable independently |
| Root cause is unclear with multiple plausible theories | `parallel-lanes` | Competing investigation lanes reduce time to clarity |
| Parallel research should feed one implementation path | `hybrid` | Explore broadly, then converge to one build lane |
| Parallel build work must converge into one review / integration step | `hybrid` | Keeps early speed and late-stage coherence |
| Same-file or same-module heavy edits | `single-agent` or `staged-team` | Avoids file conflicts and merge confusion |
| Large risky feature with architecture uncertainty | `staged-team` or `hybrid` | Planning and convergence need explicit ownership |

---

## 2. Fast decision tree

### Choose `single-agent` when
- one agent can finish the work coherently
- likely edits stay within one surface area
- acceptance criteria are simple
- review is straightforward

### Choose `staged-team` when
- planning should be separated from building
- review should be explicit and durable
- delivery quality matters more than maximum parallelism
- architecture or implementation shape should be agreed before coding

### Choose `parallel-lanes` when
- workstreams are truly separable
- different lanes can own different files or subsystems
- downstream integration can be deferred safely
- each lane can produce an independently verifiable artifact

### Choose `hybrid` when
- early work benefits from parallel exploration
- later work should converge under one owner
- multiple build lanes would eventually collide without a synthesis step

---

## 3. Canonical patterns

### Pattern A: small bug fix
Use: `single-agent`

Structure:
- one issue
- one builder or fixer
- optional review follow-up comment

Checklist:
- one clear bug statement
- one bounded surface
- one artifact

### Pattern B: risky implementation with known target repo
Use: `staged-team`

Structure:
- parent issue
- `plan` lane
- `build` lane
- `review` lane

Checklist:
- plan lane defines root cause and implementation shape
- build lane follows plan
- review lane decides `GO | NO_GO`

### Pattern C: frontend/backend feature
Use: `parallel-lanes`

Structure:
- parent issue
- `frontend` lane
- `backend` lane
- optional `integration` lane

Checklist:
- API contract is explicit
- each lane has `must not modify`
- convergence owner is defined before dispatch

### Pattern D: competing hypotheses debugging
Use: `parallel-lanes`

Structure:
- parent issue
- hypothesis lane A
- hypothesis lane B
- hypothesis lane C
- one convergence note or build lane

Checklist:
- investigation lanes stay read-focused unless authorized
- each lane ends with `supported | not_supported | inconclusive`
- lead chooses the winning path before build dispatch

### Pattern E: parallel investigation then implementation
Use: `hybrid`

Structure:
- parent issue
- research lane A
- research lane B
- converged `build` lane
- `review` lane

Checklist:
- no implementation starts before convergence
- one build owner after research
- review checks integrated result only

### Pattern F: feature plus docs or migration
Use: `parallel-lanes`

Structure:
- parent issue
- implementation lane
- docs lane or migration lane
- optional review lane

Checklist:
- implementation lane owns code changes
- docs / migration lane consumes implementation artifact
- sibling scope is explicit

---

## 4. Anti-patterns

Avoid `parallel-lanes` when:
- two lanes will probably touch the same files
- lane boundaries are still vague
- one lane depends on unfinished internals of another
- there is no clear convergence owner

Avoid `single-agent` when:
- the task bundles planning, implementation, and review risk together
- success cannot be described with a small bounded acceptance set
- one agent would carry too much ambiguity or too many unrelated deliverables

Avoid `staged-team` when:
- the work is tiny and obvious
- the cost of extra stages exceeds the task itself

Avoid `hybrid` when:
- there is no true parallel value early on
- the convergence step is undefined

---

## 5. Team size defaults

Default sizes:
- `single-agent`: 1 worker
- `staged-team`: 2–3 workers over time, usually one active stage owner at a time
- `parallel-lanes`: 2–3 active workers
- `hybrid`: 2–3 early workers, then 1 build owner, then 1 reviewer

Escalate beyond 3 active lanes only when:
- boundaries are explicit
- outputs can be verified independently
- convergence is already designed

---

## 6. Required notes to include in the parent issue

When using this playbook, the parent issue should always include:
- chosen shape
- why that shape fits
- active lanes
- shared constraints
- convergence owner
- closure rule

---

## 7. Operational recommendation

When unsure, choose the smaller shape first.

Preferred fallback order:
- `single-agent`
- `staged-team`
- `hybrid`
- `parallel-lanes`

Use `parallel-lanes` only when independence is real, not just desirable.
