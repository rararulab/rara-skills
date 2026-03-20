# Language Learning (Immersive Japanese) — Design Document

Date: 2026-03-20

## Problem

语言学习需要大量时间和主动性，大多数人难以坚持。但用户每天已经在跟 agent 大量交互 — 这些交互本身就是天然的语言学习场景。

## Solution

两个组件协作，实现零摩擦的沉浸式日语学习：

1. **kotoba** — Zig CLI + SQLite，管理学习数据和 TTS 音频
2. **language-learning skill** — 告诉 agent 如何在日常对话中融入日语教学

用户不需要主动学习，agent 在日常工作沟通中默默将日语渗透进去。

## Architecture

```
┌──────────────────────────────┐
│  language-learning skill     │  Agent 行为指令
│  (rara-skills repo)          │  如何混入日语、何时纠错、调用 kotoba
├──────────────────────────────┤
│  kotoba (Zig CLI)            │  业务逻辑 + TTS
│  (rararulab/kotoba repo)     │  SRS 算法、进度、音频生成
├──────────────────────────────┤
│  SQLite                      │  数据存储
│  (~/.kotoba/kotoba.db)       │  词汇、语法、复习记录
└──────────────────────────────┘
```

## Skill 行为规则

### 核心原则

- **零摩擦** — 不打断工作流，不需要用户主动操作
- **沉浸式** — 日语融入日常对话，不是独立的学习 session
- **渐进式** — 从关键词替换，到双语并行，到纯日语

### 注音规则

所有日语标注罗马字读音：`はい(hai)`、`成功(seikō)`

已掌握的词汇逐步去掉注音。

### 浸入阶段（JLPT N5→N1）

Agent 根据 `kotoba status` 返回的用户等级，动态调整行为：

| 阶段 | 日语比例 | 行为 |
|------|----------|------|
| N5 初期 | ~10% | 高频词替换，每个词附罗马字 |
| N5 后期 | ~20% | 短句混入，已掌握词不再注音 |
| N4 | ~35% | 整句日语增多，简要解释语法点 |
| N3 | ~55% | 大部分沟通用日语，复杂概念中文补充 |
| N2 | ~80% | 接近纯日语，偶尔中文解释生僻表达 |
| N1 | ~95% | 纯日语交流 |

Sub-level 不硬性划分数量，由 agent 根据用户表现动态判断。

### 纠错方式

温和指出，简短纠正后继续正事：

```
✓ 〜した(shita) 而不是 〜しった
```

### 复习机制（软性 SRS）

- 参考 SM-2 遗忘曲线的大致节奏
- Agent 每次对话时调用 `kotoba review` 获取到期词汇
- 优先在自然语境中复现，不生硬插入
- 用户正确使用 → 增加 interval；用错/不认识 → 缩短 interval

### 音频

Agent 教新词时输出音频路径，用户可选择听发音：

- CLI 环境：`はい(hai) [▶ kotoba play はい]`
- Telegram 等环境：agent 调用 `kotoba play はい` 获取 mp3 路径，发送音频文件

## kotoba CLI 设计

### 命令

```bash
# 学习状态
kotoba status              # 当前等级、已学词汇数、今日待复习

# 词汇管理
kotoba add <word> <reading> <meaning> [--level N5]  # romaji auto-generated from reading
kotoba seen <word> <quality>   # quality: 1, 3, or 5

# 复习
kotoba review              # 返回到期复习的词汇列表（JSON）
kotoba review --grammar    # 返回到期复习的语法列表

# 音频
kotoba play <word>         # 调用 VOICEVOX 生成 mp3，输出文件路径
                           # 已缓存的直接返回路径

# 进度
kotoba progress            # 学习统计（各等级词汇数、掌握率）
kotoba progress --weekly   # 本周学习量

# 导出
kotoba export anki         # 导出为 .apkg（调用 genanki 或直接操作 SQLite+zip）
kotoba export csv          # 导出为 CSV
kotoba export json         # 导出为 JSON
```

### SQLite Schema

```sql
CREATE TABLE vocabulary (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    reading TEXT NOT NULL,      -- kana reading
    romaji TEXT NOT NULL,       -- 罗马字
    meaning TEXT NOT NULL,      -- 中文释义
    level TEXT DEFAULT 'N5',    -- JLPT level
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grammar (
    id INTEGER PRIMARY KEY,
    pattern TEXT NOT NULL UNIQUE,
    meaning TEXT NOT NULL,
    level TEXT DEFAULT 'N5',
    example TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,    -- 'vocabulary' or 'grammar'
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    quality INTEGER NOT NULL,  -- 0-5 (SM-2)
    interval_days REAL NOT NULL,
    ease REAL NOT NULL,
    reps INTEGER NOT NULL
);

CREATE TABLE user_profile (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
    -- keys: current_level, sub_level, native_language, target_language
);
```

### 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 语言 | Rust | 成熟生态（clap/rusqlite/serde/reqwest）、单二进制 |
| 数据库 | SQLite（rusqlite） | 成熟稳定的 Rust binding |
| TTS | VOICEVOX（本地 REST API） | 免费、高质量、动漫风格声音 |
| HTTP | reqwest | 调用 VOICEVOX API |
| JSON | serde + serde_json | 解析 VOICEVOX 响应、输出结构化数据 |
| 音频缓存 | ~/.kotoba/audio/ | 按词缓存 mp3，避免重复生成 |

### 已知风险

1. **VOICEVOX 依赖** — 用户需要单独安装，首次设置有摩擦

## Skill 与 kotoba 的交互流程

```
对话开始:
  agent 调用 `kotoba status`
  → 获取用户当前等级、待复习词汇数

对话中教了新词:
  agent 调用 `kotoba add 成功 せいこう seikō 成功 --level N5`

对话中使用了已学词汇:
  agent 调用 `kotoba seen 成功 4`  (4 = 回忆起来有点费力但正确)

用户请求发音:
  agent 调用 `kotoba play 成功`
  → 获取 mp3 路径，根据环境播放或发送
```

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 目标语言 | 日语（母语中文） | 用户需求 |
| 注音方式 | 罗马字 | 零基础友好，不依赖假名知识 |
| 水平框架 | JLPT N5→N1 | 标准化、可衡量 |
| Sub-level 划分 | Agent 动态判断 | 避免僵化，适应个人节奏 |
| 数据存储 | SQLite via Zig CLI | 可导出、可扩展、与 skill 解耦 |
| 复习算法 | 软性 SM-2 | 参考遗忘曲线但不死板 |
| 音频方案 | VOICEVOX → mp3 文件 | 免费、高质量、CLI 友好 |
| 纠错方式 | 温和指出 | 不打断工作流 |
| 代码仓库 | skill 在 rara-skills，kotoba 独立 repo | 关注点分离 |
