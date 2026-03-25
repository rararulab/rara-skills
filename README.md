# rara-skills

Skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — packaged as a plugin marketplace for the [rara](https://github.com/rararulab/rara) project and general Rust development workflows.

## Quick Start

### Install via Claude Code CLI

```bash
# Add the marketplace
/plugin marketplace add rararulab/rara-skills

# Install all skills
/plugin install dev-skills@rara-skills
```

### Install via settings.json

Add to your project's `.claude/settings.json` or user-level `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "dev-skills@rara-skills": true
  },
  "extraKnownMarketplaces": {
    "rara-skills": {
      "source": {
        "source": "github",
        "repo": "rararulab/rara-skills"
      }
    }
  }
}
```

## Updating Skills

Skills update automatically when Claude Code starts a new session — it pulls the latest from the GitHub repo. No manual action needed.

To force an update mid-session:

```bash
/plugin update dev-skills@rara-skills
```

## Available Skills

### dev-skills plugin

| Skill | Command | Description |
|-------|---------|-------------|
| [dev-workflow](./skills/dev-workflow/) | `/dev-workflow` | Full development lifecycle: issue → worktree → delegate to claude -p → evaluate → PR → CI. Supports small/medium/large/epic task tiers. |
| [requirement-to-issues](./skills/requirement-to-issues/) | `/requirement-to-issues` | Converts user requirements into structured GitHub issues with proper labels and templates. |

### Standalone skills (not yet bundled)

| Skill | Command | Description |
|-------|---------|-------------|
| [language-learning](./skills/language-learning/) | `/language-learning` | Language learning assistant with spaced repetition and contextual practice. |

## Project vs User Install

| Scope | File | Effect |
|-------|------|--------|
| **Project** | `.claude/settings.json` (in repo root) | All team members using Claude Code in this repo get the skills automatically |
| **User** | `~/.claude/settings.json` | Available in all your projects |

For team projects, commit `.claude/settings.json` to the repo so everyone shares the same skill set.

## Creating Skills

Use the [template](./template/SKILL.md) as a starting point:

```markdown
---
name: my-skill-name
description: What this skill does and when to use it.
---

# Instructions here
```

Place new skills in `skills/<skill-name>/SKILL.md`. To include them in the marketplace, add the path to `.claude-plugin/marketplace.json`.

## License

MIT
