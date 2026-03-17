# Rara Skills

Skills for [Rara](https://github.com/rararulab/rara) — a self-evolving, developer-first personal proactive agent. Skills are folders of instructions and resources that Rara loads dynamically to improve performance on specialized tasks.

## Install

### As Claude Code Plugin Marketplace

```bash
/plugin marketplace add rararulab/rara-skills
```

Then install skills via:

```bash
/plugin install dev-skills@rara-skills
```

### As Rara Skill

```bash
# Via rara's built-in skill installer
rara skill install rararulab/rara-skills
```

## Skills

| Skill | Description |
|-------|-------------|
| [dev-workflow](./skills/dev-workflow) | Orchestrates development via acpx — delegates code to Claude, reviews to Codex |

## Creating a Skill

Use the [template](./template/SKILL.md) as a starting point:

```markdown
---
name: my-skill-name
description: What this skill does and when to use it.
---

# Instructions here
```

See [Agent Skills spec](https://agentskills.io) for the full standard.

## License

MIT
