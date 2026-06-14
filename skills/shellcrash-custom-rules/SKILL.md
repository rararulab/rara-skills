---
name: shellcrash-custom-rules
description: >
  Use when the user wants to view, add, or fix Clash/mihomo custom rules or
  proxy-groups on a router running ShellCrash (OpenWrt/小米路由 etc.) — including
  "我的路由器的 clash", "自定义规则不生效", or a previous edit that broke the config.
---

# shellcrash-custom-rules

Safely configure Clash/mihomo **custom rules** and **custom proxy-groups** on a
router managed by **ShellCrash**, without leaving the config broken.

ShellCrash does NOT run the rules you write directly. The subscription is
converted into a base config; your custom files are **merged in at startup** by
`start.sh`. If the merge produces invalid YAML the core **silently falls back to
the base config** and your rules never take effect. This skill avoids that trap.

## Background: how ShellCrash assembles the config

| Path | Role |
|------|------|
| `/data/ShellCrash/` | install dir (`$CRASHDIR`), persistent |
| `$CRASHDIR/yamls/config.yaml` | base config (converted from the subscription) |
| `$CRASHDIR/yamls/rules.yaml` | **your custom rules** — prepended to `rules:` |
| `$CRASHDIR/yamls/proxy-groups.yaml` | **your custom proxy-groups** |
| `$CRASHDIR/yamls/proxies.yaml` | custom nodes |
| `$CRASHDIR/configs/ShellCrash.cfg` | main settings (subscription URL, firewall, dns) |
| `/tmp/ShellCrash/config.yaml` | **the actually-running config** (core uses `-f` this) |
| `/tmp/ShellCrash/ShellCrash.log` | startup + validation log — read this to diagnose |
| `/tmp/ShellCrash/error.yaml` | the failed merged config when validation fails |

The core binary `/tmp/ShellCrash/CrashCore` is re-extracted from
`$CRASHDIR/CrashCore.tar.gz` on every start — it being absent on disk while the
process runs is normal, not a problem.

## ⚠️ The critical gotcha — proxy-groups MUST use flow style

ShellCrash re-indents merged proxy-groups with `sed` (`start.sh` ~line 482). On
some subscriptions `space_proxy` detection fails and the merge **flattens every
`- node` list item to column 0**, producing invalid YAML
(`yaml: line N: did not find expected key`) → silent fallback to base config.

- ❌ **Broken** (block list — gets mangled):
  ```yaml
  - name: Finance-JP
    type: select
    proxies:
      - 🇯🇵 JP | 日本 01
      - 🇯🇵 JP | 日本 02
  ```
- ✅ **Robust** (single-line flow list — no `- ` lines to mangle):
  ```yaml
  - name: Finance-JP
    type: select
    proxies: ["🇯🇵 JP | 日本 01","🇯🇵 JP | 日本 02"]
  ```

`rules.yaml` is unaffected — write it as a normal multi-line list:
```yaml
- DOMAIN-SUFFIX,bybit.com,Finance-JP
- DOMAIN-KEYWORD,longbridge,Finance-JP
```
Custom rules are prepended to the top of `rules:`, so they win over the
subscription's own rules for the same domain.

## Workflow

```
- [ ] Step 1: Connect to the router
- [ ] Step 2: Locate ShellCrash + inspect current custom files & log
- [ ] Step 3: Edit rules.yaml / proxy-groups.yaml (flow style for groups)
- [ ] Step 4: GATE — offline test-load the merged config with the core's -t
- [ ] Step 5: Apply via `start.sh restart` (NOT hotupdate)
- [ ] Step 6: Verify log + running config; rollback on failure
```

## Step 1: Connect to the router

Connection details (host, SSH options, password) are user-specific — ask the
user or recall from memory. The router is usually OpenWrt with **busybox** (no
`od`, no `cat -v`; `base64`, `tar`, `awk`, `sed`, `grep -A` ARE available).

**Reliable non-interactive SSH helper** (busybox pty mangles multi-line stdin;
encode scripts as base64 and decode remotely):

