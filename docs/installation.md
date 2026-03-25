# Installation Guide

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- GitHub access to `rararulab/rara-skills`

## Installation Methods

### Method 1: CLI (Recommended)

```bash
# Step 1: Register the marketplace
/plugin marketplace add rararulab/rara-skills

# Step 2: Install the plugin
/plugin install dev-skills@rara-skills
```

### Method 2: Manual Configuration

Add to `.claude/settings.json` (project-level) or `~/.claude/settings.json` (user-level):

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

### Method 3: For rara project specifically

The rara repo ships with `.claude/settings.json` pre-configured. Just clone and start Claude Code — skills are available immediately.

## Verifying Installation

After installing, start a new Claude Code session and check that the skills appear in the available skills list. You can invoke them with:

- `/dev-workflow` — triggers the development pipeline
- `/requirement-to-issues` — converts requirements to issues

## Updating

### Automatic Updates

Claude Code pulls the latest skill definitions from the GitHub repo at the start of each session. No manual intervention needed.

### Manual Update

```bash
/plugin update dev-skills@rara-skills
```

### Pinning a Version

If you need to pin to a specific commit (e.g., for reproducibility), you can specify a ref:

```json
{
  "extraKnownMarketplaces": {
    "rara-skills": {
      "source": {
        "source": "github",
        "repo": "rararulab/rara-skills",
        "ref": "abc1234"
      }
    }
  }
}
```

## Uninstalling

### Via CLI
```bash
/plugin uninstall dev-skills@rara-skills
```

### Via settings.json
Remove or set to `false`:
```json
{
  "enabledPlugins": {
    "dev-skills@rara-skills": false
  }
}
```

## Troubleshooting

**Skills not appearing after install:**
- Start a new Claude Code session (skills load at session start)
- Check that `settings.json` is valid JSON
- Verify GitHub access: `gh repo view rararulab/rara-skills`

**Permission errors:**
- Ensure your GitHub token has read access to the repo
- For private repos, Claude Code uses your `gh` CLI authentication

**Stale skills after upstream update:**
- Force refresh: `/plugin update dev-skills@rara-skills`
- Or restart Claude Code session
