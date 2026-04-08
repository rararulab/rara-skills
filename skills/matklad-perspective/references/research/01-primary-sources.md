# matklad 一手资料汇编

调研时间：2026-04-08
调研方式：直接抓取 matklad.github.io 博客核心文章 + GitHub profile。
来源可信度：一手（matklad 本人撰写）。

---

## 人物基本信息（来自 github.com/matklad）

- **姓名**：Alex Kladov
- **用户名**：matklad
- **自我标签（GitHub bio）**：*"Computers, democracy, and nervous disorder."*
- **当前所在**：Lisbon
- **当前雇主**：@tigerbeetle
- **Followers**：6.8k
- **所属/历史组织**：NixOS, lambda-llama, intellij-rust, salsa-rs, async-rs, tigerbeetle
- **博客**：https://matklad.github.io/

轨迹解读：从 `intellij-rust` → `salsa-rs`（rust-analyzer 的增量计算基础）→ `tigerbeetle`。完整串起他从 IntelliJ Rust 插件 → rust-analyzer → TigerBeetle/Zig 的职业线。

---

## 核心文章提炼（一手）

### 1. Against Query Based Compilers (2026-02-25)
**URL**: https://matklad.github.io/2026/02/25/against-query-based-compilers.html

**核心论点**：Query-based 编译器（基于 salsa、build systems à la carte 那套增量计算框架）不是银弹。作者本人就是这个思路的主要推动者之一（rust-analyzer 建立在 salsa 上），现在自己在反对自己的发明。

**关键引文**：
> "The beauty of the scheme is its silvery-bullety hue — it can be applied without thinking to any computation."

> "A little more thinking, and you can derive 'early cutoff' optimization..."

> "Big-O thinking is useful here: the time to react to the change should be proportional to the size of the change, and not the overall size of the codebase."

> "The update work can't be smaller than the change in the result."

**思维指纹**：
- **银弹识别器**："silvery-bullety hue"、"can be applied without thinking" → 这种描述对他而言就是警告信号
- **Big-O 思维应用于架构判断**：不是算法题，是用渐近复杂度论证「这个办法根本不可能做到」
- **自我推翻**：愿意公开反对自己曾经主推的方案

---

### 2. Programming Aphorisms (2026-02-11)
**URL**: https://matklad.github.io/2026/02/11/programming-aphorisms.html

**核心论点**：编程知识很大一部分就是「把新问题还原为一组已命名的技巧词汇」。naming 就是 thinking。

**关键引文**：
> "A significant fraction of [programming knowledge] is just reducing new problems to a vocabulary of known tricks."

> "This is a personal, descriptive post, not a prescriptive post for you."

> "First, I 'raised the abstraction level' by giving it a name and a type... This is a rare transformation which I learned and named myself. Naming is important for my thinking and communicating process. 'Let's raise abstraction level' is a staple code review comment of mine."

> "Second, I avoided 'midlayer mistake' by making sure that every aspect of options is user-configurable."

> "Third, I provided a 'shortcut', the from_environment convenience function that cuts across abstraction layers."

**思维指纹**：
- **命名即思考**：给套路取名是他最核心的认知工具
- **可分解的直觉**：声称自己的"immediate"直觉实际上可以被拆解成多个具名 factoid
- **信用归属**：每个技巧都标明从哪学来的（Josh Triplett、Django Views）
- **描述 vs 规范**：明确区分「我自己这么做」和「你应该这么做」

---

### 3. ARCHITECTURE.md (2021-02-06)
**URL**: https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html

**核心论点**：开源项目 10k-200k LoC 应该写一个 ARCHITECTURE 文件。这是 low-effort high-leverage 的典型。

**关键引文**：
> "It takes 2x more time to write a patch if you are unfamiliar with the project, but it takes 10x more time to figure out where you should change the code."

> "One's mental map is the source of truth."

> "Only specify things that are unlikely to frequently change. Don't try to keep it synchronized with code. Instead, revisit it a couple of times a year."

> "A codemap is a map of a country, not an atlas of maps of its states."

> "Do name important files, modules, and types. Do not directly link them (links go stale). Instead, encourage the reader to use symbol search."

**思维指纹**：
- **物理架构 > 概念架构**：关心「东西在哪」胜过「东西是什么」
- **10x 杠杆识别**：找找哪里存在 10 倍差距
- **反对过度同步**：文档和代码不必一致，自然去耦
- **抗腐烂设计**：只写不会变的东西

---

### 4. Your Language Sucks, It Doesn't Matter (2020-09-13)
**URL**: https://matklad.github.io/2020/09/13/your-language-sucks.html

**核心论点**：语言流行度不由语法/语义决定，而由 runtime 特性（内存模型、生态独占）决定。

**关键引文**：
> "The central thesis is that the actual programming language (syntax, semantics, paradigm) doesn't really matter. What matters is characteristics of the runtime — roughly, what does memory of the running process look like?"

> "As soon as you have a language which is Turing-complete, and has some capabilities for building abstractions, people will just get the things done with it."

> "Languages generally become popular when they bring innovative runtime, or when they have runtime exclusivity. The quality of the language itself is secondary."

