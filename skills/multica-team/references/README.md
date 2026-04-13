# multica-team references

Use these reference notes together with `../SKILL.md` when rara is routing coding work through Multica.

## Files

- `issue-templates.md` — templates for parent issues, child issues, follow-up comments, parallel investigation, convergence notes, and controller handoff records
- `operating-rules.md` — decision rules for team formation, decomposition, lane ownership, assignment, monitoring, convergence, and closure
- `team-protocol-v0.1.md` — the concrete team protocol that treats Multica as the runtime substrate and defines how our team should form, coordinate, hand off, gate, and close work
- `team-formation-playbook.md` — default team-shape selection guide that maps common coding situations to `single-agent`, `staged-team`, `parallel-lanes`, or `hybrid`
- `dispatch-examples.md` — concrete parent / child issue examples for common Multica team patterns, including small fixes, staged delivery, parallel frontend/backend work, competing hypotheses, and hybrid convergence

## Intent

These references make the skill more operational without changing its core model:
- issue tree as the source of truth
- parent issue as team board when work spans multiple lanes
- child issue as teammate-owned lane when ownership should be explicit
- assignment as dispatch
- durable artifacts and controller notes as the authoritative coordination medium
- verification before ship
- team protocol on top of Multica, instead of rebuilding multi-agent runtime semantics
- repeatable team formation, instead of ad-hoc shape selection
- reusable dispatch examples, instead of writing every issue tree from scratch
