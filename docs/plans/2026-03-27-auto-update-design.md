# Auto-Update Mechanism Design

Date: 2026-03-27

## Goal

让 rara-skills 插件在每次 Claude Code 会话启动时检查新版本，静默提示用户，
并提供 `/rara-upgrade` 手动升级命令。支持 git 安装和 marketplace 安装两种方式。

## Architecture

```
SessionStart hook
  → bun bin/rara-update-check.ts
    → read local VERSION
    → check cache (~/.rara/last-update-check)
    → if stale: curl GitHub raw VERSION
    → compare semver
    → output hint or nothing
```

## New Files

```
VERSION                        # semver string, e.g. "1.1.0"
CHANGELOG.md                   # release notes
bin/rara-update-check.ts       # version check script (bun)
hooks/hooks.json               # SessionStart hook registration
skills/rara-upgrade/SKILL.md   # manual upgrade skill
```

## Runtime State

`~/.rara/` directory (created on first run):

| File | Content | TTL |
|------|---------|-----|
| `last-update-check` | JSON: `{status, local, remote, checked_at}` | UP_TO_DATE: 60min, UPGRADE_AVAILABLE: 12h |

## Version Check Script (`bin/rara-update-check.ts`)

Run via `bun`. Logic:

1. Read `VERSION` from `${CLAUDE_PLUGIN_ROOT}/VERSION`
2. Read cache from `~/.rara/last-update-check`
3. If cache valid → use cached result
4. Else → fetch `https://raw.githubusercontent.com/rararulab/rara-skills/main/VERSION`
5. Compare semver
6. Write cache
7. If upgrade available → stdout: `⬆ rara-skills v{remote} 可用（当前 v{local}），运行 /rara-upgrade 升级`
8. Else → stdout: nothing (or empty)

Supports `--force` flag to bypass cache.

## Hook Registration (`hooks/hooks.json`)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/bin/rara-update-check.ts\" 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

## Upgrade Skill (`/rara-upgrade`)

Trigger: user runs `/rara-upgrade` or asks to update rara-skills.

Steps:
1. Detect install type (git vs vendored/marketplace)
2. Save old version
3. For git: `git fetch && git reset --hard origin/main`
4. For vendored: clone to temp dir, replace install dir
5. Show CHANGELOG diff between old and new version
6. Clear cache
7. Suggest restart Claude Code

## Decisions

- **Bun ecosystem**: version check script in TypeScript, run via `bun`
- **Silent prompt**: no AskUserQuestion, just one-line hint
- **Cache TTL**: 60min (up-to-date), 12h (upgrade available)
- **No auto_upgrade in v1**: keep it simple, manual only