> "Obviously, this is all wild speculation and a just-so story without any kind of data backed research."

**思维指纹**：
- **反直觉的宏观观点**：「语言不重要」出自语言工具链作者之口
- **明确标注 epistemic status**："pet theory", "wild speculation", "just-so story"
- **抽象的轴**：不从常见维度（FP vs OOP）分析，而找一个被忽视的轴（runtime）

---

### 5. How to Test (2021-05-31)
**URL**: https://matklad.github.io/2021/05/31/how-to-test.html

**备选标题**（他自己列的）：*Unit Tests are a Scam* / *Test Features, Not Code* / *Data Driven Integrated Tests*

**核心论点**：
- 单元测试容易造成 "Test Driven Design Ossification"（测试锁死设计）
- 通过 `check` 辅助函数封装被测 API
- 测试应该测 feature，不应该测具体代码
- 数据驱动的集成测试更好

**关键引文**：
> "Keep in mind that my background is mostly in writing compiler front-ends for IDEs. This is a rather niche area, which is especially amendable to testing. I don't know how to best test modern HTTP applications built around inter-process communication."

**思维指纹**：
- **挑衅性备选标题**：喜欢 "X is a Scam" 这种刺激性框架
- **明确边界**：主动说「这是我的领域，HTTP 我不懂」
- **机械化重构**：提出 `check` 函数这种可复制的小模式
- **反对过度 unit 化**

---

### 6. Builder Lite (2022-05-29)
**URL**: https://matklad.github.io/2022/05/29/builder-lite.html

**核心论点**：命名并介绍 "builder lite" 模式——object 自己当 builder，增量从 `new` 演化。

**关键引文**：
> "The primary benefit of builder-lite is that it is an incremental, zero-cost evolution from the new method. As such, it is especially useful in the context where the code evolves rapidly, in an uncertain direction. That is, when building applications rather than library."

**思维指纹**：
- **给模式起名**：这是他的核心贡献方式
- **上下文依赖**：明确说「apps vs libraries」场景不同
- **最小改动**：推崇可以从现状增量演化的设计

---

### 7. Role Of Algorithms (2023-08-13)
**URL**: https://matklad.github.io/2023/08/13/role-of-algorithms.html

**自述元信息**：*"This is lobste.rs comment as an article, so expect even more abysmal editing than usual."*

**核心论点**：算法训练有用，不是因为工作中要用，而是练习 sub-skill——写 bug-free 的小程序。

**关键引文**：
> "Algorithms are a useful skill not because you use it at work every day, but because they train you to be better at particular aspects of software engineering."

> "Debugging complex code is hard, first simplify, then debug"

> "A lot of my early bugs was due to me duplicating the same piece of information in two places... Single source of truth is good."

> "Meta note: if you already know this, my lessons are useless. If you don't yet know them, they are still useless and most likely will bounce off you. This is tacit knowledge."

> "I noticed a surprising correlation between programming skills in the small, and programming skills in the large."

**思维指纹**：
- **原子化 sub-skill 训练**：用举重/cardio 类比
- **先简化后 debug**：删代码而不是加代码
- **Tacit knowledge 哲学**：知道自己教不会别人，仍然写
- **Small ↔ Large correlation**：5 行代码写得好，大架构也会好

---

## 反复出现的思维模式（跨文章≥3次的真信念）

| 模式 | 出现位置 |
|------|---------|
| 给模式/反模式取名 | Programming Aphorisms, Builder Lite, "midlayer mistake", "shortcut" |
| Epistemic 标注（pet theory, wild speculation, "I don't know X") | Your Language Sucks, How to Test, Role of Algorithms |
| 警惕银弹（"applied without thinking" = 警报） | Against Query Based Compilers |
| 物理/机械优先于概念 | ARCHITECTURE.md, How to Test 的 check 函数 |
| 挑衅性/反直觉命题 | Your Language Sucks, Unit Tests are a Scam, Against Query Based Compilers |
| 自我推翻 | Against Query Based Compilers 是对自己 rust-analyzer 架构的反思 |
| 大量 cross-link 旧文 | 几乎每篇都互引 |
| 自谦式语气 | "abysmal editing", "pretty sloppy", "I am not sure" |

---

## 自创/推广的术语

- **raise the abstraction level**（代码审查高频用语）
- **midlayer mistake**（从 Josh Triplett 学来，但他在传播）
- **shortcut**（跨越抽象层的便利函数）
- **builder lite**
- **ARCHITECTURE.md**（他让这个概念流行起来）
- **Test Driven Design Ossification**
- **check function pattern**
- **resilient parsing**（rust-analyzer 源语境，未在本次抓取中直接出现但是公认的他的贡献）
- **red-green trees**（rust-analyzer 源语境）

---

## 智识谱系痕迹（他引用过的人/来源）

- Simon Peyton Jones（Build Systems à la Carte 论文）
- Josh Triplett（midlayer mistake 概念来源）
- Django Views — The Right Way（学到"shortcut"概念）
- Ziggit / lobste.rs / Hacker News（常用讨论场）
- TigerBeetle 同事（工作语境）
- Andrew Kelley / Zig 社区（他现在的语言选择）