```bash
# expect wrapper that fills the password and runs ONE command string
cat > /tmp/rt.exp <<'EOF'
#!/usr/bin/expect -f
set timeout 90
spawn ssh -oHostKeyAlgorithms=+ssh-rsa -oStrictHostKeyChecking=no \
  -oUserKnownHostsFile=/dev/null root@<HOST> -p 22 [lindex $argv 0]
expect "*assword:" { send "<PASSWORD>\r" }
expect eof
EOF
chmod +x /tmp/rt.exp

# run a whole script remotely without quoting hell:
B64=$(base64 < /tmp/myscript.sh | tr -d '\n')
/tmp/rt.exp "echo $B64 | base64 -d > /tmp/s.sh && sh /tmp/s.sh; rm -f /tmp/s.sh"
```

Always `rm -f /tmp/rt.exp` at the end — it embeds the password.

## Step 2: Locate and inspect

```bash
find / -iname '*clash*' -o -iname 'mihomo' 2>/dev/null | grep -v /proc   # finds /data/ShellCrash
ls $CRASHDIR/yamls/                       # rules.yaml, proxy-groups.yaml, config.yaml
cat /tmp/ShellCrash/ShellCrash.log        # look for "校验失败" / "did not find expected key"
grep -c 'YourGroup' /tmp/ShellCrash/config.yaml   # 0 = your custom config is NOT active
```

If the log shows repeated `自定义配置文件校验失败！将使用基础配置文件启动！`, the
custom merge is producing invalid YAML — almost always the proxy-groups block-list
gotcha above.

## Step 3: Edit the custom files

- Add rules to `$CRASHDIR/yamls/rules.yaml` (multi-line is fine).
- Define/extend groups in `$CRASHDIR/yamls/proxy-groups.yaml` using **flow-style
  `proxies: [...]`**. Node names must match the subscription's names **byte-for-byte**
  (emoji + spaces included). Extract them from the running config rather than
  retyping, e.g.:
  ```bash
  grep -oE '"name":"[^"]*你的关键词[^"]*"' /tmp/ShellCrash/config.yaml \
    | sed 's/^"name":"//; s/"$//' | sed 's/.*/"&"/' | tr '\n' ',' | sed 's/,$//'
  ```
- **Back up first**: `cp proxy-groups.yaml proxy-groups.yaml.bak-fix`.

## Step 4: GATE — offline test-load before any restart

Build the merged config and validate it with the core's `-t` flag. Only proceed
if it prints `test is successful`. This avoids a failed restart entirely.

```bash
mkdir -p /tmp/cctest && tar -zxf $CRASHDIR/CrashCore.tar.gz -C /tmp/cctest
CORE=$(find /tmp/cctest -type f | head -n1); chmod +x "$CORE"
# candidate = base config + your flow-style group + prepended rules (simulate merge),
# then:
"$CORE" -t -d $CRASHDIR -f /tmp/candidate.yaml 2>&1 | tail -4   # want: "test is successful"
```

## Step 5: Apply (full restart, not hotupdate)

Custom merge only runs on a **full restart**. `hotupdate` and the 10-min
`web_save` task do NOT merge custom files.

```bash
$CRASHDIR/start.sh restart      # brief ~5s network blip — warn the user first
```

Never use `start.sh hotupdate` (task 105, marked 不推荐) to apply custom rules.

## Step 6: Verify, and rollback on failure

```bash
tail -5 /tmp/ShellCrash/ShellCrash.log            # want "服务已启动", no "校验失败"
grep -c 'YourGroup' /tmp/ShellCrash/config.yaml   # >0, and rules carry "#自定义规则"
```

If the log shows `校验失败` after restart, restore and restart again:
```bash
cp -f $CRASHDIR/yamls/proxy-groups.yaml.bak-fix $CRASHDIR/yamls/proxy-groups.yaml
$CRASHDIR/start.sh restart
```

Clean up `/tmp/cctest`, candidate files, and `/tmp/rt.exp` (password) when done.

## Notes

- A weekly cron (`update_config`) re-runs the full merge, so a correct flow-style
  setup survives subscription auto-updates.
- `ShellCrash.cfg` may store the SSH/root password in plaintext (`mi_autoSSH_pwd`)
  — flag this to the user as a security risk if relevant.
