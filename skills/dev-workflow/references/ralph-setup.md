# Ralph Setup

Source: https://github.com/snarktank/ralph

## Prerequisites

- Claude Code CLI installed and authenticated
- `jq` installed (`brew install jq` on macOS)
- A git repository for your project

## Installation Options

### Option A — Copy to project (recommended)

```bash
git clone https://github.com/snarktank/ralph.git /tmp/ralph
mkdir -p scripts/ralph
cp /tmp/ralph/ralph.sh scripts/ralph/
cp /tmp/ralph/CLAUDE.md scripts/ralph/CLAUDE.md
chmod +x scripts/ralph/ralph.sh
rm -rf /tmp/ralph
```

### Option B — Claude Code marketplace plugin

```bash
/plugin marketplace add snarktank/ralph
/plugin install ralph-skills@ralph-marketplace
```

This gives you `/prd` (generate PRDs) and `/ralph` (convert PRDs to prd.json).

### Option C — Install skills globally

```bash
git clone https://github.com/snarktank/ralph.git /tmp/ralph
cp -r /tmp/ralph/skills/prd ~/.claude/skills/
cp -r /tmp/ralph/skills/ralph ~/.claude/skills/
rm -rf /tmp/ralph
```

## Verification

After installation, confirm `scripts/ralph/ralph.sh` exists and is executable,
or that `/prd` and `/ralph` skills are available.
