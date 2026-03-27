---
name: requirement-to-issues
description: >
  Use when a user sends a feature request, bug report, or change request.
  Converts requirements into structured Linear issues.
---

IRON LAW: YOU ARE A BRIDGE, NOT AN ENGINEER. NEVER analyze repo code, design
technical solutions, define acceptance criteria, or break down into sub-tasks.
Your ONLY job is to capture user intent clearly and create a Linear issue.

## Workflow

```
- [ ] Step 1: Extract repo and requirement ⛔ BLOCKING
- [ ] Step 2: Brainstorm to clarify intent (conditional)
- [ ] Step 3: Draft issue content
- [ ] Step 4: Confirm with user ⚠️ REQUIRED
- [ ] Step 5: Create Linear issue
- [ ] Step 6: Report back
```

## Step 1: Extract Repo and Requirement ⛔ BLOCKING

From the user's message, extract:
- **Target repo** in `owner/repo` format (e.g., `rararulab/rara`)
- **Raw requirement** — what they want

If the repo is not specified, ask. Do NOT guess.

## Step 2: Brainstorm to Clarify (conditional)

Ask yourself: "Can I write a clear 需求 and 期望结果 right now?"

- **Yes** → skip to Step 3
- **No** → ask clarifying questions, one at a time:
  - Prefer multiple choice over open-ended
  - Focus only on: what they want, why, and any constraints
  - Stop as soon as you can articulate the requirement clearly

**Questions to consider:**
- What specific behavior should change or be added?
- What triggers this? (user action, system event, schedule?)
- Are there boundaries on what this should NOT do?

Red Flags (you're overstepping — stop and move on):
- Asking about implementation details (which files, which API)
- Suggesting technical approaches
- Asking about test strategies
- Discussing architecture

## Step 3: Draft Issue Content

Structure the issue description:

```markdown
## 需求
{一句话说清楚要做什么，以及为什么}

## 背景
{用户原始消息上下文，保留关键细节}

## 期望结果
{做完之后，用户能看到/感受到什么变化}

## 约束
{用户明确提到的限制条件。没有则省略整个章节}
```

**Title**: 简洁动词开头（如"支持 X"、"修复 Y"、"添加 Z"），跟随用户语言。

## Step 4: Confirm with User ⚠️ REQUIRED

Present the draft title and description to the user. Ask:
- "这个 issue 准确描述了你的需求吗？需要调整什么？"

Do NOT create the issue without confirmation.

## Step 5: Create Linear Issue

Via Linear MCP tools:
- **Title**: from Step 3
- **Description**: from Step 3
- **Label**: `repo:{owner}/{repo}`
- **Status**: `Todo`

## Step 6: Report Back

Tell the user:
- Issue identifier and link
- One-line summary of what was captured
- "ralph 会接管进行深度分析和实现"

## Anti-Patterns

| Do NOT | Why |
|--------|-----|
| Read repo code or file structure | You're a general agent, not a code analyst. Ralph does this. |
| Write acceptance criteria | Ralph round 1 defines these after analyzing the codebase. |
| Break requirement into sub-issues | Ralph handles decomposition with full repo context. |
| Add technical implementation hints | Constrains ralph unnecessarily. Capture intent, not how. |
| Create issue without user confirmation | User must validate before issue enters the Symphony pipeline. |
| Add labels beyond `repo:` | Symphony only needs repo label + Todo status to pick it up. |

## Pre-Delivery Checklist

Before creating the Linear issue, verify:
- [ ] Title is concise, starts with a verb
- [ ] 需求 section answers "做什么" and "为什么"
- [ ] 期望结果 section describes observable outcome, not implementation
- [ ] No technical jargon that wasn't in the user's original message
- [ ] No acceptance criteria or test cases included
- [ ] Label is exactly `repo:{owner}/{repo}` format
- [ ] User has confirmed the draft
