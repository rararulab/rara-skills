---
name: rara-upgrade
description: >
  Use when the user wants to update rara-skills to the latest version.
---

# rara-upgrade

Upgrade rara-skills plugin to the latest version.

## Workflow

```
- [ ] Step 1: Detect install type
- [ ] Step 2: Check remote version
- [ ] Step 3: Perform upgrade
- [ ] Step 4: Show what changed
- [ ] Step 5: Clear cache and finish
```

## Step 1: Detect Install Type

Check the plugin root directory:

```bash
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
```

Determine install type by checking for `.git`:

| Condition | Type | Upgrade Method |
|-----------|------|----------------|
| `$PLUGIN_ROOT/.git` exists | `git` | `git fetch && git reset --hard origin/main` |
| No `.git` | `vendored` | Clone to temp dir, replace install dir |

Report the detected type to the user.

## Step 2: Check Remote Version

```bash
bun "${PLUGIN_ROOT}/scripts/rara-update-check.ts" --force
```

Read `plugin.json` version for current version. If already up to date, tell
the user and stop.

## Step 3: Perform Upgrade

### Git Install

```bash
cd "$PLUGIN_ROOT"
OLD_VERSION=$(cat .claude-plugin/plugin.json | bun -e "console.log(JSON.parse(await Bun.stdin.text()).version)")
git stash 2>/dev/null
git fetch origin
git reset --hard origin/main
```

If `git stash` saved changes, warn the user that local modifications were stashed.

### Vendored Install (marketplace)

```bash
TEMP_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/rararulab/rara-skills.git "$TEMP_DIR/rara-skills"
# Backup current install
mv "$PLUGIN_ROOT" "${PLUGIN_ROOT}.bak"
mv "$TEMP_DIR/rara-skills" "$PLUGIN_ROOT"
rm -rf "${PLUGIN_ROOT}.bak" "$TEMP_DIR"
```

If the clone or move fails, restore from `.bak` and report the error.

## Step 4: Show What Changed

Fetch the GitHub Release notes for the new version:

```bash
gh api repos/rararulab/rara-skills/releases/latest --jq '.body'
```

Summarize as 5-7 bullets grouped by theme. Only show user-facing changes.

## Step 5: Clear Cache and Finish

```bash
rm -f ~/.rara/last-update-check
```

Tell the user:
- Old → new version number
- Suggest restarting Claude Code to pick up changes: "建议重启 Claude Code 以加载新版本"
