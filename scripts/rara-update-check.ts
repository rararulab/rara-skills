#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const RARA_DIR = join(homedir(), ".rara");
const CACHE_FILE = join(RARA_DIR, "last-update-check");
const RELEASES_API =
  "https://api.github.com/repos/rararulab/rara-skills/releases/latest";

// Cache TTLs in milliseconds
const TTL_UP_TO_DATE = 60 * 60 * 1000; // 60 minutes
const TTL_UPGRADE_AVAILABLE = 12 * 60 * 60 * 1000; // 12 hours

interface CacheEntry {
  status: "UP_TO_DATE" | "UPGRADE_AVAILABLE";
  local: string;
  remote: string;
  checked_at: number;
}

function getPluginRoot(): string {
  return process.env.CLAUDE_PLUGIN_ROOT || resolve(import.meta.dir, "..");
}

function readLocalVersion(): string {
  const pluginJson = join(getPluginRoot(), ".claude-plugin", "plugin.json");
  if (!existsSync(pluginJson)) return "unknown";
  try {
    const data = JSON.parse(readFileSync(pluginJson, "utf-8"));
    return data.version || "unknown";
  } catch {
    return "unknown";
  }
}

function readCache(): CacheEntry | null {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry): void {
  if (!existsSync(RARA_DIR)) {
    mkdirSync(RARA_DIR, { recursive: true });
  }
  writeFileSync(CACHE_FILE, JSON.stringify(entry));
}

function isCacheValid(cache: CacheEntry): boolean {
  const age = Date.now() - cache.checked_at;
  const ttl =
    cache.status === "UP_TO_DATE" ? TTL_UP_TO_DATE : TTL_UPGRADE_AVAILABLE;
  return age < ttl;
}

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(RELEASES_API, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = (await response.json()) as { tag_name?: string };
    const tag = data.tag_name;
    if (!tag) return null;
    return tag.replace(/^v/, "");
  } catch {
    return null;
  }
}

function compareSemver(local: string, remote: string): number {
  const parse = (v: string) => v.split(".").map(Number);
  const [a, b] = [parse(local), parse(remote)];
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return -1;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return 1;
  }
  return 0;
}

async function main() {
  const force = process.argv.includes("--force");
  const local = readLocalVersion();

  if (local === "unknown") return;

  // Check cache unless --force
  if (!force) {
    const cache = readCache();
    if (cache && isCacheValid(cache)) {
      if (cache.status === "UPGRADE_AVAILABLE") {
        console.log(
          `⬆ rara-skills v${cache.remote} 可用（当前 v${cache.local}），运行 /rara-upgrade 升级`
        );
      }
      return;
    }
  }

  const remote = await fetchRemoteVersion();
  if (!remote) return; // network error, fail silently

  const cmp = compareSemver(local, remote);
  const status: CacheEntry["status"] =
    cmp < 0 ? "UPGRADE_AVAILABLE" : "UP_TO_DATE";

  writeCache({ status, local, remote, checked_at: Date.now() });

  if (status === "UPGRADE_AVAILABLE") {
    console.log(
      `⬆ rara-skills v${remote} 可用（当前 v${local}），运行 /rara-upgrade 升级`
    );
  }
}

main();
