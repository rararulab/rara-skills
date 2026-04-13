# rara-skills

Skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — packaged as a plugin marketplace for the [rara](https://github.com/rararulab/rara) project and general development workflows.

## Quick Start

### Install via Claude Code CLI

```bash
# Add the marketplace
/plugin marketplace add rararulab/rara-skills

# Install the plugin
/plugin install rara@rara-skills
```

### Install via settings.json

Add to your project's `.claude/settings.json` or user-level `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "rara@rara-skills": true
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

## Updating

### Automatic check

On every Claude Code session start, rara-skills checks for new [GitHub Releases](https://github.com/rararulab/rara-skills/releases). If a newer version exists, you'll see:

```
⬆ rara-skills v1.2.0 可用（当前 v1.1.0），运行 /rara-upgrade 升级
```

### Manual upgrade

```
/rara-upgrade
```

Supports both git-based and marketplace installations. After upgrading, restart Claude Code to load the new version.

## Available Skills

### Development workflow

| Skill | Description |
|-------|-------------|
| [dev-workflow](./skills/dev-workflow/) | Full development lifecycle: issue → worktree → delegate → evaluate → PR → CI |
| [multica-team](./skills/multica-team/) | Rara-led coding orchestration through Multica: issue trees, explicit dispatch contracts, agent assignment, monitoring, verification, and deliberate ship/follow-up decisions |
| [multica-polling](./skills/multica-polling/) | Scheduler-driven tracking for Multica-dispatched issues: persisted context, polling state machine, retry/timeout policy, and script-backed rescheduling |
| [multica-orchestrator](./skills/multica-orchestrator/) | Stage-level Multica autonomy layer: validate plan/build/review artifacts, gate handoffs, reschedule corrections, and escalate when automatic transition is unsafe |
| [requirement-to-issues](./skills/requirement-to-issues/) | Convert user requirements into structured Linear issues |

### BDD (feature-driven development)

| Skill | Description |
|-------|-------------|
| [bdd-design](./skills/bdd-design/) | Design BDD scenarios from requirements, write Gherkin acceptance criteria |
| [bdd-review](./skills/bdd-review/) | Review `.feature` files for quality before issue creation |
| [bdd-implement](./skills/bdd-implement/) | Implement BDD scenarios as executable tests with step definitions |

### Prompt engineering

| Skill | Description |
|-------|-------------|
| [prompt-system](./skills/prompt-system/) | Diagnose, optimize, or generate prompts with the seven-layer Polanyi framework |
| [prompt-refinery](./skills/prompt-refinery/) | Optimize prompts using the Polanyi tacit-knowledge framework (concept anchors + constraint layering) |

### Perspectives (thinking styles)

| Skill | Description |
|-------|-------------|
| [matklad-perspective](./skills/matklad-perspective/) | Alex Kladov (matklad) thinking framework — use for IDE/compiler/language design, architecture decisions, testing methodology |
| [rob-pike-perspective](./skills/rob-pike-perspective/) | Rob Pike thinking framework — use for Unix-style simplicity, Go/concurrency, tool design, interface and system complexity decisions |

### Other

| Skill | Description |
|-------|-------------|
| [language-learning](./skills/language-learning/) | Immersive Japanese learning blended into normal task conversations (no CLI required) |
| [rara-upgrade](./skills/rara-upgrade/) | Upgrade rara-skills to the latest version |

## Project vs User Install

| Scope | File | Effect |
|-------|------|--------|
| **Project** | `.claude/settings.json` (in repo root) | All team members get the skills |
| **User** | `~/.claude/settings.json` | Available in all your projects |

## Creating Skills

Use the [template](./template/SKILL.md) as a starting point. Place new skills in `skills/<skill-name>/SKILL.md`.

## License

MIT
