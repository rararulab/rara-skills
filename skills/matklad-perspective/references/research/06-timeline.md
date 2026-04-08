# matklad 人物时间线

调研时间：2026-04-08
来源：GitHub profile (matklad), matklad.github.io 博客发布时间戳

---

## 职业轨迹（推断 + 已确认）

| 时期 | 事件 | 来源可信度 |
|------|------|-----------|
| 早期 | 俄罗斯出身，算法训练背景 | 推断（基于 "when I started doing algorithms many years ago" 及 lambda-llama/NixOS 旧组织） |
| ~2015-2020 | JetBrains 时期，intellij-rust 插件主要开发者 | 确认（intellij-rust 组织成员） |
| ~2018-2022 | rust-analyzer 项目启动与主导开发，salsa-rs 贡献 | 确认（salsa-rs 组织 + 公认事实） |
| ~2022- | 加入 TigerBeetle，逐渐从 Rust 转向 Zig | 确认（@tigerbeetle, Lisbon, 大量 Zig 文章） |
| 2026 现在 | Lisbon，TigerBeetle，Zig 生态高产博主 | 确认 |

---

## 2025-2026 最新博客活动时间轴（博客首页直接抓取）

活跃度：2026 Q1 已发 11 篇，2025 年底连续更新。属于技术博主中的头部高产者。

**2026 已发文**：
- Mar 19 — Consensus Board Game
- Mar 5 — JJ LSP Follow Up
- **Feb 25 — Against Query Based Compilers** ⭐（自我推翻）
- Feb 21 — Wrapping Code Comments
- Feb 16 — Diagnostics Factory
- Feb 14 — Justifying text-wrap: pretty
- **Feb 11 — Programming Aphorisms** ⭐（元认知）
- Feb 6 — CI In a Box
- Jan 27 — make.ts
- Jan 23 — Considering Strictly Monotonic Time
- Jan 20 — Vibecoding #2

**2025 Q4**：
- Dec 30 — Memory Safety Is ...
- Dec 29 — The Second Great Error Model Convergence
- Dec 28 — Parsing Advances
- Dec 23 — Newtype Index Pattern In Zig
- Dec 23 — Static Allocation For Compilers
- Dec 9 — Do Not Optimize Away
- Dec 6 — Mechanical Habits
- Nov 28 — Size Matters
- Nov 22 — TigerBeetle Blog
- Nov 10 — Readonly Characters Are a Big Deal
- Nov 9 — Error ABI
- Nov 6 — Error Codes for Control Flow
- Nov 4 — On Async Mutexes

**2025 Q3**：
- Sep 4 — Look Out For Bugs
- Aug 31 — Vibe Coding Terminal Editor
- Aug 30 — Ads Are a Positional Good
- Aug 23 — Retry Loop Retry
- Aug 16 — Reserve First
- Aug 9 — Zig's Lovely Syntax
- Aug 8 — Partially Matching Zig Enums

---

## 思想转折点（从博客主题变化推断）

1. **IDE/Language server 时代** (~2020-2022)：ARCHITECTURE.md, How to Test, builder-lite 等关注工程实践、编译器前端
2. **转向 Zig/系统编程** (~2023-)：大量 Zig 文章、TigerBeetle 系列、静态内存分配、Error ABI
3. **对 Rust 的反思** (2025-2026)：Memory Safety Is...、Against Query Based Compilers 等对 Rust 生态曾经信仰的挑战
4. **AI 编程态度** (2025-2026)：Vibecoding 系列，看起来在探索 LLM 辅助编程

---

## 关键里程碑对思维的影响（推断）

- **rust-analyzer 的构建**：让他成为 IDE/编译器前端专家，也让他深度使用了 salsa 的 query-based 架构——这是他后来能有资格"反对 query based compilers"的前提
- **转 Zig/TigerBeetle**：让他从「零成本抽象」世界进入「静态内存、确定性测试」世界，产生大量对 Rust 范式的反思
- **高频博客习惯**：他的许多想法通过博客迭代修正（"Unit and Integration Tests" 是对 "How to Test" 的补充；"Against Query Based Compilers" 是对自己 rust-analyzer 时代的反思）

---

## 未覆盖维度（诚实标注）

本次调研未能获取的：
- 本人家庭/教育背景的细节（只有"俄罗斯出身"的推断）
- 播客/视频访谈的原话（可以在社区搜但本次因工具通道受限未做）
- 他个人 Twitter/X 账号的活跃情况
- 与 dtolnay/Niko Matsakis 等同行的互动原话
- Zig 社区对他的评价的具体文本
